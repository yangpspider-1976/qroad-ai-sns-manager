import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { inspectLinkedInstagramAccount } from "@/lib/platform/meta/facebook";

const diagnosticsSchema = z.object({
  workspaceId: z.string()
});

function recommendationFor(result: Awaited<ReturnType<typeof inspectLinkedInstagramAccount>>) {
  if (!result.ok) {
    return "Meta returned an API error while checking the selected Page. Review the error, reconnect Facebook, and confirm the app has Page access.";
  }
  if (result.instagram) {
    return "Instagram is discoverable from this Facebook Page token. Use Find from Pages to save it in the workspace.";
  }
  return "Meta returned the Page but did not include instagram_business_account or connected_instagram_account. Confirm the Instagram professional account is linked directly to this Facebook Page and that the same Facebook user has access to both assets.";
}

export async function POST(request: Request) {
  const parsed = diagnosticsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const facebookAccounts = await prisma.socialAccount.findMany({
    where: {
      workspaceId: parsed.data.workspaceId,
      platform: { in: ["facebook", "facebook_page"] }
    },
    orderBy: { platform: "asc" }
  });

  if (facebookAccounts.length === 0) {
    return NextResponse.json({ error: "Connect a Facebook Page first, then run Instagram diagnostics." }, { status: 409 });
  }

  const pages = await Promise.all(
    facebookAccounts.map(async (page) => {
      const result = await inspectLinkedInstagramAccount(page.externalAccountId, page.tokenEncrypted);
      return {
        pageId: page.externalAccountId,
        pageName: page.accountName,
        active: page.platform === "facebook",
        ok: result.ok,
        found: Boolean(result.instagram),
        instagramId: result.instagram?.id ?? null,
        username: result.instagram?.username ?? result.instagram?.name ?? null,
        returnedFields: result.returnedFields,
        error: result.error ?? null,
        errorCode: result.errorCode ?? null,
        errorSubcode: result.errorSubcode ?? null,
        errorType: result.errorType ?? null,
        status: result.status ?? null,
        recommendation: recommendationFor(result)
      };
    })
  );

  return NextResponse.json({
    pageCount: pages.length,
    foundCount: pages.filter((page) => page.found).length,
    pages
  });
}
