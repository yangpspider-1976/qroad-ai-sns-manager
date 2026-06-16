"use client";

import Image from "next/image";
import { ChevronDown, ImageIcon, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/shell";
import { Button, Notice, Panel, fieldNoteClass, sectionHeadingClass } from "@/components/ui";
import { useSelectedWorkspaceId } from "@/components/workspace-switcher";
import { groupDraftsByBrief, platformListLabel } from "@/lib/draft-groups";
import type { MediaAsset, PostDraft } from "@/lib/types";

type StoredAsset = MediaAsset & {
  createdAt: string;
  draft?: {
    id: string;
    briefId: string;
    platform: string;
    imageText: unknown;
  };
};

type SelectedImage = {
  file: File;
  width: number;
  height: number;
  previewUrl: string;
};

function platformLabel(platform: string) {
  if (platform === "facebook") return "Facebook";
  if (platform === "instagram") return "Instagram";
  if (platform === "tiktok") return "TikTok";
  return platform;
}

function assetTitle(asset: StoredAsset) {
  const imageText = asset.draft?.imageText as { headline?: string } | undefined;
  return imageText?.headline ?? `${platformLabel(asset.draft?.platform ?? "manual")} asset`;
}

function readImageDimensions(file: File) {
  return new Promise<SelectedImage>((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => resolve({ file, width: image.naturalWidth, height: image.naturalHeight, previewUrl });
    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error(`Unable to read image dimensions for ${file.name}.`));
    };
    image.src = previewUrl;
  });
}

