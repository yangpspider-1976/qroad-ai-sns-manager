import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * True when uploads should be persisted to Vercel Blob rather than the local
 * disk. BLOB_READ_WRITE_TOKEN is the classic static token; BLOB_STORE_ID is
 * present when the project is connected to a Blob store via OIDC (token-less,
 * Vercel's current default). Either one means Blob is available.
 */
export function blobStorageEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

/**
 * Persist an asset and return a URL the public internet (and Meta's servers)
 * can fetch.
 *
 * On Vercel the runtime filesystem is read-only except /tmp, and files written
 * to public/ at runtime are never served — so we upload to Vercel Blob, which
 * returns a public HTTPS URL. Locally (no Blob configured) we fall back to
 * writing into public/ and returning a relative path, which Next dev serves.
 *
 * @param pathname  Storage path without a leading slash, e.g. "uploaded-assets/ws/123/file.png".
 * @returns The absolute Blob URL (prod) or the relative "/pathname" (dev).
 */
export async function storeAsset(pathname: string, data: Buffer | string, contentType: string): Promise<string> {
  if (blobStorageEnabled()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(pathname, data, {
      access: "public",
      contentType,
      addRandomSuffix: true,
      // Pass the static token when present; otherwise the SDK uses the
      // project's OIDC credentials automatically on Vercel.
      ...(process.env.BLOB_READ_WRITE_TOKEN ? { token: process.env.BLOB_READ_WRITE_TOKEN } : {})
    });
    return blob.url;
  }

  const filePath = join(process.cwd(), "public", pathname);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
  return `/${pathname}`;
}
