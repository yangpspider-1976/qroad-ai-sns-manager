"use client";

import Image from "next/image";
import { ChevronDown, ImageIcon, Layers, Save, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RiskBadge, StatusBadge } from "./status-badge";
import type { Platform, PostDraft } from "@/lib/types";
import { Button, Notice, actionsClass, fieldNoteClass, sectionHeadingClass } from "./ui";

type DraftAsset = {
  id: string;
  postDraftId: string;
  url: string;
  prompt?: string;
  width: number;
  height: number;
  status: string;
  draft?: {
    platform: Platform;
  };
};

type SelectedImage = {
  file: File;
  width: number;
  height: number;
  previewUrl: string;
};

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

function uniqueAssets(assets: DraftAsset[]) {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    const key = asset.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const previewMaxHeight = 320;

const platformPreview: Record<Platform, { label: string; aspectRatio: string; ratio: number; hint: string }> = {
  facebook: { label: "Facebook", aspectRatio: "1200 / 630", ratio: 1200 / 630, hint: "Feed image preview" },
  instagram: { label: "Instagram", aspectRatio: "1 / 1", ratio: 1, hint: "Square post preview" },
  tiktok: { label: "TikTok", aspectRatio: "9 / 16", ratio: 9 / 16, hint: "Vertical cover preview" }
};

export function DraftCard({
  draft,
  editable = false,
  onDraftChange,
  saveEnabled = true,
  showWarnings = true,
  titleOverride,
  assetUploadEnabled = false,
  platformDrafts
}: {
  draft: PostDraft;
  editable?: boolean;
  onDraftChange?: (draft: PostDraft) => void;
  saveEnabled?: boolean;
  showWarnings?: boolean;
  titleOverride?: string;
  assetUploadEnabled?: boolean;
  platformDrafts?: PostDraft[];
}) {
  const [caption, setCaption] = useState(draft.caption);
  const [hashtags, setHashtags] = useState(draft.hashtags.join(" "));
  const [message, setMessage] = useState("");
  const [showAssetDetails, setShowAssetDetails] = useState(false);
  const [assets, setAssets] = useState<DraftAsset[]>([]);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isUploadingAssets, setIsUploadingAssets] = useState(false);
  const [isRemovingAssets, setIsRemovingAssets] = useState(false);
  const [activePlatform, setActivePlatform] = useState<Platform>(draft.platform);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPersistedDraft = !draft.id.startsWith("preview_");
  const platformDraftOptions = platformDrafts?.length ? platformDrafts : [draft];
  const activeDraft = platformDraftOptions.find((item) => item.platform === activePlatform) ?? platformDraftOptions[0] ?? draft;
  const activePreview = platformPreview[activeDraft.platform];
  const previewAssets = assets;
  const uploadedAssetCount = assets.length;
  const previewImage = selectedImages[0]
    ? { alt: selectedImages[0].file.name, src: selectedImages[0].previewUrl }
    : previewAssets[0]
      ? { alt: previewAssets[0].prompt ?? `${activePreview.label} uploaded image`, src: previewAssets[0].url }
      : null;
  const imageCount = selectedImages.length > 0 ? selectedImages.length : previewAssets.length;
  const hasRemovableImages = imageCount > 0;
  const previewFrameClass =
    activeDraft.platform === "facebook"
      ? "border-line bg-[#eef6ff]"
      : "border-slate-900 bg-black";
  const previewFrameStyle = {
    aspectRatio: activePreview.aspectRatio,
    maxWidth: `min(100%, ${Math.round(activePreview.ratio * previewMaxHeight)}px)`
  };

  useEffect(() => {
    setCaption(draft.caption);
    setHashtags(draft.hashtags.join(" "));
    setMessage("");
    setShowAssetDetails(false);
    setActivePlatform(draft.platform);
    setSelectedImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
  }, [draft.id, draft.caption, draft.hashtags]);

  useEffect(() => {
    async function loadAssets() {
      if (!isPersistedDraft) {
        setAssets([]);
        return;
      }
      const response = await fetch(`/api/media-assets?workspaceId=${draft.workspaceId}&briefId=${draft.briefId}`);
      if (!response.ok) return;
      const data = await response.json();
      setAssets(uniqueAssets(Array.isArray(data.assets) ? data.assets : []));
    }

    void loadAssets();
  }, [draft.briefId, draft.workspaceId, isPersistedDraft]);

  useEffect(() => {
    return () => {
      selectedImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, [selectedImages]);

  async function saveDraft() {
    const hadPendingImages = selectedImages.length > 0;
    if (hadPendingImages) {
      const uploaded = await uploadImages();
      if (!uploaded) return;
    }

    const response = await fetch(`/api/post-drafts/brief/${draft.briefId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption,
        hashtags: hashtags
          .split(/\s+/)
          .map((tag) => tag.trim())
          .filter(Boolean)
      })
    });
    setMessage(response.ok ? `Draft${hadPendingImages ? " and images" : ""} saved to database.` : "Draft save failed.");
  }

  function updateCaption(value: string) {
    setCaption(value);
    onDraftChange?.({ ...draft, caption: value, hashtags: hashtags.split(/\s+/).filter(Boolean) });
  }

  function updateHashtags(value: string) {
    setHashtags(value);
    onDraftChange?.({
      ...draft,
      caption,
      hashtags: value
        .split(/\s+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    });
  }

  async function selectImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const measuredImages = await Promise.all(imageFiles.map(readImageDimensions));
    setSelectedImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return measuredImages;
    });
    setMessage(`${measuredImages.length} image${measuredImages.length === 1 ? "" : "s"} ready to upload.`);
  }

  async function uploadImages() {
    if (!isPersistedDraft || activeDraft.id.startsWith("preview_") || selectedImages.length === 0) return false;
    const uploadCount = selectedImages.length;
    setIsUploadingAssets(true);
    const formData = new FormData();
    formData.append("workspaceId", activeDraft.workspaceId);
    formData.append("briefId", draft.briefId);
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
    setIsUploadingAssets(false);
    if (!response.ok) {
      setMessage(result.error ?? "Image upload failed.");
      return false;
    }

    const assetResponse = await fetch(`/api/media-assets?workspaceId=${draft.workspaceId}&briefId=${draft.briefId}`);
    if (assetResponse.ok) {
      const data = await assetResponse.json();
      setAssets(uniqueAssets(Array.isArray(data.assets) ? data.assets : []));
    }
    setSelectedImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setMessage(
      `Uploaded ${uploadCount} image${uploadCount === 1 ? "" : "s"} for ${platformDraftOptions.length} platform preview${platformDraftOptions.length === 1 ? "" : "s"}.`
    );
    return true;
  }

  async function removeUploadedImages() {
    if (!hasRemovableImages) return;
    if (selectedImages.length > 0) {
      setSelectedImages((current) => {
        current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        return [];
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
    if (uploadedAssetCount === 0) {
      setMessage("Cleared selected image files.");
      return;
    }
    setIsRemovingAssets(true);
    const response = await fetch("/api/media-assets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: draft.workspaceId,
        briefId: draft.briefId
      })
    });
    const result = await response.json().catch(() => ({}));
    setIsRemovingAssets(false);
    if (!response.ok) {
      setMessage(result.error ?? "Image removal failed.");
      return;
    }
    setAssets([]);
    setMessage(`Removed ${uploadedAssetCount} uploaded image record${uploadedAssetCount === 1 ? "" : "s"}.`);
  }

  return (
    <article className="">
      <div className={sectionHeadingClass}>
        <div>
          <h2 className="m-0 text-lg font-bold capitalize">{titleOverride ?? draft.platform}</h2>
          <p className={fieldNoteClass}>{draft.cta}</p>
        </div>
        <div className={actionsClass}>
          <StatusBadge status={draft.status} />
          <RiskBadge risk={draft.qualityScore.riskLevel} />
        </div>
      </div>
      <label>
        Caption
        <textarea value={caption} onChange={(event) => updateCaption(event.target.value)} readOnly={!editable} />
      </label>
      <div className="mt-3.5 grid gap-4">
        <div>
          <strong>Hashtags</strong>
          {editable ? (
            <input value={hashtags} onChange={(event) => updateHashtags(event.target.value)} />
          ) : (
            <p className={fieldNoteClass}>{hashtags}</p>
          )}
        </div>
        <div className="grid gap-3 rounded-lg border border-line bg-[#f8fafc] p-3.5">
          <div>
            <strong>Uploaded Images</strong>
            <p className={fieldNoteClass}>
              Review and upload images by platform.
            </p>
          </div>
          <div className="inline-flex w-fit rounded-lg border border-line bg-white p-1">
            {platformDraftOptions.map((option) => {
              const isActive = activeDraft.platform === option.platform;
              return (
                <button
                  aria-pressed={isActive}
                  className={`inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-4 text-sm font-medium transition ${
                    isActive ? "bg-[#ebebeb] text-ink" : "text-muted hover:bg-[#f8fafc] hover:text-ink"
                  }`}
                  key={option.id}
                  onClick={() => setActivePlatform(option.platform)}
                  type="button"
                >
                  {platformPreview[option.platform].label}
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 min-[921px]:grid-cols-2">
            <div className="grid gap-3 rounded-lg border border-line bg-white p-3">
              <div>
                <strong>{assetUploadEnabled ? "Choose image files" : `${activePreview.label} images`}</strong>
                <p className={fieldNoteClass}>
                  {assetUploadEnabled ? "Upload once and preview the image across each platform tab." : "Submitted images for manager review."}
                </p>
              </div>
              {assetUploadEnabled ? (
                <>
              {isPersistedDraft && !activeDraft.id.startsWith("preview_") ? (
                <>
                  <label className="flex min-h-[104px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-blue-300 bg-blue-50 px-4 py-4 text-center">
                    <ImageIcon className="mb-2 text-accent" size={24} />
                    <strong>Choose image files</strong>
                    <span className={fieldNoteClass}>Single or multiple uploads for all selected platforms.</span>
                    <input
                      accept="image/*"
                      className="sr-only"
                      multiple
                      onChange={(event) => void selectImages(event.target.files)}
                      ref={fileInputRef}
                      type="file"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      className="w-full"
                      disabled={selectedImages.length === 0 || isUploadingAssets}
                      onClick={() => void uploadImages()}
                      type="button"
                      variant="secondary"
                    >
                      <Upload size={16} /> {isUploadingAssets ? "Uploading..." : "Upload image"}
                    </Button>
                    <button
                      className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 font-medium leading-[1.2] text-danger no-underline hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={!hasRemovableImages || isRemovingAssets}
                      onClick={() => void removeUploadedImages()}
                      type="button"
                    >
                      <Trash2 size={16} /> {isRemovingAssets ? "Removing..." : "Remove images"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="m-0 text-muted">Save the draft set before uploading images.</p>
              )}
                </>
              ) : previewAssets.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {previewAssets.map((asset) => (
                    <div className="rounded-lg border border-line bg-[#f8fafc] p-2" key={asset.id}>
                      <div className="relative overflow-hidden rounded-md bg-[#eef2ff]" style={{ aspectRatio: `${asset.width}/${asset.height}` }}>
                        <Image alt={asset.prompt ?? "Uploaded draft asset"} className="object-contain" fill src={asset.url} unoptimized />
                      </div>
                      <div className={`${fieldNoteClass} mt-2`}>{asset.width}x{asset.height}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-[120px] place-items-center rounded-lg border border-dashed border-line bg-[#f8fafc] p-5 text-center text-muted">
                  No images submitted for this platform.
                </div>
              )}
            </div>
            <div className="rounded-lg border border-line bg-white p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <strong>{activePreview.label} preview</strong>
                  <p className={fieldNoteClass}>{activePreview.hint}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-accent-dark">
                  {imageCount} {selectedImages.length > 0 ? "selected" : "uploaded"}
                </span>
              </div>
              <div className="grid min-h-[360px] place-items-center overflow-hidden rounded-lg border border-line bg-[#f8fafc] p-4">
                <div className={`relative w-full overflow-hidden rounded-md border ${previewFrameClass}`} style={previewFrameStyle}>
                  {previewImage ? (
                    <img alt={previewImage.alt} className="absolute inset-0 h-full w-full object-contain" src={previewImage.src} />
                  ) : (
                    <div
                      className={`absolute inset-0 grid place-items-center p-5 text-center ${
                        activeDraft.platform === "facebook" ? "text-muted" : "text-slate-100"
                      }`}
                    >
                      <span className="max-w-[80%] leading-6">No {activePreview.label} image selected.</span>
                    </div>
                  )}
                </div>
                {previewImage ? (
                  <div className="mt-3 text-center text-xs text-muted">
                    Fitted to {activePreview.label} preview without cropping.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 max-[920px]:grid-cols-2">
          <div className="inline-flex min-h-6 items-center rounded-full bg-blue-100 px-2 py-[3px] text-xs font-bold text-accent-dark">
            Hook {draft.qualityScore.hook}/10
          </div>
          <div className="inline-flex min-h-6 items-center rounded-full bg-blue-100 px-2 py-[3px] text-xs font-bold text-accent-dark">
            Clarity {draft.qualityScore.clarity}/10
          </div>
          <div className="inline-flex min-h-6 items-center rounded-full bg-blue-100 px-2 py-[3px] text-xs font-bold text-accent-dark">
            CTA {draft.qualityScore.cta}/10
          </div>
          <div className="inline-flex min-h-6 items-center rounded-full bg-blue-100 px-2 py-[3px] text-xs font-bold text-accent-dark">
            Fit {draft.qualityScore.platformFit}/10
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink hover:border-blue-200 hover:bg-blue-50"
            onClick={() => setShowAssetDetails((current) => !current)}
            type="button"
          >
            <Layers size={15} />
            {showAssetDetails ? "Hide image text and script" : "Show image text and script"}
            <ChevronDown className={`transition-transform ${showAssetDetails ? "rotate-180" : ""}`} size={15} />
          </button>
        </div>
      </div>
      {showAssetDetails ? (
        <div className="mt-3.5 grid gap-3 rounded-lg border border-line bg-[#f8fafc] p-3.5">
          <div>
          <strong>Image Text</strong>
          <div className="mt-2 grid gap-2 min-[921px]:grid-cols-3">
            <div className="rounded-lg border border-line bg-white p-3">
              <span className={fieldNoteClass}>Headline</span>
              <p className="m-0 font-semibold">{draft.imageText.headline}</p>
            </div>
            <div className="rounded-lg border border-line bg-white p-3">
              <span className={fieldNoteClass}>Subtitle</span>
              <p className="m-0">{draft.imageText.subtitle}</p>
            </div>
            <div className="rounded-lg border border-line bg-white p-3">
              <span className={fieldNoteClass}>CTA Button</span>
              <p className="m-0 font-semibold">{draft.imageText.buttonText}</p>
            </div>
          </div>
          </div>
          <div>
          <strong>Short-Form Video Script</strong>
          <div className="mt-2 grid gap-2">
            <div className="rounded-lg border border-line bg-white p-3">
              <span className={fieldNoteClass}>Hook</span>
              <p className="m-0 font-semibold">{draft.videoScript.hook}</p>
            </div>
            <div className="rounded-lg border border-line bg-white p-3">
              <span className={fieldNoteClass}>Scenes</span>
              <ol className="m-0 mt-2 grid gap-1 pl-5">
                {draft.videoScript.scenes.map((scene, index) => (
                  <li key={`${draft.id}-scene-${index}`}>{scene}</li>
                ))}
              </ol>
            </div>
            <div className="grid gap-2 min-[921px]:grid-cols-2">
              <div className="rounded-lg border border-line bg-white p-3">
                <span className={fieldNoteClass}>Voiceover</span>
                <p className="m-0">{draft.videoScript.voiceover}</p>
              </div>
              <div className="rounded-lg border border-line bg-white p-3">
                <span className={fieldNoteClass}>Thumbnail Text</span>
                <p className="m-0 font-semibold">{draft.videoScript.thumbnailText}</p>
              </div>
            </div>
          </div>
          </div>
        </div>
      ) : null}
      {showWarnings ? (
        <Notice tone="warning" className="mt-3.5">
          {draft.qualityScore.warnings.join(" ")}
        </Notice>
      ) : null}
      {editable && saveEnabled ? (
        <div className="mt-3.5 flex items-center justify-between gap-3">
          <Button onClick={saveDraft} type="button" variant="secondary">
            <Save size={16} /> Save draft
          </Button>
          {message ? <span className={fieldNoteClass}>{message}</span> : null}
        </div>
      ) : null}
    </article>
  );
}
