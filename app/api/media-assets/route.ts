import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDemoUser, prisma } from "@/lib/db/prisma";

const imageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/svg+xml", "svg"]
]);

const metadataSchema = z.array(
  z.object({
    name: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive()
  })
);

const deleteSchema = z.object({
  workspaceId: z.string(),
  assetIds: z.array(z.string()).optional(),
  briefId: z.string().optional()
});

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 96);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId") ?? undefined;
  const postDraftId = searchParams.get("postDraftId") ?? undefined;
  const briefId = searchParams.get("briefId") ?? undefined;

  const assets = await prisma.mediaAsset.findMany({
    where: {
      ...(workspaceId ? { workspaceId } : {}),
      ...(postDraftId ? { postDraftId } : {}),
      ...(briefId
        ? {
            postDraft: {
              briefId
            }
          }
        : {}),
      NOT: {
        url: {
          startsWith: "/generated-assets/"
        }
      }
    },
    include: {
      postDraft: {
        select: {
          id: true,
          briefId: true,
          platform: true,
          imageText: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    assets: assets.map((asset) => ({
      id: asset.id,
      workspaceId: asset.workspaceId,
      postDraftId: asset.postDraftId,
      type: asset.type,
      url: asset.url,
      prompt: asset.prompt,
      width: asset.width,
      height: asset.height,
      status: asset.status,
      createdAt: asset.createdAt.toISOString(),
      draft: asset.postDraft
    }))
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const postDraftId = String(formData.get("postDraftId") ?? "");
  const briefId = String(formData.get("briefId") ?? "");
  const metadataRaw = String(formData.get("metadata") ?? "[]");
  const files = formData.getAll("files").filter((file): file is File => file instanceof File);

  if (!workspaceId || (!postDraftId && !briefId) || files.length === 0) {
    return NextResponse.json({ error: "workspaceId, a draft or brief, and at least one image file are required." }, { status: 400 });
  }

  const parsedMetadata = JSON.parse(metadataRaw) as unknown;
  const metadata = metadataSchema.safeParse(parsedMetadata);
  if (!metadata.success || metadata.data.length !== files.length) {
    return NextResponse.json({ error: "Image metadata is invalid or incomplete." }, { status: 400 });
  }

  const drafts = await prisma.postDraft.findMany({
    where: {
      workspaceId,
      ...(briefId ? { briefId } : { id: postDraftId })
    },
    orderBy: { createdAt: "asc" }
  });
  if (drafts.length === 0) {
    return NextResponse.json({ error: "Post draft not found for the selected workspace." }, { status: 404 });
  }

  const user = await getDemoUser();
  const storedAssets = [];
  const folderId = briefId || postDraftId;
  const outputDirectory = join(process.cwd(), "public", "uploaded-assets", safeSegment(workspaceId), safeSegment(folderId));
  await mkdir(outputDirectory, { recursive: true });

  for (const [index, file] of files.entries()) {
    const extension = imageTypes.get(file.type);
    if (!extension) {
      return NextResponse.json({ error: `${file.name} is not a supported image type.` }, { status: 400 });
    }

    const meta = metadata.data[index];
    const filename = `${Date.now()}-${index + 1}-${safeSegment(file.name.replace(/\.[^.]+$/, ""))}.${extension}`;
    const outputPath = join(outputDirectory, filename);
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(outputPath, bytes);

    const url = `/uploaded-assets/${safeSegment(workspaceId)}/${safeSegment(folderId)}/${filename}`;
    for (const draft of drafts) {
      const asset = await prisma.mediaAsset.create({
        data: {
          workspaceId,
          postDraftId: draft.id,
          type: "image",
          url,
          prompt: `Manual upload: ${file.name}`,
          width: meta.width,
          height: meta.height,
          status: "generated"
        }
      });
      storedAssets.push(asset);
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      workspaceId,
      action: "media_assets.upload",
      entityType: briefId ? "ContentBrief" : "PostDraft",
      entityId: briefId || postDraftId,
      metadata: { count: storedAssets.length, fileCount: files.length, draftCount: drafts.length, filenames: files.map((file) => file.name) }
    }
  });

  return NextResponse.json({ assets: storedAssets }, { status: 201 });
}

export async function DELETE(request: Request) {
  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await getDemoUser();
  if ((!parsed.data.assetIds || parsed.data.assetIds.length === 0) && !parsed.data.briefId) {
    return NextResponse.json({ error: "assetIds or briefId is required." }, { status: 400 });
  }

  const assets = await prisma.mediaAsset.findMany({
    where: {
      workspaceId: parsed.data.workspaceId,
      ...(parsed.data.assetIds?.length ? { id: { in: parsed.data.assetIds } } : {}),
      ...(parsed.data.briefId
        ? {
            postDraft: {
              briefId: parsed.data.briefId
            }
          }
        : {})
    }
  });

  if (assets.length === 0) {
    return NextResponse.json({ deletedCount: 0 });
  }

  const deleted = await prisma.mediaAsset.deleteMany({
    where: {
      workspaceId: parsed.data.workspaceId,
      id: { in: assets.map((asset) => asset.id) }
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      workspaceId: parsed.data.workspaceId,
      action: "media_assets.delete",
      entityType: "MediaAsset",
      entityId: assets.map((asset) => asset.id).join(","),
      metadata: { assetIds: assets.map((asset) => asset.id), urls: assets.map((asset) => asset.url) }
    }
  });

  return NextResponse.json({ deletedCount: deleted.count });
}
