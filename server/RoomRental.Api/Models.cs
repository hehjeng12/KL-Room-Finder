using System.Text.Json.Serialization;

namespace RoomRental.Api;

// Fields marked [JsonIgnore] are used while building but never published: original file names and
// folder paths can contain unit numbers, which the public site must not reveal.

public sealed record MediaItem(string Id, string Kind, [property: JsonIgnore] string FileName, long Size);

/// <param name="Code">Public reference such as "RC-7K2M" that customers quote and agents look up privately.</param>
/// <param name="Folder">Folder path below the media root (internal; contains the unit number).</param>
public sealed record Room(
    string Id,
    string Code,
    string Name,
    string Type,
    decimal? Price,
    string? Status,
    string? Notes,
    IReadOnlyList<MediaItem> Media,
    [property: JsonIgnore] string Folder);

public sealed record Unit(
    string Id,
    string Name,
    string? RoomsNote,
    IReadOnlyList<MediaItem> SharedMedia,
    IReadOnlyList<Room> Rooms);

public sealed record Property(
    string Id,
    string Name,
    [property: JsonIgnore] string FolderName,
    string? Area,
    string? Address,
    string? Description,
    IReadOnlyList<string> Highlights,
    string? MapUrl,
    decimal? PriceFrom,
    string? CoverMediaId,
    IReadOnlyList<Unit> Units);

public sealed record Catalogue(DateTimeOffset GeneratedAt, IReadOnlyList<Property> Properties);

/// <summary>Private lookup row: a room's public code and where it really is. Written to room-codes.csv, never published.</summary>
public sealed record RoomReference(string Code, string Property, string? Area, string Unit, string Room, string Type, string Folder);

/// <summary>Shape of Data/listings.json. Keys are folder names / relative folder paths as they appear on disk.</summary>
public sealed class Listings
{
    public Dictionary<string, PropertyListing> Properties { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, RoomListing> Rooms { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class PropertyListing
{
    public string? DisplayName { get; set; }
    public string? Area { get; set; }
    public string? Address { get; set; }
    public string? Description { get; set; }
    public List<string>? Highlights { get; set; }
    public string? MapUrl { get; set; }
    public decimal? PriceFrom { get; set; }
    public bool Hidden { get; set; }
}

public sealed class RoomListing
{
    public decimal? Price { get; set; }

    /// <summary>"available", "reserved" or "taken". Taken rooms are still shown but marked.</summary>
    public string? Status { get; set; }

    public string? Notes { get; set; }
}
