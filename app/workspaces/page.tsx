import { mapBrandProfile } from "@/lib/db/mappers";
import { prisma } from "@/lib/db/prisma";
import { WorkspacesClient } from "./workspaces-client";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const records = await prisma.workspace.findMany({
    include: { brandProfile: true, owner: true },
    orderBy: { createdAt: "asc" }
  });

  const workspaces = records
    .filter((workspace) => workspace.brandProfile)
    .map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      timezone: workspace.timezone,
      status: workspace.status as "active" | "paused",
      ownerName: workspace.owner.name,
      brandProfile: mapBrandProfile(workspace.brandProfile!)
    }));

  return <WorkspacesClient initialWorkspaces={workspaces} />;
}
