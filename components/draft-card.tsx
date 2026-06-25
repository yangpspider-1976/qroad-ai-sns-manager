"use client";

import Image from "next/image";
import { ChevronDown, ImageIcon, Layers, Save, X } from "lucide-react";
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
  draft?: { platform: Platform };
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
    image.onload = () =>
      resolve({ file, width: image.naturalWidth, height: image.naturalHeight, previewUrl });
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
    if (seen.has(asset.url)) return false;
    seen.add(asset.url);
    return true;
  });
}

// ─── DraftCard ───────────────────────────────────────────────────────────────

export function DraftCard({
  draft,
  editable = false,
  onDraftChange,
  onSave,
  saveEnabled = true,
  showWarnings = false,
  titleOverride,
  assetUploadEnabled = false,
}: {
  draft: PostDraft;
  editable?: boolean;
  onDraftChange?: (draft: PostDraft) => void;
  onSave?: () => Promise<void>;
  saveEnabled?: boolean;
  showWarnings?: boolean;
  titleOverride?: string;
  assetUploadEnabled?: boolean;
  platformDrafts?: PostDraft[]; // accepted by callers; unused in component body
}) {
  const [caption, setCaption] = useState(draft.caption);
  const [hashtags, setHashtags] = useState(draft.hashtags.join(" "));
  const [message, setMessage] = useState("");
  const [showAssetDetails, setShowAssetDetails] = useState(false);
  const [assets, setAssets] = useState<DraftAsset[]>([]);
  const isPersistedDraft = !draft.id.startsWith("preview_");

  useEffect(() => {
    setCaption(draft.caption);
    setHashtags(draft.hashtags.join(" "));
    setMessage("");
    setShowAssetDetails(false);
  }, [draft.id, draft.caption, draft.hashtags]);

  useEffect(() => {
    async function loadAssets() {
      // Only load for read-only display (approvals). Content Studio uses DraftImagePanel.
      if (assetUploadEnabled || !isPersistedDraft) {
        setAssets([]);
        return;
      }
      const response = await fetch(
        `/api/media-assets?workspaceId=${draft.workspaceId}&briefId=${draft.briefId}`
      );
      if (!response.ok) return;
      const data = await response.json();
      setAssets(uniqueAssets(Array.isArray(data.assets) ? data.assets : []));
    }
    void loadAssets();
  }, [assetUploadEnabled, draft.briefId, draft.workspaceId, isPersistedDraft]);

  async function saveDraft() {
    const response = await fetch(`/api/post-drafts/brief/${draft.briefId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption,
        hashtags: hashtags
          .split(/\s+/)
          .map((tag) => tag.trim())
          .filter(Boolean),
      }),
    });
    if (response.ok) {
      await onSave?.();
      setMessage("Draft saved to database.");
    } else {
      setMessage("Draft save failed.");
    }
  }

  function updateCaption(value: string) {
    setCaption(value);
    onDraftChange?.({
      ...draft,
      caption: value,
      hashtags: hashtags.split(/\s+/).filter(Boolean),
    });
  }

  function updateHashtags(value: string) {
    setHashtags(value);
    onDraftChange?.({
      ...draft,
      caption,
      hashtags: value
        .split(/\s+/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
  }

  const textContent = (
    <>
      <div className={sectionHeadingClass}>
        <div>
          <h2 className="m-0 text-lg font-bold capitalize">
            {titleOverride ?? draft.platform}
          </h2>
          <p className={fieldNoteClass}>{draft.cta}</p>
        </div>
        <div className={actionsClass}>
          <StatusBadge status={draft.status} />
          <RiskBadge risk={draft.qualityScore.riskLevel} />
        </div>
      </div>
      <label>
        Caption
        <textarea
          value={caption}
          onChange={(event) => updateCaption(event.target.value)}
          readOnly={!editable}
        />
      </label>
      <div className="mt-3.5 grid gap-4">
        <div>
          <strong>Hashtags</strong>
          {editable ? (
            <input
              value={hashtags}
              onChange={(event) => updateHashtags(event.target.value)}
            />
          ) : (
            <p className={fieldNoteClass}>{hashtags}</p>
          )}
        </div>
        {!assetUploadEnabled && assets.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {assets.map((asset) => (
              <div className="rounded-lg border border-line bg-[#f8fafc] p-2" key={asset.id}>
                <div
                  className="relative overflow-hidden rounded-md bg-[#eef2ff]"
                  style={{ aspectRatio: `${asset.width}/${asset.height}` }}
                >
                  <Image
                    alt={asset.prompt ?? "Uploaded draft asset"}
                    className="object-contain"
                    fill
                    src={asset.url}
                    unoptimized
                  />
                </div>
                <div className={`${fieldNoteClass} mt-2`}>
                  {asset.width}x{asset.height}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-4 gap-3 max-[920px]:grid-cols-2">
          <div className="inline-flex min-h-6 items-center rounded-full bg-blue-100 px-2 py-0.75 text-xs font-bold text-accent-dark">
            Hook {draft.qualityScore.hook}/10
          </div>
          <div className="inline-flex min-h-6 items-center rounded-full bg-blue-100 px-2 py-0.75 text-xs font-bold text-accent-dark">
            Clarity {draft.qualityScore.clarity}/10
          </div>
          <div className="inline-flex min-h-6 items-center rounded-full bg-blue-100 px-2 py-0.75 text-xs font-bold text-accent-dark">
            CTA {draft.qualityScore.cta}/10
          </div>
          <div className="inline-flex min-h-6 items-center rounded-full bg-blue-100 px-2 py-0.75 text-xs font-bold text-accent-dark">
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
            <ChevronDown
              className={`transition-transform ${showAssetDetails ? "rotate-180" : ""}`}
              size={15}
            />
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
    </>
  );

  return <article>{textContent}</article>;
}

// ─── DraftImagePanel ──────────────────────────────────────────────────────────

export function DraftImagePanel({
  draft,
  onPendingRemovalChange,
}: {
  draft: PostDraft;
  onPendingRemovalChange?: (pending: boolean) => void;
}) {
  const [assets, setAssets] = useState<DraftAsset[]>([]);
  const [stagedImages, setStagedImages] = useState<SelectedImage[]>([]);
  const [pendingRemoval, setPendingRemoval] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPersistedDraft = !draft.id.startsWith("preview_");

  const displayImage = stagedImages[0]
    ? { alt: stagedImages[0].file.name, src: stagedImages[0].previewUrl }
    : !pendingRemoval && assets[0]
      ? { alt: assets[0].prompt ?? "Uploaded image", src: assets[0].url }
      : null;

  useEffect(() => {
    setPendingRemoval(false);
    onPendingRemovalChange?.(false);
    setStagedImages((current) => {
      current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      return [];
    });
    async function loadAssets() {
      if (!isPersistedDraft) {
        setAssets([]);
        return;
      }
      const response = await fetch(
        `/api/media-assets?workspaceId=${draft.workspaceId}&briefId=${draft.briefId}`
      );
      if (!response.ok) return;
      const data = await response.json();
      setAssets(uniqueAssets(Array.isArray(data.assets) ? data.assets : []));
    }
    void loadAssets();
  }, [draft.id, draft.briefId, draft.workspaceId, isPersistedDraft]);

  useEffect(() => {
    return () => {
      stagedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, [stagedImages]);

  async function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    const measured = await Promise.all(imageFiles.map(readImageDimensions));

    setStagedImages((current) => {
      current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      return measured;
    });

    if (!isPersistedDraft) return; // Show local preview only; upload after saving draft set

    setIsUploading(true);

    // Replace any existing DB assets
    if (assets.length > 0 || pendingRemoval) {
      await fetch("/api/media-assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: draft.workspaceId, briefId: draft.briefId }),
      });
      setAssets([]);
      setPendingRemoval(false);
      onPendingRemovalChange?.(false);
    }

    const formData = new FormData();
    formData.append("workspaceId", draft.workspaceId);
    formData.append("briefId", draft.briefId);
    formData.append(
      "metadata",
      JSON.stringify(
        measured.map((img) => ({ name: img.file.name, width: img.width, height: img.height }))
      )
    );
    measured.forEach((img) => formData.append("files", img.file));

    const response = await fetch("/api/media-assets", { method: "POST", body: formData });
    setIsUploading(false);

    if (!response.ok) return; // Keep local preview; user can retry by selecting again

    const assetRes = await fetch(
      `/api/media-assets?workspaceId=${draft.workspaceId}&briefId=${draft.briefId}`
    );
    if (assetRes.ok) {
      const data = await assetRes.json();
      setAssets(uniqueAssets(Array.isArray(data.assets) ? data.assets : []));
    }
    setStagedImages((current) => {
      current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      return [];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemove() {
    if (stagedImages.length > 0) {
      setStagedImages((current) => {
        current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        return [];
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    // Mark DB assets as pending removal — no API call; refresh will restore the image
    if (assets.length > 0) {
      setPendingRemoval(true);
      onPendingRemovalChange?.(true);
    }
  }

  return (
    <div>
      {displayImage ? (
        <div style={{ position: "relative" }}>
          <div className="overflow-hidden rounded-lg border border-line bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={displayImage.alt}
              className="block w-full object-contain"
              src={displayImage.src}
            />
          </div>
          {isUploading ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,255,255,0.75)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
              }}
            >
              <span className={fieldNoteClass}>Uploading…</span>
            </div>
          ) : null}
          <button
            onClick={handleRemove}
            type="button"
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "rgba(0,0,0,0.65)",
              color: "white",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label
          className="flex min-h-50 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-blue-300 bg-blue-50 px-4 py-8 text-center transition hover:bg-blue-100"
          style={isUploading ? { opacity: 0.6, pointerEvents: "none" } : undefined}
        >
          <ImageIcon className="mb-2 text-accent" size={28} />
          <strong className="text-sm">{isUploading ? "Uploading…" : "Click to upload"}</strong>
          <span className={`${fieldNoteClass} mt-1`}>Shared across all platforms.</span>
          <input
            accept="image/*"
            className="sr-only"
            multiple
            onChange={(e) => void handleFileSelect(e.target.files)}
            ref={fileInputRef}
            type="file"
            disabled={isUploading}
          />
        </label>
      )}
      {!isPersistedDraft ? (
        <p className={`${fieldNoteClass} mt-2`}>
          {stagedImages.length > 0
            ? "Save the draft set to upload this image."
            : "Save the draft set first, then upload an image here."}
        </p>
      ) : null}
    </div>
  );
}
