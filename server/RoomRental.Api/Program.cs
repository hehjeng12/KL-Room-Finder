using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
using RoomRental.Api;

// "export <folder>" writes a static copy of the site for free hosting instead of starting the web server.
var isExport = args.Length > 0 && args[0].Equals("export", StringComparison.OrdinalIgnoreCase);
var builder = WebApplication.CreateBuilder(isExport ? Array.Empty<string>() : args);

// Personal contact details live in appsettings.Local.json, which is git-ignored so they stay out of the public repo.
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

builder.Services.Configure<SiteOptions>(builder.Configuration.GetSection("Site"));
builder.Services.Configure<MediaOptions>(builder.Configuration.GetSection("Media"));
builder.Services.AddSingleton<CatalogueService>();
builder.Services.AddSingleton<ThumbnailService>();
builder.Services.AddResponseCompression(o =>
{
    o.EnableForHttps = true;
    o.Providers.Add<BrotliCompressionProvider>();
    o.Providers.Add<GzipCompressionProvider>();
});

var app = builder.Build();

if (isExport)
{
    if (args.Length < 2)
    {
        Console.Error.WriteLine("Usage: dotnet run -- export <output folder>");
        return 1;
    }
    return await StaticExporter.RunAsync(app.Services, args[1]);
}

app.UseResponseCompression();
app.UseDefaultFiles();
app.UseStaticFiles();

var api = app.MapGroup("/api");

api.MapGet("/site", (IOptionsSnapshot<SiteOptions> site) => site.Value);

api.MapGet("/catalogue", (CatalogueService catalogue, HttpContext http) =>
{
    http.Response.Headers.CacheControl = "public, max-age=60";
    return catalogue.GetCatalogue();
});

// Original file. Range requests let browsers stream and seek within the video tours.
api.MapGet("/media/{id}", (string id, CatalogueService catalogue) =>
{
    var path = catalogue.GetMediaPath(id);
    if (path is null) return Results.NotFound();

    var file = new FileInfo(path);
    return Results.File(path, ContentTypeFor(file.Extension), enableRangeProcessing: true,
        lastModified: file.LastWriteTimeUtc, entityTag: new EntityTagHeaderValue($"\"{id}-{file.LastWriteTimeUtc.Ticks:x}\""));
});

api.MapGet("/media/{id}/thumb", async (string id, int? w, CatalogueService catalogue, ThumbnailService thumbnails, HttpContext http) =>
{
    var path = catalogue.GetMediaPath(id);
    if (path is null) return Results.NotFound();

    var thumb = await thumbnails.GetThumbnailAsync(id, path, ThumbnailService.SnapWidth(w ?? 480));
    if (thumb is null) return Results.NotFound();

    http.Response.Headers.CacheControl = "public, max-age=604800";
    return Results.File(thumb, "image/jpeg", lastModified: File.GetLastWriteTimeUtc(thumb));
});

// Client-side routes (/rooms, /p/..., /r/...) all serve the React app.
app.MapFallbackToFile("index.html");

app.Logger.LogInformation("Serving media from {Root}", app.Services.GetRequiredService<CatalogueService>().RootPath);
app.Run();
return 0;

static string ContentTypeFor(string extension) => extension.ToLowerInvariant() switch
{
    ".jpg" or ".jpeg" => "image/jpeg",
    ".png" => "image/png",
    ".webp" => "image/webp",
    ".gif" => "image/gif",
    // iPhone .MOV files are H.264 in a QuickTime container; browsers play them when labelled as MP4.
    ".mov" or ".mp4" or ".m4v" => "video/mp4",
    ".webm" => "video/webm",
    _ => "application/octet-stream",
};
