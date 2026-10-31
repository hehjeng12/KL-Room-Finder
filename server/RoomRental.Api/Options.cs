namespace RoomRental.Api;

/// <summary>Public-facing site details. Shown on every page and used to build the contact links.</summary>
public sealed class SiteOptions
{
    public string BrandName { get; set; } = "Room Rentals";
    public string Tagline { get; set; } = "";
    public string AgentName { get; set; } = "";

    /// <summary>International format without "+" or spaces, e.g. 60123456789.</summary>
    public string WhatsAppNumber { get; set; } = "";

    /// <summary>Full URL of the Facebook page or profile.</summary>
    public string FacebookUrl { get; set; } = "";

    /// <summary>Facebook page username, used for m.me Messenger links.</summary>
    public string MessengerUsername { get; set; } = "";

    /// <summary>Instagram username without the "@".</summary>
    public string InstagramUsername { get; set; } = "";

    /// <summary>rednote (小红书 / Xiaohongshu) ID shown on the profile card, e.g. 1234567890.</summary>
    public string RednoteId { get; set; } = "";

    /// <summary>Optional profile link from rednote's "Share profile → Copy link" (usually an xhslink.com address).</summary>
    public string RednoteUrl { get; set; } = "";

    /// <summary>Optional QR code image served from the site, e.g. /rednote-qr.png.</summary>
    public string RednoteQrImage { get; set; } = "";

    /// <summary>Text shown after "© {year}" in the footer. Falls back to the brand name.</summary>
    public string CopyrightText { get; set; } = "";

    public string Currency { get; set; } = "RM";
}

public sealed class MediaOptions
{
    /// <summary>Folder that holds the property folders. Relative paths resolve against the app's content root.</summary>
    public string RootPath { get; set; } = "";

    /// <summary>
    /// More folders laid out the same way (Property / Unit / Room). A property found in several folders is
    /// merged into one listing. Machine-specific, so set it in appsettings.Local.json.
    /// </summary>
    public string[] ExtraRootPaths { get; set; } = Array.Empty<string>();

    /// <summary>Top-level folder names that are never published (for example this website's own source).</summary>
    public string[] ExcludedFolders { get; set; } = Array.Empty<string>();

    /// <summary>Where generated thumbnails are cached.</summary>
    public string CachePath { get; set; } = "App_Data/thumbs";

    /// <summary>Path to the editable listings file (display names, prices, availability).</summary>
    public string ListingsPath { get; set; } = "Data/listings.json";
}
