"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { Button, Notice, Panel, fieldNoteClass, formActionsClass, formGridClass, sectionHeadingClass } from "@/components/ui";
import { workspaces } from "@/lib/mock-data";

export function WorkspaceSettingsClient({ id }: { id: string }) {
  const matchedWorkspace = workspaces.find((item) => item.id === id);
  const workspace = matchedWorkspace ? matchedWorkspace : { ...workspaces[0], id, name: "Workspace" };
  const [profile, setProfile] = useState(workspace.brandProfile);
  const [message, setMessage] = useState("Edit the brand profile and save it for this browser session.");

  useEffect(() => {
    async function loadProfile() {
      const response = await fetch(`/api/workspaces/${id}/brand-profile`);
      if (!response.ok) return;
      const data = await response.json();
      setProfile(data.profile);
      setMessage("Loaded brand profile from database.");
    }
    void loadProfile();
  }, [id]);

  function updateProfile(field: keyof typeof profile, value: string | string[]) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile() {
    const response = await fetch(`/api/workspaces/${workspace.id}/brand-profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    setMessage(response.ok ? "Brand profile saved to database." : "Brand profile save failed.");
  }

  return (
    <Shell title={`${profile.companyName || workspace.name} Settings`} subtitle="Brand memory, roles, social accounts, and safety terms.">
      <div className="grid grid-cols-1 gap-4 min-[921px]:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <Panel>
          <div className={sectionHeadingClass}>
            <div>
              <h2 className="m-0 text-lg font-bold">Brand Profile</h2>
              <p className={fieldNoteClass}>AI generation reads this profile before creating drafts.</p>
            </div>
          </div>
          <form>
            <div className={formGridClass}>
              <label>
                Company name
                <input value={profile.companyName} onChange={(event) => updateProfile("companyName", event.target.value)} />
              </label>
              <label>
                Tone
                <input value={profile.tone} onChange={(event) => updateProfile("tone", event.target.value)} />
              </label>
              <label className="min-[921px]:col-span-2">
                Target audience
                <textarea value={profile.targetAudience} onChange={(event) => updateProfile("targetAudience", event.target.value)} />
              </label>
              <label className="min-[921px]:col-span-2">
                Core message
                <textarea value={profile.coreMessage} onChange={(event) => updateProfile("coreMessage", event.target.value)} />
              </label>
              <label>
                Services
                <textarea value={profile.services.join("\n")} onChange={(event) => updateProfile("services", event.target.value.split("\n").filter(Boolean))} />
              </label>
              <label>
                Languages
                <textarea value={profile.languages.join("\n")} onChange={(event) => updateProfile("languages", event.target.value.split("\n").filter(Boolean))} />
              </label>
              <label className="min-[921px]:col-span-2">
                Default CTA
                <input value={profile.defaultCta} onChange={(event) => updateProfile("defaultCta", event.target.value)} />
              </label>
              <label className="min-[921px]:col-span-2">
                Prohibited claims
                <textarea
                  value={profile.prohibitedTerms.join("\n")}
                  onChange={(event) => updateProfile("prohibitedTerms", event.target.value.split("\n").filter(Boolean))}
                />
              </label>
            </div>
            <div className={formActionsClass}>
              <Button onClick={saveProfile} type="button">
                <Save size={16} /> Save profile
              </Button>
            </div>
          </form>
          <Notice className="mt-4">{message}</Notice>
        </Panel>
        <Panel>
          <h2 className="m-0 text-lg font-bold">Workspace Controls</h2>
          <div className="mt-4 grid gap-4">
            <Notice>Role UI enabled for Admin, Manager, Operator, Client Approver, and Viewer.</Notice>
            <Notice tone="warning">Meta and TikTok accounts are placeholders until OAuth is configured.</Notice>
            <div className="rounded-lg border border-line bg-white p-3.5">
              <strong>Connected accounts</strong>
              <p className={fieldNoteClass}>Facebook Page: Not connected</p>
              <p className={fieldNoteClass}>Instagram Professional: Not connected</p>
              <p className={fieldNoteClass}>TikTok Business/Creator: Draft mode only</p>
            </div>
          </div>
        </Panel>
      </div>
    </Shell>
  );
}