export default function AssetsPage() {
  const selectedWorkspaceId = useSelectedWorkspaceId();
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [assets, setAssets] = useState<StoredAsset[]>([]);
  const [selectedPostDraftId, setSelectedPostDraftId] = useState("");
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("Upload image assets and attach them to a saved draft.");
  const draftGroups = groupDraftsByBrief(drafts);
  const selectedDraft = drafts.find((draft) => draft.id === selectedPostDraftId);

  const draftOptions = useMemo(
    () =>
      draftGroups.flatMap((group) =>
        group.drafts.map((draft) => ({
          id: draft.id,
          label: `${group.title} - ${platformLabel(draft.platform)}`
        }))
      ),
    [draftGroups]
  );

  async function loadData() {
    const [draftResponse, assetResponse] = await Promise.all([
      fetch(`/api/post-drafts?workspaceId=${selectedWorkspaceId}`),
      fetch(`/api/media-assets?workspaceId=${selectedWorkspaceId}`)
    ]);

    if (draftResponse.ok) {
      const draftData = await draftResponse.json();
      const nextDrafts = Array.isArray(draftData.drafts) ? draftData.drafts : [];
      setDrafts(nextDrafts);
      setSelectedPostDraftId((current) => (nextDrafts.some((draft: PostDraft) => draft.id === current) ? current : nextDrafts[0]?.id ?? ""));
    }

    if (assetResponse.ok) {
      const assetData = await assetResponse.json();
      setAssets(Array.isArray(assetData.assets) ? assetData.assets : []);
    }
  }

  useEffect(() => {
    void loadData();
  }, [selectedWorkspaceId]);

  useEffect(() => {
    return () => {
      selectedImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, [selectedImages]);

  async function selectFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length !== files.length) {
      setMessage("Only image files can be uploaded.");
    }
    const measuredImages = await Promise.all(imageFiles.map(readImageDimensions));
    setSelectedImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return measuredImages;
    });
    setMessage(`${measuredImages.length} image${measuredImages.length === 1 ? "" : "s"} ready to upload.`);
  }

  async function uploadImages() {
    if (!selectedPostDraftId || selectedImages.length === 0) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("workspaceId", selectedWorkspaceId);
    formData.append("postDraftId", selectedPostDraftId);
    formData.append(
      "metadata",
      JSON.stringify(selectedImages.map((image) => ({ name: image.file.name, width: image.width, height: image.height })))
    );
    selectedImages.forEach((image) => formData.append("files", image.file));

    const response = await fetch("/api/media-assets", {
      method: "POST",
      body: formData
    });
    const result = await response.json().catch(() => ({}));
    setIsUploading(false);

    if (!response.ok) {
      setMessage(result.error ?? "Image upload failed.");
      return;
    }

    setSelectedImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
    setMessage(`Uploaded ${result.assets?.length ?? selectedImages.length} image asset${selectedImages.length === 1 ? "" : "s"}.`);
    await loadData();
  }

  return (
    <Shell title="Assets" subtitle="Manual image uploads and generated asset records linked to post drafts.">
      <Panel>
        <div className={sectionHeadingClass}>
          <div>
            <h2 className="m-0 text-lg font-bold">Manual Image Uploads</h2>
            <p className={fieldNoteClass}>Attach one or more image files to a saved draft variant.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[921px]:grid-cols-[minmax(280px,420px)_1fr]">
          <div className="rounded-lg border border-line bg-white p-3.5">
            <label>
              Draft variant
              <span className="relative block">
                <select
                  className="appearance-none pr-10"
                  value={selectedPostDraftId}
                  onChange={(event) => setSelectedPostDraftId(event.target.value)}
                >
                  {draftOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                  size={18}
                />
              </span>
            </label>
            {selectedDraft ? (
              <p className={`${fieldNoteClass} mt-2`}>
                Target: {platformLabel(selectedDraft.platform)} - {platformListLabel([selectedDraft.platform])}
              </p>
            ) : (
              <p className={`${fieldNoteClass} mt-2`}>Save a draft before uploading assets.</p>
            )}
            <label className="mt-4 flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-blue-300 bg-blue-50 px-4 py-5 text-center">
              <ImageIcon className="mb-2 text-accent" size={28} />
              <strong>Choose images</strong>
              <span className={fieldNoteClass}>PNG, JPG, WebP, GIF, or SVG. Multiple files are supported.</span>
              <input
                accept="image/*"
                className="sr-only"
                multiple
                onChange={(event) => void selectFiles(event.target.files)}
                type="file"
              />
            </label>
            <Button
              className="mt-4 w-full"
              disabled={!selectedPostDraftId || selectedImages.length === 0 || isUploading}
              onClick={() => void uploadImages()}
              type="button"
            >
              <Upload size={16} /> {isUploading ? "Uploading..." : "Upload selected images"}
            </Button>
          </div>
          <div className="rounded-lg border border-line bg-white p-3.5">
            <h2 className="m-0 text-lg font-bold">Selected Images</h2>
            {selectedImages.length > 0 ? (
              <div className="mt-3 grid grid-cols-1 gap-3 min-[700px]:grid-cols-2">
                {selectedImages.map((image) => (
                  <div className="rounded-lg border border-line p-2" key={`${image.file.name}-${image.previewUrl}`}>
                    <div className="relative overflow-hidden rounded-md bg-[#f8fafc]" style={{ aspectRatio: `${image.width}/${image.height}` }}>
                      <Image alt={image.file.name} className="object-contain" fill src={image.previewUrl} unoptimized />
                    </div>
                    <div className="mt-2 text-sm font-semibold">{image.file.name}</div>
                    <div className={fieldNoteClass}>
                      {image.width}x{image.height} - {(image.file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-muted">No images selected yet.</p>
            )}
          </div>
        </div>
        <Notice className="mt-4">{message}</Notice>
      </Panel>

      <Panel className="mt-4">
        <div className={sectionHeadingClass}>
          <div>
            <h2 className="m-0 text-lg font-bold">Asset Library</h2>
            <p className={fieldNoteClass}>Generated and manually uploaded image assets for the selected workspace.</p>
          </div>
        </div>
        {assets.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 min-[921px]:grid-cols-3">
            {assets.map((asset) => (
              <article className="rounded-lg border border-line bg-white p-3.5" key={asset.id}>
                <div className="relative overflow-hidden rounded-lg border border-blue-200 bg-blue-50" style={{ aspectRatio: `${asset.width}/${asset.height}` }}>
                  <Image alt={assetTitle(asset)} className="object-contain" fill src={asset.url} unoptimized />
                </div>
                <h2 className="mt-3.5 text-lg font-bold">{assetTitle(asset)}</h2>
                <p className={fieldNoteClass}>
                  {platformLabel(asset.draft?.platform ?? "asset")} - {asset.width}x{asset.height} - {asset.status.replace("_", " ")}
                </p>
                <p className="break-all text-sm">{asset.url}</p>
              </article>
            ))}
          </div>
        ) : (
          <Notice>No assets are available for this workspace yet.</Notice>
        )}
      </Panel>
    </Shell>
  );
}
