import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PostDraft } from "@/lib/types";
import { platformAssetPrompt, platformAssetRequirements } from "./platform-assets";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(value: string, maxLineLength: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLineLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function renderTextLines(lines: string[], x: number, y: number, fontSize: number, lineHeight: number, weight = 400) {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" font-size="${fontSize}" font-weight="${weight}" fill="#0f172a">${escapeXml(line)}</text>`
    )
    .join("\n");
}

export async function renderDraftAsset(postDraft: PostDraft) {
  const requirement = platformAssetRequirements[postDraft.platform];
  const outputDirectory = join(process.cwd(), "public", "generated-assets", postDraft.briefId);
  await mkdir(outputDirectory, { recursive: true });

  const filename = `${postDraft.platform}-${requirement.width}x${requirement.height}.svg`;
  const relativeUrl = `/generated-assets/${postDraft.briefId}/${filename}`;
  const outputPath = join(outputDirectory, filename);
  const headlineLines = wrapText(postDraft.imageText.headline, postDraft.platform === "tiktok" ? 18 : 26);
  const subtitleLines = wrapText(postDraft.imageText.subtitle, postDraft.platform === "tiktok" ? 28 : 48);
  const margin = Math.round(requirement.width * 0.08);
  const headlineSize = postDraft.platform === "tiktok" ? 74 : 58;
  const subtitleSize = postDraft.platform === "tiktok" ? 38 : 30;
  const buttonY = Math.round(requirement.height * 0.72);
  const buttonHeight = postDraft.platform === "tiktok" ? 96 : 74;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${requirement.width}" height="${requirement.height}" viewBox="0 0 ${requirement.width} ${requirement.height}">
  <rect width="100%" height="100%" fill="#eff6ff"/>
  <rect x="${margin}" y="${margin}" width="${requirement.width - margin * 2}" height="12" rx="6" fill="#2563eb"/>
  <circle cx="${requirement.width - margin - 44}" cy="${margin + 64}" r="34" fill="#dbeafe"/>
  <text x="${margin}" y="${margin + 64}" font-size="28" font-weight="700" fill="#2563eb">QROAD Philippines</text>
  ${renderTextLines(headlineLines, margin, Math.round(requirement.height * 0.38), headlineSize, Math.round(headlineSize * 1.15), 800)}
  ${renderTextLines(subtitleLines, margin, Math.round(requirement.height * 0.56), subtitleSize, Math.round(subtitleSize * 1.35))}
  <rect x="${margin}" y="${buttonY}" width="${Math.round(requirement.width * 0.34)}" height="${buttonHeight}" rx="14" fill="#2563eb"/>
  <text x="${margin + 34}" y="${buttonY + (postDraft.platform === "tiktok" ? 61 : 48)}" font-size="${postDraft.platform === "tiktok" ? 34 : 28}" font-weight="800" fill="#ffffff">${escapeXml(postDraft.imageText.buttonText)}</text>
</svg>`;

  await writeFile(outputPath, svg, "utf8");

  return {
    url: relativeUrl,
    width: requirement.width,
    height: requirement.height,
    prompt: platformAssetPrompt(postDraft)
  };
}
