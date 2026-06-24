import { NextResponse } from "next/server";

// TikTok's Content Posting API pulls images by URL and only accepts URLs on a
// domain you've verified in the developer portal. Our images live on Vercel
// Blob (an unverifiable shared domain), so we stream them through this route on
// the app's own (verified) domain instead.
//
// To avoid turning this into an open proxy / SSRF vector, we only forward
// requests to Vercel Blob hosts or our own origin.
const ALLOWED_HOST_SUFFIXES = [".blob.vercel-storage.com"];

function isAllowedSource(src: URL, request: Request) {
  if (src.protocol !== "https:") return false;
  if (ALLOWED_HOST_SUFFIXES.some((suffix) => src.hostname.endsWith(suffix))) return true;
  try {
    return src.origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src");
  if (!src) {
    return NextResponse.json({ error: "Missing src." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(src);
  } catch {
    return NextResponse.json({ error: "Invalid src." }, { status: 400 });
  }

  if (!isAllowedSource(target, request)) {
    return NextResponse.json({ error: "src host is not allowed." }, { status: 403 });
  }

  const upstream = await fetch(target.toString(), { cache: "no-store" });
  if (!upstream.ok) {
    return NextResponse.json({ error: `Upstream fetch failed (${upstream.status}).` }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const buffer = Buffer.from(await upstream.arrayBuffer());
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600"
    }
  });
}
