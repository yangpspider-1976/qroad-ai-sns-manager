import "dotenv/config";
import { generateContentBriefVariants } from "../lib/ai/mock-provider";
import { prisma } from "../lib/db/prisma";
import { qroadWorkspace, sampleBrief } from "../lib/mock-data";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "marketing@qroad.ph" },
    update: {},
    create: {
      email: "marketing@qroad.ph",
      name: "QROAD Marketing Manager",
      role: "admin"
    }
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: "qroad-ph" },
    update: {},
    create: {
      id: "qroad-ph",
      name: "QROAD Philippines",
      timezone: "Asia/Manila",
      ownerId: user.id,
      status: "active"
    }
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: { role: "admin" },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: "admin"
    }
  });

  await prisma.brandProfile.upsert({
    where: { workspaceId: workspace.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      companyName: "QROAD Philippines",
      services: [
        "Social media management",
        "Website development",
        "Digital marketing",
        "Influencer support",
        "Online store support"
      ],
      targetAudience:
        "Philippine SMEs, Korean-owned businesses in the Philippines, K-brands, game/content/e-commerce companies.",
      coreMessage: "Korean-standard execution plus Philippine-local digital marketing.",
      defaultCta: "Book a Free Digital Growth Audit and 15-minute consultation.",
      tone: "Professional, practical, trustworthy, not exaggerated.",
      languages: ["English", "Korean", "Taglish", "Filipino"],
      prohibitedTerms: ["guaranteed revenue", "100% success", "unverified awards", "unsupported performance promises"]
    }
  });

  const existingDrafts = await prisma.postDraft.count({
    where: { workspaceId: workspace.id }
  });

  if (existingDrafts === 0) {
    const generated = generateContentBriefVariants({
      brandProfile: qroadWorkspace.brandProfile,
      brief: sampleBrief
    });

    const brief = await prisma.contentBrief.create({
      data: {
        workspaceId: workspace.id,
        objective: sampleBrief.objective,
        audience: sampleBrief.audience,
        offer: sampleBrief.offer,
        language: sampleBrief.language,
        platforms: sampleBrief.platforms,
        tone: sampleBrief.tone,
        contentType: sampleBrief.contentType,
        notes: sampleBrief.notes
      }
    });

    for (const [index, draft] of generated.platformDrafts.entries()) {
      const status = index === 0 ? "approved" : index === 1 ? "ready_for_review" : "scheduled";
      const scheduledAt = index === 2 ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;
      const postDraft = await prisma.postDraft.create({
        data: {
          briefId: brief.id,
          workspaceId: workspace.id,
          platform: draft.platform,
          caption: draft.caption,
          hashtags: draft.hashtags,
          cta: draft.cta,
          imageText: draft.imageText,
          videoScript: draft.videoScript,
          qualityScore: draft.qualityScore,
          status,
          scheduledAt,
          mediaAssets: {
            create: {
              workspaceId: workspace.id,
              type: "designer_brief",
              url: `/assets/${draft.platform}-growth-audit.png`,
              prompt: `${draft.imageText.headline}. ${draft.imageText.subtitle}. Use QROAD teal and a clear CTA.`,
              width: draft.platform === "tiktok" ? 1080 : draft.platform === "facebook" ? 1200 : 1080,
              height: draft.platform === "tiktok" ? 1920 : draft.platform === "facebook" ? 630 : 1080,
              status: "generated"
            }
          },
          postMetrics: {
            create: {
              reach: index === 0 ? 4280 : 2880,
              impressions: index === 0 ? 6120 : 3900,
              engagement: index === 0 ? 318 : 246,
              comments: index === 0 ? 24 : 18,
              clicks: index === 0 ? 91 : 54,
              leads: index === 0 ? 7 : 4
            }
          }
        }
      });

      if (status === "approved") {
        await prisma.approval.create({
          data: {
            postDraftId: postDraft.id,
            reviewerId: user.id,
            status: "approved",
            comment: "Seed approval for MVP workflow validation.",
            approvedAt: new Date()
          }
        });
      }

      if (status === "scheduled" && scheduledAt) {
        await prisma.publishJob.create({
          data: {
            postDraftId: postDraft.id,
            platform: draft.platform,
            runAt: scheduledAt,
            status: "queued"
          }
        });
      }
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      workspaceId: workspace.id,
      action: "seed",
      entityType: "Workspace",
      entityId: workspace.id,
      metadata: { source: "scripts/seed.ts" }
    }
  });

  const kbrandWorkspace = await prisma.workspace.upsert({
    where: { id: "kbrand-launch" },
    update: {
      name: "K-Brand Launch PH",
      timezone: "Asia/Manila",
      ownerId: user.id,
      status: "active"
    },
    create: {
      id: "kbrand-launch",
      name: "K-Brand Launch PH",
      timezone: "Asia/Manila",
      ownerId: user.id,
      status: "active"
    }
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: kbrandWorkspace.id, userId: user.id } },
    update: { role: "manager" },
    create: {
      workspaceId: kbrandWorkspace.id,
      userId: user.id,
      role: "manager"
    }
  });

  await prisma.brandProfile.upsert({
    where: { workspaceId: kbrandWorkspace.id },
    update: {
      companyName: "K-Brand Launch PH",
      services: ["Launch localization", "Social media management", "Influencer support", "Campaign reporting"],
      targetAudience: "Korean brands entering the Philippine market and Korean-owned businesses operating locally.",
      coreMessage: "K-brand market entry with Korean-standard coordination and Philippine-local execution.",
      defaultCta: "Request a localized launch plan.",
      tone: "Professional, practical, culturally aware, and market-entry focused.",
      languages: ["English", "Korean", "Taglish", "Filipino"],
      prohibitedTerms: ["guaranteed revenue", "100% success", "instant virality", "unsupported awards"]
    },
    create: {
      workspaceId: kbrandWorkspace.id,
      companyName: "K-Brand Launch PH",
      services: ["Launch localization", "Social media management", "Influencer support", "Campaign reporting"],
      targetAudience: "Korean brands entering the Philippine market and Korean-owned businesses operating locally.",
      coreMessage: "K-brand market entry with Korean-standard coordination and Philippine-local execution.",
      defaultCta: "Request a localized launch plan.",
      tone: "Professional, practical, culturally aware, and market-entry focused.",
      languages: ["English", "Korean", "Taglish", "Filipino"],
      prohibitedTerms: ["guaranteed revenue", "100% success", "instant virality", "unsupported awards"]
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      workspaceId: kbrandWorkspace.id,
      action: "seed",
      entityType: "Workspace",
      entityId: kbrandWorkspace.id,
      metadata: { source: "scripts/seed.ts" }
    }
  });

  console.log("Seeded QROAD Philippines and K-Brand Launch PH workspaces.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
