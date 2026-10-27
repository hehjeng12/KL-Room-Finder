using System.Text.Json;
using Microsoft.Extensions.Options;

namespace RoomRental.Api;

/// <summary>
/// Writes the whole catalogue as plain files (JSON, resized photos, videos) so the site can be hosted
/// on a free static host such as Cloudflare Pages, with no server running.
/// Usage: dotnet run -- export &lt;output folder&gt;
/// </summary>
public static class StaticExporter
{
    /// <summary>Cloudflare Pages rejects files over 25 MiB.</summary>
    public const long MaxFileBytes = 25L * 1024 * 1024;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static async Task<int> RunAsync(IServiceProvider services, string outputDir)
    {
        var log = services.GetRequiredService<ILoggerFactory>().CreateLogger("Export");
        var catalogueService = services.GetRequiredService<CatalogueService>();
        var thumbnails = services.GetRequiredService<ThumbnailService>();
        var site = services.GetRequiredService<IOptions<SiteOptions>>().Value;

        outputDir = Path.GetFullPath(outputDir);
        var mediaDir = Path.Combine(outputDir, "m");
        // Videos get their own folder so only they are routed through the range-request function (functions/v).
        var videoDir = Path.Combine(outputDir, "v");
        var dataDir = Path.Combine(outputDir, "data");
        Directory.CreateDirectory(mediaDir);
        Directory.CreateDirectory(videoDir);
        Directory.CreateDirectory(dataDir);

        var skipped = new List<string>();
        bool Keep(MediaItem m)
        {
            if (m.Kind != "video" || m.Size <= MaxFileBytes) return true;
            skipped.Add($"{catalogueService.GetMediaPath(m.Id)} ({m.Size / 1024 / 1024} MB)");
            return false;
        }

        var catalogue = Filter(catalogueService.GetCatalogue(), Keep);
        var expected = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var media = catalogue.Properties
            .SelectMany(p => p.Units)
            .SelectMany(u => u.SharedMedia.Concat(u.Rooms.SelectMany(r => r.Media)))
            .DistinctBy(m => m.Id)
            .ToList();

        var done = 0;
        foreach (var item in media)
        {
            var source = catalogueService.GetMediaPath(item.Id)!;
            if (item.Kind == "photo")
            {
                foreach (var width in ThumbnailService.AllowedWidths)
                {
                    var thumb = await thumbnails.GetThumbnailAsync(item.Id, source, width);
                    if (thumb is not null) CopyIfChanged(thumb, Path.Combine(mediaDir, $"{item.Id}_{width}.jpg"), expected);
                }
            }
            else
            {
                // Saved as .mp4 so the host labels it video/mp4, which browsers play for H.264 .MOV files.
                CopyIfChanged(source, Path.Combine(videoDir, $"{item.Id}.mp4"), expected);
            }

            if (++done % 50 == 0) log.LogInformation("Exported {Done}/{Total} media files", done, media.Count);
        }

        // Remove files for photos and videos that no longer exist in the folders.
        foreach (var stale in Directory.EnumerateFiles(mediaDir).Concat(Directory.EnumerateFiles(videoDir)).Where(f => !expected.Contains(f)))
        {
            File.Delete(stale);
        }

        await File.WriteAllTextAsync(Path.Combine(dataDir, "catalogue.json"), JsonSerializer.Serialize(catalogue, Json));
        await File.WriteAllTextAsync(Path.Combine(dataDir, "site.json"), JsonSerializer.Serialize(site, Json));

        log.LogInformation("Export finished: {Count} photos/videos written to {Output}", media.Count, outputDir);
        foreach (var s in skipped)
        {
            log.LogWarning("Skipped video over 25 MB (too large for free hosting; compress it to include it): {File}", s);
        }
        return 0;
    }

    private static Catalogue Filter(Catalogue catalogue, Func<MediaItem, bool> keep)
    {
        var properties = new List<Property>();
        foreach (var property in catalogue.Properties)
        {
            var units = property.Units
                .Select(u => u with
                {
                    SharedMedia = u.SharedMedia.Where(keep).ToList(),
                    Rooms = u.Rooms.Select(r => r with { Media = r.Media.Where(keep).ToList() }).Where(r => r.Media.Count > 0).ToList(),
                })
                .Where(u => u.Rooms.Count > 0 || u.SharedMedia.Count > 0)
                .ToList();
            if (units.Count == 0) continue;

            var kept = units.SelectMany(u => u.SharedMedia.Concat(u.Rooms.SelectMany(r => r.Media))).Select(m => m.Id).ToHashSet();
            properties.Add(property with
            {
                Units = units,
                CoverMediaId = property.CoverMediaId is not null && kept.Contains(property.CoverMediaId) ? property.CoverMediaId : null,
            });
        }
        return catalogue with { Properties = properties };
    }

    private static void CopyIfChanged(string source, string target, HashSet<string> expected)
    {
        expected.Add(target);
        var src = new FileInfo(source);
        var dst = new FileInfo(target);
        if (dst.Exists && dst.Length == src.Length && dst.LastWriteTimeUtc >= src.LastWriteTimeUtc) return;
        File.Copy(source, target, overwrite: true);
    }
}
