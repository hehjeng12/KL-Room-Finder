namespace RoomRental.Api;

public sealed record MediaItem(string Id, string Kind, string FileName, long Size);

public sealed record Room(
    string Id,
    string Name,
    string Type,
    decimal? Price,
    string? Status,
    string? Notes,
    IReadOnlyList<MediaItem> Media);

public sealed record Unit(
    string Id,
    string Name,
    string? RoomsNote,
    IReadOnlyList<MediaItem> SharedMedia,
    IReadOnlyList<Room> Rooms);

public sealed record Property(
    string Id,
    string Name,
    string FolderName,
    string? Area,
    string? Address,
    string? Description,
    IReadOnlyList<string> Highlights,
    string? MapUrl,
    decimal? PriceFrom,
    string? CoverMediaId,
    IReadOnlyList<Unit> Units);

public sealed record Catalogue(DateTimeOffset GeneratedAt, IReadOnlyList<Property> Properties);

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
