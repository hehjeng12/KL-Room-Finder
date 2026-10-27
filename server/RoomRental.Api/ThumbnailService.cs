using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using SkiaSharp;

namespace RoomRental.Api;

/// <summary>
/// Produces resized, correctly rotated JPEGs from the original photos and caches them on disk.
/// Phone photos are several megabytes each, so visitors only ever download these smaller copies.
/// </summary>
public sealed class ThumbnailService
{
    public static readonly int[] AllowedWidths = { 480, 960, 1600 };

    private readonly string _cacheDir;
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

    public ThumbnailService(IOptions<MediaOptions> options, IWebHostEnvironment env)
    {
        _cacheDir = Path.GetFullPath(Path.Combine(env.ContentRootPath, options.Value.CachePath));
        Directory.CreateDirectory(_cacheDir);
    }

    public static int SnapWidth(int requested) => AllowedWidths.FirstOrDefault(w => w >= requested, AllowedWidths[^1]);

    public async Task<string?> GetThumbnailAsync(string mediaId, string sourcePath, int width)
    {
        var source = new FileInfo(sourcePath);
        var target = Path.Combine(_cacheDir, $"{mediaId}_{width}_{source.LastWriteTimeUtc.Ticks:x}.jpg");
        if (File.Exists(target)) return target;

        var gate = _locks.GetOrAdd(target, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync();
        try
        {
            if (File.Exists(target)) return target;
            return await Task.Run(() => Render(sourcePath, target, width));
        }
        finally
        {
            gate.Release();
            _locks.TryRemove(target, out _);
        }
    }

    private static string? Render(string sourcePath, string target, int width)
    {
        using var codec = SKCodec.Create(sourcePath);
        if (codec is null) return null;

        using var original = SKBitmap.Decode(codec);
        if (original is null) return null;

        using var oriented = Orient(original, codec.EncodedOrigin);
        var scale = Math.Min(1f, (float)width / oriented.Width);
        var info = new SKImageInfo(Math.Max(1, (int)(oriented.Width * scale)), Math.Max(1, (int)(oriented.Height * scale)));

        using var resized = scale < 1f ? oriented.Resize(info, SKFilterQuality.High) : oriented.Copy();
        using var image = SKImage.FromBitmap(resized);
        using var data = image.Encode(SKEncodedImageFormat.Jpeg, 82);

        var temp = target + ".tmp";
        using (var stream = File.Create(temp)) data.SaveTo(stream);
        File.Move(temp, target, overwrite: true);
        return target;
    }

    /// <summary>Applies the EXIF orientation so portrait phone photos are not shown sideways.</summary>
    private static SKBitmap Orient(SKBitmap source, SKEncodedOrigin origin)
    {
        if (origin == SKEncodedOrigin.TopLeft) return source.Copy();

        var rotated = origin is SKEncodedOrigin.LeftTop or SKEncodedOrigin.RightTop or SKEncodedOrigin.RightBottom or SKEncodedOrigin.LeftBottom;
        var result = new SKBitmap(rotated ? source.Height : source.Width, rotated ? source.Width : source.Height);
        using var canvas = new SKCanvas(result);

        switch (origin)
        {
            case SKEncodedOrigin.TopRight:
                canvas.Translate(result.Width, 0); canvas.Scale(-1, 1); break;
            case SKEncodedOrigin.BottomRight:
                canvas.Translate(result.Width, result.Height); canvas.RotateDegrees(180); break;
            case SKEncodedOrigin.BottomLeft:
                canvas.Translate(0, result.Height); canvas.Scale(1, -1); break;
            case SKEncodedOrigin.LeftTop:
                canvas.Scale(-1, 1); canvas.RotateDegrees(90); break;
            case SKEncodedOrigin.RightTop:
                canvas.Translate(result.Width, 0); canvas.RotateDegrees(90); break;
            case SKEncodedOrigin.RightBottom:
                canvas.Translate(result.Width, result.Height); canvas.Scale(1, -1); canvas.RotateDegrees(90); break;
            case SKEncodedOrigin.LeftBottom:
                canvas.Translate(0, result.Height); canvas.RotateDegrees(270); break;
        }

        canvas.DrawBitmap(source, 0, 0);
        return result;
    }
}
