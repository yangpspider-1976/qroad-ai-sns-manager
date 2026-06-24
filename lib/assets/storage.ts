import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * Persist an asset and return a URL the public internet (and Meta's servers)
 * can fetch.
 *
 * On Vercel the runtime filesystem is read-only except /tmp, and files written
 * to public/ at runtime are never served — so we upload to Vercel Blob, which
 * returns a public HTTPS URL. Locally (no BLOB_READ_WRITE_TOKEN) we fall back to
 * writing into public/ and returning a relative path, which Next dev serves.
 *
 * @param pathname  Storage path without a leading slash, e.g. "uploaded-assets/ws/123/file.png".
 * @returns The absolute Blob URL (prod) or the relative "/pathname" (dev).
 */
export async function storeAsset(pathname: string, data: Buffer | string, contentType: string): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(pathname, data, {
      access: "public",
      contentType,
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    return blob.url;
  }

  const filePath = join(process.cwd(), "public", pathname);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
  return `/${pathname}`;
}

/** True when uploads are persisted to Vercel Blob rather than the local disk. */
export function blobStorageEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
