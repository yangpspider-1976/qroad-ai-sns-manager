import { WorkspaceSettingsClient } from "./workspace-settings-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkspaceSettingsPage({ params }: PageProps) {
  const { id } = await params;
  return <WorkspaceSettingsClient id={id} />;
}
