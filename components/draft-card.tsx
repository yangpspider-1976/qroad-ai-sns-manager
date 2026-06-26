"use client";

import Image from "next/image";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Layers,
  Save,
  X,
} from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { RiskBadge, StatusBadge } from "./status-badge";
import type { Platform, PostDraft } from "@/lib/types";
import {
  Button,
  Notice,
  actionsClass,
  fieldNoteClass,
  sectionHeadingClass,
} from "./ui";

type DraftAsset = {
  id: string;
  duplicateAssetIds?: string[];
  postDraftId: string;
  url: string;
  prompt?: string;
  width: number;
  height: number;
  status: string;
  createdAt?: string;
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
      resolve({
        file,
        width: image.naturalWidth,
        height: image.naturalHeight,
        previewUrl,
      });
    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error(`Unable to read image dimensions for ${file.name}.`));
    };
    image.src = previewUrl;
  });
}

function uniqueAssets(assets: DraftAsset[]) {
  const uniqueByUrl = new Map<string, DraftAsset>();
  const orderedAssets = assets
    .map((asset, index) => ({ asset, index }))
    .sort((left, right) => {
      if (!left.asset.createdAt || !right.asset.createdAt) {
        return left.index - right.index;
      }
      return (
        new Date(left.asset.createdAt).getTime() -
        new Date(right.asset.createdAt).getTime()
      );
    })
    .map(({ asset }) => asset);

  orderedAssets.forEach((asset) => {
    const existing = uniqueByUrl.get(asset.url);
    if (existing) {
      existing.duplicateAssetIds = [
        ...(existing.duplicateAssetIds ?? [existing.id]),
        asset.id,
      ];
      return;
    }
    uniqueByUrl.set(asset.url, { ...asset, duplicateAssetIds: [asset.id] });
  });
  return Array.from(uniqueByUrl.values());
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
  showAssetThumbnails = true,
  hideHeader = false,
}: {
  draft: PostDraft;
  editable?: boolean;
  onDraftChange?: (draft: PostDraft) => void;
  onSave?: () => Promise<void>;
  saveEnabled?: boolean;
  showWarnings?: boolean;
  titleOverride?: string;
  assetUploadEnabled?: boolean;
  showAssetThumbnails?: boolean;
  hideHeader?: boolean;
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
        `/api/media-assets?workspaceId=${draft.workspaceId}&briefId=${draft.briefId}`,
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
      {!hideHeader ? (
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
      ) : null}
      <label>
        Caption
        <textarea
          value={caption}
          onChange={(event) => updateCaption(event.target.value)}
          readOnly={!editable}
        />
      </label>
      <div className="mt-3.5 grid gap-4">
        <label>
          Hashtags
          {editable ? (
            <input
              value={hashtags}
              onChange={(event) => updateHashtags(event.target.value)}
            />
          ) : (
            <p className={fieldNoteClass}>{hashtags}</p>
          )}
        </label>
        {showAssetThumbnails && !assetUploadEnabled && assets.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {assets.map((asset) => (
              <div
                className="rounded-lg border border-line bg-[#f8fafc] p-2"
                key={asset.id}
              >
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
          <div className="inline-flex min-h-6 items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-accent-dark">
            Hook {draft.qualityScore.hook}/10
          </div>
          <div className="inline-flex min-h-6 items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-accent-dark">
            Clarity {draft.qualityScore.clarity}/10
          </div>
          <div className="inline-flex min-h-6 items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-accent-dark">
            CTA {draft.qualityScore.cta}/10
          </div>
          <div className="inline-flex min-h-6 items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-accent-dark">
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
            {showAssetDetails
              ? "Hide image text and script"
              : "Show image text and script"}
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
                <p className="m-0 font-semibold">
                  {draft.imageText.buttonText}
                </p>
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
                  <p className="m-0 font-semibold">
                    {draft.videoScript.thumbnailText}
                  </p>
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

export interface DraftImagePanelHandle {
  commit(): Promise<void>;
}

export const DraftImagePanel = forwardRef<
  DraftImagePanelHandle,
  { draft: PostDraft; className?: string; maxPreviewHeight?: number; readOnly?: boolean }
>(function DraftImagePanel({ draft, className = "", maxPreviewHeight, readOnly = false }, ref) {
  const [assets, setAssets] = useState<DraftAsset[]>([]);
  const [stagedImages, setStagedImages] = useState<SelectedImage[]>([]);
  const [pendingRemovalAssetIds, setPendingRemovalAssetIds] = useState<
    string[]
  >([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<{
    alt: string;
    src: string;
  } | null>(null);
  const [hoveredImageIndex, setHoveredImageIndex] = useState<number | null>(
    null,
  );
  const [isFullscreenCloseHovered, setIsFullscreenCloseHovered] =
    useState(false);
  const [hoveredRemoveImageIndex, setHoveredRemoveImageIndex] = useState<
    number | null
  >(null);
  const [hoveredCarouselButton, setHoveredCarouselButton] = useState<
    "previous" | "next" | null
  >(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stagedImagesRef = useRef<SelectedImage[]>([]);

  const isPersistedDraft = !draft.id.startsWith("preview_");
  const pendingRemovalAssetIdSet = new Set(pendingRemovalAssetIds);

  const displayImages =
    stagedImages.length > 0
      ? stagedImages.map((img) => ({
          alt: img.file.name,
          src: img.previewUrl,
          asset: null,
        }))
      : assets.length > 0
        ? assets
            .filter(
              (asset) =>
                !(asset.duplicateAssetIds ?? [asset.id]).some((id) =>
                  pendingRemovalAssetIdSet.has(id),
                ),
            )
            .map((asset) => ({
              alt: asset.prompt ?? "Uploaded image",
              src: asset.url,
              asset,
            }))
        : [];

  const hasPendingChanges =
    stagedImages.length > 0 || pendingRemovalAssetIds.length > 0;
  const activeImageSafeIndex =
    displayImages.length > 0
      ? Math.min(activeImageIndex, displayImages.length - 1)
      : 0;
  const activeImage = displayImages[activeImageSafeIndex];
  const hasMultipleImages = displayImages.length > 1;
  const fullscreenDisplayImage =
    fullscreenImage && activeImage ? activeImage : fullscreenImage;

  useEffect(() => {
    setPendingRemovalAssetIds([]);
    setActiveImageIndex(0);
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
        `/api/media-assets?workspaceId=${draft.workspaceId}&briefId=${draft.briefId}`,
      );
      if (!response.ok) return;
      const data = await response.json();
      setAssets(uniqueAssets(Array.isArray(data.assets) ? data.assets : []));
    }
    void loadAssets();
  }, [draft.id, draft.briefId, draft.workspaceId, isPersistedDraft]);

  useEffect(() => {
    stagedImagesRef.current = stagedImages;
  }, [stagedImages]);

  useEffect(() => {
    return () => {
      stagedImagesRef.current.forEach((img) =>
        URL.revokeObjectURL(img.previewUrl),
      );
    };
  }, []);

  useEffect(() => {
    if (activeImageIndex >= displayImages.length) {
      setActiveImageIndex(Math.max(displayImages.length - 1, 0));
    }
  }, [activeImageIndex, displayImages.length]);

  useEffect(() => {
    if (!fullscreenImage) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFullscreenImage(null);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [fullscreenImage]);

  useImperativeHandle(
    ref,
    () => ({
      async commit() {
        if (
          !isPersistedDraft ||
          (!stagedImages.length && pendingRemovalAssetIds.length === 0)
        )
          return;

        setIsUploading(true);

        // Delete existing DB assets when replacing or removing
        if (assets.length > 0 && stagedImages.length > 0) {
          await fetch("/api/media-assets", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId: draft.workspaceId,
              briefId: draft.briefId,
            }),
          });
          setAssets([]);
          setPendingRemovalAssetIds([]);
        } else if (pendingRemovalAssetIds.length > 0) {
          await fetch("/api/media-assets", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId: draft.workspaceId,
              assetIds: pendingRemovalAssetIds,
            }),
          });
          setAssets((current) =>
            current.filter(
              (asset) =>
                !(asset.duplicateAssetIds ?? [asset.id]).some((id) =>
                  pendingRemovalAssetIds.includes(id),
                ),
            ),
          );
          setPendingRemovalAssetIds([]);
        }

        if (stagedImages.length > 0) {
          const formData = new FormData();
          formData.append("workspaceId", draft.workspaceId);
          formData.append("briefId", draft.briefId);
          formData.append(
            "metadata",
            JSON.stringify(
              stagedImages.map((img) => ({
                name: img.file.name,
                width: img.width,
                height: img.height,
              })),
            ),
          );
          stagedImages.forEach((img) => formData.append("files", img.file));

          const response = await fetch("/api/media-assets", {
            method: "POST",
            body: formData,
          });
          if (response.ok) {
            const assetRes = await fetch(
              `/api/media-assets?workspaceId=${draft.workspaceId}&briefId=${draft.briefId}`,
            );
            if (assetRes.ok) {
              const data = await assetRes.json();
              setAssets(
                uniqueAssets(Array.isArray(data.assets) ? data.assets : []),
              );
            }
            setStagedImages((current) => {
              current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
              return [];
            });
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        }

        setIsUploading(false);
      },
    }),
    [isPersistedDraft, stagedImages, pendingRemovalAssetIds, assets, draft],
  );

  async function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (imageFiles.length === 0) return;
    const measured = await Promise.all(imageFiles.map(readImageDimensions));
    setStagedImages((current) => {
      current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      return measured;
    });
    setActiveImageIndex(0);
  }

  function handleRemoveStagedImage(indexToRemove: number) {
    setStagedImages((current) =>
      current.filter((img, index) => {
        if (index === indexToRemove) {
          URL.revokeObjectURL(img.previewUrl);
          return false;
        }
        return true;
      }),
    );
    if (stagedImages.length === 1 && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleRemoveAsset(asset: DraftAsset) {
    setPendingRemovalAssetIds((current) =>
      Array.from(
        new Set([...current, ...(asset.duplicateAssetIds ?? [asset.id])]),
      ),
    );
    setActiveImageIndex((current) => Math.max(current - 1, 0));
  }

  function showPreviousImage() {
    setActiveImageIndex((current) =>
      current === 0 ? displayImages.length - 1 : current - 1,
    );
  }

  function showNextImage() {
    setActiveImageIndex((current) =>
      current === displayImages.length - 1 ? 0 : current + 1,
    );
  }

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      {activeImage ? (
        <div
          style={{
            position: "relative",
            display: "flex",
            flex: "1 1 auto",
            minHeight: 0,
            flexDirection: "column",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              flex: "1 1 auto",
              minHeight: 0,
              height: maxPreviewHeight ? `${Math.max(maxPreviewHeight, 180)}px` : "360px",
              maxHeight: maxPreviewHeight ? `${Math.max(maxPreviewHeight, 180)}px` : "360px",
            }}
          >
            <div
              onMouseEnter={() => setHoveredImageIndex(activeImageSafeIndex)}
              onMouseLeave={() => setHoveredImageIndex(null)}
              style={{
                position: "relative",
                display: "flex",
                flex: 1,
                minHeight: 0,
                overflow: "hidden",
                borderRadius: "8px",
                border: "1px solid var(--color-line)",
                background: "#fff",
              }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={activeImage.alt}
                  className="block h-full w-full cursor-pointer object-contain"
                  onClick={() =>
                    setFullscreenImage({
                      alt: activeImage.alt,
                      src: activeImage.src,
                    })
                  }
                  src={activeImage.src}
                />
                <button
                  aria-label={`Open ${activeImage.alt} fullscreen`}
                  onClick={() =>
                    setFullscreenImage({
                      alt: activeImage.alt,
                      src: activeImage.src,
                    })
                  }
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 1,
                    border: "none",
                    background:
                      hoveredImageIndex === activeImageSafeIndex
                        ? "rgba(0,0,0,0.14)"
                        : "rgba(0,0,0,0)",
                    cursor: "pointer",
                    padding: 0,
                    transition: "background 150ms ease",
                  }}
                  type="button"
                />
                {!readOnly && (stagedImages.length > 0 || activeImage.asset) ? (
                  <button
                    aria-label={`Remove ${activeImage.alt}`}
                    onMouseEnter={() =>
                      setHoveredRemoveImageIndex(activeImageSafeIndex)
                    }
                    onMouseLeave={() => setHoveredRemoveImageIndex(null)}
                    onClick={() =>
                      activeImage.asset
                        ? handleRemoveAsset(activeImage.asset)
                        : handleRemoveStagedImage(activeImageSafeIndex)
                    }
                    type="button"
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      zIndex: 2,
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background:
                        hoveredRemoveImageIndex === activeImageSafeIndex
                          ? "rgba(0,0,0,0.78)"
                          : "rgba(0,0,0,0.65)",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                      transition: "background 150ms ease",
                    }}
                  >
                    <X size={14} />
                  </button>
                ) : null}
                {hasMultipleImages ? (
                  <>
                    <button
                      aria-label="Previous image"
                      onMouseEnter={() =>
                        setHoveredCarouselButton("previous")
                      }
                      onMouseLeave={() => setHoveredCarouselButton(null)}
                      onClick={showPreviousImage}
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 2,
                        width: "36px",
                        height: "36px",
                        minHeight: "36px",
                        minWidth: "36px",
                        borderRadius: "999px",
                        border: "1px solid rgba(255,255,255,0.72)",
                        background:
                          hoveredCarouselButton === "previous"
                            ? "rgba(15,23,42,0.78)"
                            : "rgba(15,23,42,0.62)",
                        color: "#fff",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                        transition: "background 150ms ease",
                      }}
                      type="button"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        bottom: "12px",
                        transform: "translateX(-50%)",
                        zIndex: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        borderRadius: "999px",
                        background: "rgba(15,23,42,0.48)",
                        padding: "6px 8px",
                      }}
                    >
                      {displayImages.map((image, index) => (
                        <button
                          aria-label={`Show image ${index + 1}`}
                          key={`${image.src}-${index}`}
                          onClick={() => setActiveImageIndex(index)}
                          style={{
                            width: "8px",
                            height: "8px",
                            minHeight: "8px",
                            minWidth: "8px",
                            borderRadius: "999px",
                            border: "none",
                            background:
                              index === activeImageSafeIndex
                                ? "#fff"
                                : "rgba(255,255,255,0.44)",
                            cursor: "pointer",
                            padding: 0,
                          }}
                          type="button"
                        />
                      ))}
                    </div>
                    <button
                      aria-label="Next image"
                      onMouseEnter={() => setHoveredCarouselButton("next")}
                      onMouseLeave={() => setHoveredCarouselButton(null)}
                      onClick={showNextImage}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 2,
                        width: "36px",
                        height: "36px",
                        minHeight: "36px",
                        minWidth: "36px",
                        borderRadius: "999px",
                        border: "1px solid rgba(255,255,255,0.72)",
                        background:
                          hoveredCarouselButton === "next"
                            ? "rgba(15,23,42,0.78)"
                            : "rgba(15,23,42,0.62)",
                        color: "#fff",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                        transition: "background 150ms ease",
                      }}
                      type="button"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                ) : null}
            </div>
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
        </div>
      ) : readOnly ? (
        <div className="flex min-h-50 flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-[#f8fafc] px-4 py-8 text-center">
          <ImageIcon className="mb-2 text-muted" size={28} />
          <strong className="text-sm">No image uploaded</strong>
          <span className={`${fieldNoteClass} mt-1`}>
            Uploaded images will appear here for review.
          </span>
        </div>
      ) : (
        <label
          className="flex min-h-50 flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-blue-300 bg-blue-50 px-4 py-8 text-center transition hover:bg-blue-100"
          style={
            isUploading ? { opacity: 0.6, pointerEvents: "none" } : undefined
          }
        >
          <ImageIcon className="mb-2 text-accent" size={28} />
          <strong className="text-sm">
            {isUploading ? "Uploading…" : "Click to upload"}
          </strong>
          <span className={`${fieldNoteClass} mt-1`}>
            Shared across all platforms.
          </span>
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
      {fullscreenDisplayImage ? (
        <div
          aria-modal="true"
          onClick={() => setFullscreenImage(null)}
          role="dialog"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px",
            background: "rgba(0,0,0,0.88)",
          }}
        >
          <button
            aria-label="Close full image view"
            onMouseEnter={() => setIsFullscreenCloseHovered(true)}
            onMouseLeave={() => setIsFullscreenCloseHovered(false)}
            onClick={() => setFullscreenImage(null)}
            type="button"
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              zIndex: 1001,
              width: "44px",
              height: "44px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.46)",
              background: isFullscreenCloseHovered
                ? "rgba(255,255,255,0.18)"
                : "rgba(0,0,0,0.46)",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              transition: "background 150ms ease",
            }}
          >
            <X size={20} />
          </button>
          {hasMultipleImages ? (
            <>
              <button
                aria-label="Previous image"
                onMouseEnter={() => setHoveredCarouselButton("previous")}
                onMouseLeave={() => setHoveredCarouselButton(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  showPreviousImage();
                }}
                style={{
                  position: "fixed",
                  left: "24px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 1001,
                  width: "44px",
                  height: "44px",
                  minHeight: "44px",
                  minWidth: "44px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.46)",
                  background:
                    hoveredCarouselButton === "previous"
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(0,0,0,0.46)",
                  color: "#fff",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  transition: "background 150ms ease",
                }}
                type="button"
              >
                <ChevronLeft size={24} />
              </button>
              <div
                onClick={(event) => event.stopPropagation()}
                style={{
                  position: "fixed",
                  left: "50%",
                  bottom: "24px",
                  transform: "translateX(-50%)",
                  zIndex: 1001,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  borderRadius: "999px",
                  background: "rgba(0,0,0,0.48)",
                  padding: "8px 10px",
                }}
              >
                {displayImages.map((image, index) => (
                  <button
                    aria-label={`Show image ${index + 1}`}
                    key={`${image.src}-fullscreen-${index}`}
                    onClick={() => setActiveImageIndex(index)}
                    style={{
                      width: "9px",
                      height: "9px",
                      minHeight: "9px",
                      minWidth: "9px",
                      borderRadius: "999px",
                      border: "none",
                      background:
                        index === activeImageSafeIndex
                          ? "#fff"
                          : "rgba(255,255,255,0.42)",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    type="button"
                  />
                ))}
              </div>
              <button
                aria-label="Next image"
                onMouseEnter={() => setHoveredCarouselButton("next")}
                onMouseLeave={() => setHoveredCarouselButton(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  showNextImage();
                }}
                style={{
                  position: "fixed",
                  right: "24px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 1001,
                  width: "44px",
                  height: "44px",
                  minHeight: "44px",
                  minWidth: "44px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.46)",
                  background:
                    hoveredCarouselButton === "next"
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(0,0,0,0.46)",
                  color: "#fff",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  transition: "background 150ms ease",
                }}
                type="button"
              >
                <ChevronRight size={24} />
              </button>
            </>
          ) : null}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "min(980px, 78vw)",
              height: "min(760px, 78vh)",
              maxWidth: "calc(100vw - 96px)",
              maxHeight: "calc(100vh - 96px)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={fullscreenDisplayImage.alt}
              onClick={(event) => event.stopPropagation()}
              src={fullscreenDisplayImage.src}
              style={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
              }}
            />
          </div>
        </div>
      ) : null}
      {!readOnly && !isPersistedDraft && !hasPendingChanges ? (
        <p className={`${fieldNoteClass} mt-2`}>
          Save the draft set first, then upload an image here.
        </p>
      ) : null}
    </div>
  );
});
