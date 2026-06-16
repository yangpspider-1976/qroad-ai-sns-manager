import { mapPostDraft } from "../lib/db/mappers";
import { getDemoUser, prisma } from "../lib/db/prisma";
import { mockPublisher } from "../lib/platform/mock/publisher";

async function processDueJobs() {
  const jobs = await prisma.publishJob.findMany({
    where: {
      status: "queued",
      runAt: { lte: new Date() }
    },
    include: {
      postDraft: {
        include: { mediaAssets: true }
      }
    },
    take: 20
  });

  const user = await getDemoUser();

  for (const job of jobs) {
    await prisma.publishJob.update({
      where: { id: job.id },
      data: { status: "processing" }
    });

    const draft = mapPostDraft(job.postDraft);
    const assets = job.postDraft.mediaAssets.map((asset) => ({
      id: asset.id,
      workspaceId: asset.workspaceId,
      postDraftId: asset.postDraftId,
      type: asset.type as "image" | "video" | "thumbnail" | "designer_brief",
      url: asset.url,
      prompt: asset.prompt ?? "",
      width: asset.width,
      height: asset.height,
      status: asset.status as "generated" | "needs_design" | "approved"
    }));

    const result = await mockPublisher.publishPost(draft, assets);

    await prisma.$transaction([
      prisma.publishLog.create({
        data: {
          postDraftId: draft.id,
          platform: draft.platform,
          platformPostId: result.platformPostId,
          status: result.ok ? "success" : "failed",
          requestPayload: { worker: true, jobId: job.id },
          responsePayload: result,
          errorMessage: result.error
        }
      }),
      prisma.publishJob.update({
        where: { id: job.id },
        data: {
          status: result.ok ? "published" : "failed",
          error: result.error,
          retryCount: result.ok ? job.retryCount : job.retryCount + 1
        }
      }),
      prisma.postDraft.update({
        where: { id: draft.id },
        data: { status: result.ok ? "published" : "failed" }
      }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          workspaceId: draft.workspaceId,
          action: result.ok ? "worker.publish.success" : "worker.publish.failed",
          entityType: "PublishJob",
          entityId: job.id,
          metadata: result
        }
      })
    ]);

    console.log(result.ok ? `Published job ${job.id}` : `Failed job ${job.id}: ${result.error}`);
  }
}

async function main() {
  await processDueJobs();
  if (process.argv.includes("--watch")) {
    setInterval(() => {
      void processDueJobs().catch((error) => console.error(error));
    }, 60_000);
  } else {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
