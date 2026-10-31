using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace RoomRental.Api;

/// <summary>
/// Builds the property → unit → room catalogue straight from the media folder, so adding or
/// renaming folders on disk is all it takes to update the website.
/// </summary>
public sealed partial class CatalogueService
{
    private static readonly HashSet<string> PhotoExtensions = new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
    private static readonly HashSet<string> VideoExtensions = new(StringComparer.OrdinalIgnoreCase) { ".mov", ".mp4", ".m4v", ".webm" };
    private static readonly TimeSpan CacheLifetime = TimeSpan.FromSeconds(30);
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true, ReadCommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true };

    private readonly MediaOptions _options;
    private readonly ILogger<CatalogueService> _logger;
    private readonly object _gate = new();
    private Snapshot? _snapshot;

    // The root being scanned and the prefix that keeps its media ids distinct; only set inside Build().
    private string _scanRoot = "";
    private string _scanKeyPrefix = "";

    public CatalogueService(IOptions<MediaOptions> options, IWebHostEnvironment env, ILogger<CatalogueService> logger)
    {
        _options = options.Value;
        _logger = logger;
        RootPaths = new[] { _options.RootPath }.Concat(_options.ExtraRootPaths)
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Select(p => Path.GetFullPath(Path.Combine(env.ContentRootPath, p)))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        ListingsPath = Path.GetFullPath(Path.Combine(env.ContentRootPath, _options.ListingsPath));
    }

    public IReadOnlyList<string> RootPaths { get; }
    public string RootPath => RootPaths[0];
    public string ListingsPath { get; }

    public Catalogue GetCatalogue() => GetSnapshot().Catalogue;

    /// <summary>Resolves a media id to its file on disk. Only files found by the scan can be served.</summary>
    public string? GetMediaPath(string id) => GetSnapshot().MediaPaths.GetValueOrDefault(id);

    private Snapshot GetSnapshot()
    {
        lock (_gate)
        {
            if (_snapshot is null || DateTimeOffset.UtcNow - _snapshot.Catalogue.GeneratedAt > CacheLifetime)
            {
                _snapshot = Build();
            }
            return _snapshot;
        }
    }

    private Snapshot Build()
    {
        var listings = LoadListings();
        var mediaPaths = new Dictionary<string, string>(StringComparer.Ordinal);
        var byFolder = new Dictionary<string, Property>(StringComparer.OrdinalIgnoreCase);
        var excluded = new HashSet<string>(_options.ExcludedFolders, StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < RootPaths.Count; i++)
        {
            _scanRoot = RootPaths[i];
            // The first root keeps unprefixed ids so existing thumbnails and links stay the same.
            _scanKeyPrefix = i == 0 ? "" : $"{Path.GetFileName(_scanRoot)}:";
            if (!Directory.Exists(_scanRoot))
            {
                _logger.LogError("Media root {RootPath} does not exist", _scanRoot);
                continue;
            }

            foreach (var propertyDir in SortedDirectories(_scanRoot))
            {
                var folderName = propertyDir.Name;
                if (excluded.Contains(folderName) || folderName.StartsWith('.')) continue;

                listings.Properties.TryGetValue(folderName, out var listing);
                if (listing?.Hidden == true) continue;

                var property = BuildProperty(propertyDir, listing, listings, mediaPaths);
                if (property is null) continue;
                byFolder[folderName] = byFolder.TryGetValue(folderName, out var existing) ? Merge(existing, property, listing) : property;
            }
        }

        var properties = byFolder.Values.OrderBy(p => p.FolderName, NaturalComparer.Instance).ToList();
        _logger.LogInformation("Catalogue built from {Roots} folder(s): {Properties} properties, {Media} media files",
            RootPaths.Count, properties.Count, mediaPaths.Count);
        return new Snapshot(new Catalogue(DateTimeOffset.UtcNow, properties), mediaPaths);
    }

    /// <summary>Combines the same property found in two media folders: matching units and rooms are joined.</summary>
    private static Property Merge(Property a, Property b, PropertyListing? listing)
    {
        var units = a.Units.ToList();
        foreach (var unit in b.Units)
        {
            var index = units.FindIndex(u => u.Id == unit.Id);
            if (index < 0)
            {
                units.Add(unit);
                continue;
            }

            var rooms = units[index].Rooms.ToList();
            foreach (var room in unit.Rooms)
            {
                var r = rooms.FindIndex(x => x.Id == room.Id);
                if (r < 0) rooms.Add(room);
                else rooms[r] = rooms[r] with { Media = rooms[r].Media.Concat(room.Media).ToList() };
            }
            units[index] = units[index] with { SharedMedia = units[index].SharedMedia.Concat(unit.SharedMedia).ToList(), Rooms = SortRooms(rooms) };
        }

        // The unnamed unit (properties without unit folders) stays first, then units in name order.
        units = units.OrderBy(u => u.Name.Length == 0 ? 0 : 1).ThenBy(u => u.Name, NaturalComparer.Instance).ToList();
        return a with { Units = units, PriceFrom = listing?.PriceFrom ?? MinPrice(units), CoverMediaId = a.CoverMediaId ?? b.CoverMediaId };
    }

    private Property? BuildProperty(DirectoryInfo dir, PropertyListing? listing, Listings listings, Dictionary<string, string> mediaPaths)
    {
        var units = new List<Unit>();

        // Folders named like a unit number (A-11-07, 09-03, D3-26-08) are units. Anything else directly
        // under the property (e.g. "Room 1", "Common area") belongs to a single unnamed unit.
        var implicitRooms = new List<Room>();
        var implicitShared = new List<MediaItem>(CollectMedia(dir, mediaPaths));

        foreach (var child in SortedDirectories(dir.FullName))
        {
            if (IsUnitFolder(child.Name))
            {
                var unit = BuildUnit(child, child.Name, listings, mediaPaths);
                if (unit is not null) units.Add(unit);
            }
            else
            {
                AddRoomOrShared(child, null, implicitRooms, implicitShared, listings, mediaPaths);
            }
        }

        if (implicitRooms.Count > 0 || implicitShared.Count > 0)
        {
            units.Insert(0, new Unit(Slug(dir.Name + "-unit"), "", null, implicitShared, SortRooms(implicitRooms)));
        }

        if (units.Count == 0) return null;

        var name = string.IsNullOrWhiteSpace(listing?.DisplayName) ? CleanName(dir.Name) : listing!.DisplayName!;
        var cover = PickCover(units);

        return new Property(
            Slug(dir.Name),
            name,
            dir.Name,
            NullIfBlank(listing?.Area),
            NullIfBlank(listing?.Address),
            NullIfBlank(listing?.Description),
            listing?.Highlights?.Where(h => !string.IsNullOrWhiteSpace(h)).ToList() ?? new List<string>(),
            NullIfBlank(listing?.MapUrl),
            listing?.PriceFrom ?? MinPrice(units),
            cover,
            units);
    }

    private Unit? BuildUnit(DirectoryInfo dir, string rawName, Listings listings, Dictionary<string, string> mediaPaths)
    {
        var rooms = new List<Room>();
        var shared = new List<MediaItem>(CollectMedia(dir, mediaPaths));

        foreach (var child in SortedDirectories(dir.FullName))
        {
            if (IsUnitFolder(child.Name))
            {
                // A nested copy of the unit folder (e.g. "A-09-03A (2 ROOMS)/09-03A") is treated as unit-wide media.
                shared.AddRange(CollectMediaRecursive(child, mediaPaths));
                continue;
            }
            AddRoomOrShared(child, null, rooms, shared, listings, mediaPaths);
        }

        var match = RoomsNoteRegex().Match(rawName);
        var roomsNote = match.Success ? $"{match.Groups[1].Value} rooms" : null;
        var unitName = RoomsNoteRegex().Replace(rawName, "").Trim();

        // A unit with only loose photos and videos is shown as one listing covering the whole unit.
        if (rooms.Count == 0 && shared.Count > 0)
        {
            var key = RelativeKey(dir.FullName);
            listings.Rooms.TryGetValue(key, out var roomListing);
            rooms.Add(new Room(Slug(key), roomsNote is null ? "Rooms in this unit" : $"{roomsNote} available", "Unit tour",
                roomListing?.Price, NullIfBlank(roomListing?.Status), NullIfBlank(roomListing?.Notes), shared.ToList()));
            shared.Clear();
        }

        if (rooms.Count == 0 && shared.Count == 0) return null;
        return new Unit(Slug(RelativeKey(dir.FullName)), unitName, roomsNote, shared, SortRooms(rooms));
    }

    private void AddRoomOrShared(DirectoryInfo dir, string? parentName, List<Room> rooms, List<MediaItem> shared,
        Listings listings, Dictionary<string, string> mediaPaths)
    {
        var name = parentName is null ? dir.Name.Trim() : $"{parentName} · {dir.Name.Trim()}";

        if (IsSharedSpace(dir.Name))
        {
            shared.AddRange(CollectMediaRecursive(dir, mediaPaths));
            return;
        }

        var media = CollectMedia(dir, mediaPaths);
        if (media.Count > 0)
        {
            var key = RelativeKey(dir.FullName);
            listings.Rooms.TryGetValue(key, out var roomListing);
            rooms.Add(new Room(Slug(key), name, ClassifyRoom(name), roomListing?.Price,
                NullIfBlank(roomListing?.Status), NullIfBlank(roomListing?.Notes), media));
        }

        // Grouped rooms, e.g. "Big Single With Shared Bathroom (R2 & R3)/Room 2".
        foreach (var child in SortedDirectories(dir.FullName))
        {
            AddRoomOrShared(child, name, rooms, shared, listings, mediaPaths);
        }
    }

    private List<MediaItem> CollectMedia(DirectoryInfo dir, Dictionary<string, string> mediaPaths)
    {
        var items = new List<MediaItem>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var file in dir.EnumerateFiles().OrderBy(f => f.Name, NaturalComparer.Instance))
        {
            var kind = PhotoExtensions.Contains(file.Extension) ? "photo" : VideoExtensions.Contains(file.Extension) ? "video" : null;
            if (kind is null) continue;

            // Skip exact copies in the same folder, such as "photo.jpg" and "photo(1).jpg" from a Drive download.
            if (!seen.Add(ContentFingerprint(file))) continue;

            var id = MediaId(_scanKeyPrefix + RelativeKey(file.FullName));
            mediaPaths[id] = file.FullName;
            items.Add(new MediaItem(id, kind, file.Name, file.Length));
        }
        // Photos first so cards and galleries open on an image; videos follow.
        return items.OrderBy(m => m.Kind == "photo" ? 0 : 1).ToList();
    }

    private List<MediaItem> CollectMediaRecursive(DirectoryInfo dir, Dictionary<string, string> mediaPaths)
    {
        var items = CollectMedia(dir, mediaPaths);
        foreach (var child in SortedDirectories(dir.FullName)) items.AddRange(CollectMediaRecursive(child, mediaPaths));
        return items;
    }

    private Listings LoadListings()
    {
        try
        {
            if (!File.Exists(ListingsPath)) return new Listings();
            var listings = JsonSerializer.Deserialize<Listings>(File.ReadAllText(ListingsPath), JsonOptions) ?? new Listings();

            // Re-key case-insensitively and accept either slash style for room paths.
            return new Listings
            {
                Properties = new Dictionary<string, PropertyListing>(listings.Properties, StringComparer.OrdinalIgnoreCase),
                Rooms = listings.Rooms.ToDictionary(kv => kv.Key.Replace('\\', '/').Trim('/'), kv => kv.Value, StringComparer.OrdinalIgnoreCase),
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Could not read listings file {ListingsPath}; continuing without it", ListingsPath);
            return new Listings();
        }
    }

    private string RelativeKey(string fullPath) => Path.GetRelativePath(_scanRoot, fullPath).Replace('\\', '/');

    /// <summary>File size plus a hash of the first 64 KB: cheap, and enough to spot duplicate copies.</summary>
    private static string ContentFingerprint(FileInfo file)
    {
        using var stream = file.OpenRead();
        var buffer = new byte[Math.Min(65536, file.Length)];
        stream.ReadExactly(buffer);
        return $"{file.Length}:{Convert.ToHexString(SHA1.HashData(buffer))}";
    }

    private static IEnumerable<DirectoryInfo> SortedDirectories(string path) =>
        new DirectoryInfo(path).EnumerateDirectories().OrderBy(d => d.Name, NaturalComparer.Instance);

    private static string? PickCover(IEnumerable<Unit> units)
    {
        var all = units.SelectMany(u => u.Rooms.SelectMany(r => r.Media).Concat(u.SharedMedia)).ToList();
        return (all.FirstOrDefault(m => m.Kind == "photo") ?? all.FirstOrDefault())?.Id;
    }

    private static decimal? MinPrice(IEnumerable<Unit> units) =>
        units.SelectMany(u => u.Rooms).Select(r => r.Price).Where(p => p.HasValue).DefaultIfEmpty(null).Min();

    /// <summary>Orders rooms by their number ("R3", "Room 3", "Master Room 1"), so R1 comes before R2 regardless of type.</summary>
    private static List<Room> SortRooms(List<Room> rooms) => rooms
        .OrderBy(r => RoomNumberRegex().Match(r.Name) is { Success: true } m ? int.Parse(m.Groups[1].Value) : int.MaxValue)
        .ThenBy(r => r.Name, NaturalComparer.Instance)
        .ToList();

    private static bool IsUnitFolder(string name) => UnitRegex().IsMatch(name.Trim());

    private static bool IsSharedSpace(string name)
    {
        var n = name.ToLowerInvariant();
        return n.Contains("common") || n.Contains("toilet");
    }

    public static string ClassifyRoom(string name)
    {
        var n = name.ToLowerInvariant();
        if (n.Contains("studio")) return "Studio";
        if (n.Contains("whole unit")) return "Whole unit";
        if (n.Contains("master")) return "Master";
        if (n.Contains("balcony")) return "Balcony";
        if (n.Contains("partition")) return "Partition";
        if (n.Contains("single")) return "Single";
        if (n.Contains("middle") || n.Contains("medium")) return "Middle";
        return "Room";
    }

    /// <summary>Turns folder names such as "D_Quince" or "Sunway Belfield (Actual)" into display names.</summary>
    private static string CleanName(string folderName)
    {
        var name = Regex.Replace(folderName, @"\s*\(actual\)\s*", "", RegexOptions.IgnoreCase);
        name = Regex.Replace(name, @"^D[_‘’']", "D'");
        return name.Trim();
    }

    private static string Slug(string value)
    {
        var sb = new StringBuilder();
        foreach (var c in value.ToLowerInvariant())
        {
            if (char.IsAsciiLetterOrDigit(c)) sb.Append(c);
            else if (sb.Length > 0 && sb[^1] != '-') sb.Append('-');
        }
        return sb.ToString().Trim('-');
    }

    private static string MediaId(string relativePath) =>
        Convert.ToHexString(SHA1.HashData(Encoding.UTF8.GetBytes(relativePath.ToLowerInvariant())))[..16].ToLowerInvariant();

    private static string? NullIfBlank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    // A-11-07, 09-03, D3-26-08, T2-37-05, and with a block name in front: "PV16 13-17".
    [GeneratedRegex(@"^([A-Za-z]+\d*\s+)?([A-Za-z]\d?-)?\d{1,3}[A-Za-z]?-\d{1,3}[A-Za-z]?\b")]
    private static partial Regex UnitRegex();

    [GeneratedRegex(@"\s*\((\d+)\s*rooms?\)", RegexOptions.IgnoreCase)]
    private static partial Regex RoomsNoteRegex();

    [GeneratedRegex(@"\bR?(\d{1,2})\b(?!.*\bR?\d{1,2}\b)", RegexOptions.IgnoreCase)]
    private static partial Regex RoomNumberRegex();

    private sealed record Snapshot(Catalogue Catalogue, Dictionary<string, string> MediaPaths);
}

/// <summary>Sorts "Room 2" before "Room 10".</summary>
public sealed class NaturalComparer : IComparer<string>
{
    public static readonly NaturalComparer Instance = new();

    public int Compare(string? x, string? y)
    {
        if (x is null || y is null) return string.Compare(x, y, StringComparison.Ordinal);
        int i = 0, j = 0;
        while (i < x.Length && j < y.Length)
        {
            if (char.IsDigit(x[i]) && char.IsDigit(y[j]))
            {
                int si = i, sj = j;
                while (i < x.Length && char.IsDigit(x[i])) i++;
                while (j < y.Length && char.IsDigit(y[j])) j++;
                var a = x[si..i].TrimStart('0');
                var b = y[sj..j].TrimStart('0');
                var cmp = a.Length != b.Length ? a.Length.CompareTo(b.Length) : string.CompareOrdinal(a, b);
                if (cmp != 0) return cmp;
            }
            else
            {
                var cmp = char.ToLowerInvariant(x[i]).CompareTo(char.ToLowerInvariant(y[j]));
                if (cmp != 0) return cmp;
                i++; j++;
            }
        }
        return (x.Length - i).CompareTo(y.Length - j);
    }
}
