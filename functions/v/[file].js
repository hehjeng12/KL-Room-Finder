// Cloudflare Pages Function for /v/<id>.mp4 (video tours).
// Pages serves static files without HTTP Range support, so browsers cannot seek and iPhones (Safari)
// may refuse to play. This answers Range requests with 206 Partial Content from the static file.
// Only /v/* is routed here (see deploy/_routes.json), so photos never use the free Functions allowance.

export async function onRequest({ request, env }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }

  // Fetch the whole static file without the Range header; Pages would ignore it anyway.
  const asset = await env.ASSETS.fetch(new Request(request.url, { method: 'GET' }));
  if (!asset.ok) return asset;
  // Missing files fall back to the app's index.html; report them as not found instead.
  if (!(asset.headers.get('Content-Type') ?? '').startsWith('video/')) {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers(asset.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'public, max-age=604800');

  const rangeHeader = request.headers.get('Range');
  if (!rangeHeader) {
    return new Response(request.method === 'HEAD' ? null : asset.body, { status: 200, headers });
  }

  // Content-Length isn't always present on the asset response, so take the size from the bytes.
  // arrayBuffer() and slice() are native copies, which keeps CPU time low on the free plan.
  const bytes = await asset.arrayBuffer();
  const size = bytes.byteLength;
  const range = parseRange(rangeHeader, size);
  if (range === null) {
    headers.set('Content-Length', String(size));
    return new Response(request.method === 'HEAD' ? null : bytes, { status: 200, headers });
  }
  if (range === 'invalid') {
    headers.set('Content-Range', `bytes */${size}`);
    headers.delete('Content-Length');
    return new Response(null, { status: 416, headers });
  }

  const part = request.method === 'HEAD' ? null : bytes.slice(range.start, range.end + 1);
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
  headers.set('Content-Length', String(range.end - range.start + 1));
  return new Response(part, { status: 206, headers });
}

/** Parses a single "bytes=start-end" range. Returns null for no/unsupported range, 'invalid' if unsatisfiable. */
function parseRange(header, size) {
  if (!header || !Number.isFinite(size)) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === '' && match[2] === '')) return null;

  let start;
  let end;
  if (match[1] === '') {
    // Suffix range: the last N bytes.
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  return start >= size || start > end ? 'invalid' : { start, end };
}
