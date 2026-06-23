import { mapBrandProfile } from "@/lib/db/mappers";
import { WorkspacesClient } from "./workspaces-client";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  if (!process.env.DATABASE_URL) {
    return <WorkspacesClient initialWorkspaces={[]} />;
  }

  const { prisma } = await import("@/lib/db/prisma");
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
