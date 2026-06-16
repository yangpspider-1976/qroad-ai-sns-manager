"use client";

import { ChevronDown, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { DraftCard } from "@/components/draft-card";
import { Shell } from "@/components/shell";
import { Button, Modal, Notice, Panel, fieldNoteClass, formActionsClass, formGridClass, sectionHeadingClass } from "@/components/ui";
import { useSelectedWorkspaceId } from "@/components/workspace-switcher";
import { groupDraftsByBrief, platformListLabel } from "@/lib/draft-groups";
import { sampleBrief } from "@/lib/mock-data";
import type { ContentBrief, Platform, PostDraft } from "@/lib/types";

type StudioTab = "brief" | "drafts";

const languageOptions = [
  "English with light Taglish phrasing",
  "English",
  "Taglish",
  "Filipino",
  "Korean to English localized"
];

const audienceOptions = [
  "SME owners and Korean-owned businesses operating in the Philippines.",
  "Local service businesses in Metro Manila.",
  "Restaurant, cafe, and retail owners.",
  "Korean entrepreneurs launching in the Philippines.",
  "Growth-focused founders needing consistent social media operations."
];

const offerOptions = [
  "Free Digital Growth Audit",
  "15-minute consultation",
  "Localized launch plan",
  "Monthly SNS management package",
  "Content operations audit"
];

const platformOptions: { label: string; value: Platform[] }[] = [
  { label: "Facebook, Instagram, and Tiktok", value: ["facebook", "instagram", "tiktok"] },
  { label: "Facebook only", value: ["facebook"] },
  { label: "Instagram only", value: ["instagram"] },
  { label: "Tiktok only", value: ["tiktok"] }
];

const toneOptions = [
  "Practical, clear, and consultative",
  "Professional and trustworthy",
  "Friendly and conversational",
  "Confident and concise",
  "Premium and polished",
  "Warm Taglish"
];

export default function ContentStudioPage() {
  const selectedWorkspaceId = useSelectedWorkspaceId();
  const [brief, setBrief] = useState(sampleBrief);
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [savedDrafts, setSavedDrafts] = useState<PostDraft[]>([]);
  const [message, setMessage] = useState("Ready to generate platform-specific drafts.");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasUnsavedDraftSet, setHasUnsavedDraftSet] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [activeStudioTab, setActiveStudioTab] = useState<StudioTab>("brief");
  const [selectedDraftGroupId, setSelectedDraftGroupId] = useState("");

  const sharedDraft = drafts[0];
  const savedDraftGroups = groupDraftsByBrief(savedDrafts);

  useEffect(() => {
    setBrief((current) => ({ ...current, workspaceId: selectedWorkspaceId }));

    async function loadDrafts() {
      const response = await fetch(`/api/post-drafts?workspaceId=${selectedWorkspaceId}`);
      if (!response.ok) {
        setDrafts([]);
        setMessage("Could not load drafts for the selected workspace.");
        return;
      }
      const data = await response.json();
      setSavedDrafts(data.drafts);
      const groups = groupDraftsByBrief(data.drafts);
      const latestDraftGroup = groups[0];
      setDrafts(latestDraftGroup?.drafts ?? []);
      setHasUnsavedDraftSet(false);
      setSelectedDraftGroupId(latestDraftGroup?.id ?? "");
      setMessage(
        latestDraftGroup
          ? `Loaded the latest draft set with ${latestDraftGroup.drafts.length} platform variants.`
          : "No draft sets exist yet for the selected workspace."
      );
    }

    void loadDrafts();
  }, [selectedWorkspaceId]);

  function updateBrief(field: keyof ContentBrief, value: string) {
    setBrief((current) => ({ ...current, [field]: value }));
  }

  function updatePlatforms(value: string) {
    const selected = platformOptions.find((option) => option.value.join(",") === value);
    if (!selected) return;
    setBrief((current) => ({ ...current, platforms: selected.value }));
  }

  async function generateDrafts() {
    if (hasUnsavedDraftSet) {
      setShowUnsavedModal(true);
      return;
    }
    await generateDraftsNow();
  }

  async function generateDraftsNow() {
    setIsGenerating(true);
    setMessage("Generating draft set...");
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: brief.workspaceId,
        objective: brief.objective,
        audience: brief.audience,
        offer: brief.offer,
        language: brief.language,
        platforms: brief.platforms,
        tone: brief.tone,
        contentType: brief.contentType,
        notes: brief.notes
      })
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Generation failed. Check required fields and try again.");
      setIsGenerating(false);
      return;
    }
    const nextDrafts: PostDraft[] = result.platformDrafts;
    setDrafts(nextDrafts);
    setHasUnsavedDraftSet(true);
    setSelectedDraftGroupId(result.briefId ?? nextDrafts[0]?.briefId ?? "");
    setActiveStudioTab("drafts");
    setMessage(`Generated an unsaved draft set with ${nextDrafts.length} platform variant${nextDrafts.length === 1 ? "" : "s"}.`);
    setIsGenerating(false);
  }

  async function saveDraftSet() {
    if (!hasUnsavedDraftSet || drafts.length === 0) return true;
    const response = await fetch("/api/post-drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: selectedWorkspaceId,
        brief,
        platformDrafts: drafts
      })
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Draft set save failed.");
      return false;
    }
    setDrafts(result.platformDrafts);
    setSavedDrafts((current) => [...result.platformDrafts, ...current]);
    setSelectedDraftGroupId(result.briefId);
    setHasUnsavedDraftSet(false);
    setMessage("Draft set saved.");
    return true;
  }

  function updateDraft(updatedDraft: PostDraft) {
    setDrafts((current) =>
      current.map((draft) => ({
        ...draft,
        caption: updatedDraft.caption,
        hashtags: updatedDraft.hashtags
      }))
    );
    if (updatedDraft.id.startsWith("preview_")) {
      setHasUnsavedDraftSet(true);
    }
  }

  function selectDraftGroup(groupId: string) {
    if (hasUnsavedDraftSet) return;
    const group = savedDraftGroups.find((item) => item.id === groupId);
    if (!group) return;
    setSelectedDraftGroupId(group.id);
    setDrafts(group.drafts);
  }

  return (
    <Shell title="Content Studio" subtitle="Turn one campaign brief into platform-specific drafts and manually reviewed assets.">
      {isGenerating ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(15,23,42,0.36)] p-6">
          <div className="grid w-[min(420px,100%)] gap-4 rounded-lg bg-white p-6 text-center shadow-[0_18px_60px_rgba(15,23,42,0.22),0_0_0_1px_rgba(0,0,0,0.06)]">
            <LoaderCircle className="mx-auto animate-spin text-accent" size={34} />
            <div>
              <h2 className="m-0 text-lg font-bold">Generating draft set</h2>
              <p className={`${fieldNoteClass} mt-2`}>
                Creating one shared content direction and selected platform layouts.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4">
        <div className="inline-flex w-fit rounded-lg border border-line bg-white p-1">
          {[
            { id: "brief", label: "Content Brief" },
            { id: "drafts", label: "Generated Drafts" }
          ].map((tab) => {
            const isActive = activeStudioTab === tab.id;
            return (
              <button
                aria-pressed={isActive}
                className={`inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-4 text-sm font-medium transition ${
                  isActive ? "bg-[#ebebeb] text-ink" : "text-muted hover:bg-[#f8fafc] hover:text-ink"
                }`}
                key={tab.id}
                onClick={() => setActiveStudioTab(tab.id as StudioTab)}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {activeStudioTab === "brief" ? (
        <Panel>
          <div className={sectionHeadingClass}>
            <div>
              <h2 className="m-0 text-lg font-bold">Content Brief</h2>
              <p className={fieldNoteClass}>Mock AI currently returns structured JSON using the saved brand profile.</p>
            </div>
          </div>
          <form>
            <div className="grid grid-cols-1 gap-3.5 min-[921px]:grid-cols-2">
              <label className="min-[921px]:row-span-2">
                Objective
                <textarea
                  className="h-[148px] resize-none min-[921px]:h-full"
                  value={brief.objective}
                  onChange={(event) => updateBrief("objective", event.target.value)}
                />
              </label>
              <label>
                Target audience
                <span className="relative block">
                  <select
                    className="appearance-none pr-10"
                    value={brief.audience}
                    onChange={(event) => updateBrief("audience", event.target.value)}
                  >
                    {audienceOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
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
              <label>
                Language
                <span className="relative block">
                  <select
                    className="appearance-none pr-10"
                    value={brief.language}
                    onChange={(event) => updateBrief("language", event.target.value)}
                  >
                    {languageOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
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
              <label>
                Offer
                <span className="relative block">
                  <select
                    className="appearance-none pr-10"
                    value={brief.offer}
                    onChange={(event) => updateBrief("offer", event.target.value)}
                  >
                    {offerOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
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
              <label>
                Platforms
                <span className="relative block">
                  <select
                    className="appearance-none pr-10"
                    value={brief.platforms.join(",")}
                    onChange={(event) => updatePlatforms(event.target.value)}
                  >
                    {platformOptions.map((option) => (
                      <option key={option.value.join(",")} value={option.value.join(",")}>
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
              <label>
                Preferred tone
                <span className="relative block">
                  <select
                    className="appearance-none pr-10"
                    value={brief.tone}
                    onChange={(event) => updateBrief("tone", event.target.value)}
                  >
                    {toneOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
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
            </div>
            <div className={formActionsClass}>
              {hasUnsavedDraftSet ? (
                <Button onClick={() => void saveDraftSet()} type="button" variant="secondary">
                  Save draft set
                </Button>
              ) : null}
              <Button disabled={isGenerating} onClick={generateDrafts} type="button">
                <Sparkles size={16} /> Generate drafts
              </Button>
            </div>
          </form>
        </Panel>
        ) : null}
        {activeStudioTab === "drafts" ? (
        <>
        <div className="grid gap-3 max-w-[720px]">
          <label>
            Draft to edit
            <span className="relative block">
              <select
                className="appearance-none pr-10"
                disabled={hasUnsavedDraftSet}
                value={selectedDraftGroupId}
                onChange={(event) => selectDraftGroup(event.target.value)}
              >
                {hasUnsavedDraftSet ? (
                  <option value={selectedDraftGroupId}>Unsaved draft - {drafts[0]?.imageText.headline ?? "Generated preview"}</option>
                ) : null}
                {savedDraftGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.title} - {platformListLabel(group.platforms)}
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
          {drafts.length > 0 ? (
            <p className={fieldNoteClass}>Platforms: {platformListLabel(Array.from(new Set(drafts.map((draft) => draft.platform))))}</p>
          ) : null}
        </div>
        <Panel>
          <div className="mb-4">
            <div>
              <h2 className="m-0 text-lg font-bold">Generated Drafts</h2>
              <p className={fieldNoteClass}>
                One shared content record is used across all selected platforms.
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {sharedDraft ? (
              <DraftCard
                draft={sharedDraft}
                assetUploadEnabled
                editable
                key={sharedDraft.id}
                onDraftChange={updateDraft}
                platformDrafts={drafts}
                saveEnabled={!hasUnsavedDraftSet}
                titleOverride="Shared content"
              />
            ) : (
              <Notice>No generated draft is available yet.</Notice>
            )}
          </div>
          {hasUnsavedDraftSet ? (
            <div className={formActionsClass}>
              <Button onClick={() => void saveDraftSet()} type="button">
                Save draft set
              </Button>
            </div>
          ) : null}
        </Panel>
        </>
        ) : null}
      </div>
      {showUnsavedModal ? (
        <Modal
          footer={
            <>
              <Button onClick={() => setShowUnsavedModal(false)} type="button" variant="secondary">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowUnsavedModal(false);
                  setHasUnsavedDraftSet(false);
                  void generateDraftsNow();
                }}
                type="button"
                variant="danger"
              >
                Continue without saving
              </Button>
              <Button
                onClick={async () => {
                  const saved = await saveDraftSet();
                  if (!saved) return;
                  setShowUnsavedModal(false);
                  void generateDraftsNow();
                }}
                type="button"
              >
                Save then continue
              </Button>
            </>
          }
          onClose={() => setShowUnsavedModal(false)}
          subtitle="You have a generated draft set that has not been saved yet."
          title="Unsaved draft"
        >
          Continuing without saving will discard the current generated draft set from this screen.
        </Modal>
      ) : null}
    </Shell>
  );
}
