import type { PostDraft } from "@/lib/types";

type InstagramTokenResponse = {
  access_token: string;
  user_id?: number | string;
  permissions?: string[];
};

type InstagramLongLivedTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

export type InstagramBusinessProfile = {
  id?: string;
  user_id?: string;
  username?: string;
  account_type?: string;
};

type InstagramPublishInput = {
  postDraft: PostDraft;
  instagramUserId: string;
  accessToken: string;
  imageUrls: string[];
};

type InstagramPublishResult = {
  id: string;
  creationId: string;
  mediaType: "IMAGE" | "CAROUSEL";
  usedImageUrls: string[];
};

function instagramAppId() {
  return process.env.INSTAGRAM_APP_ID || process.env.META_INSTAGRAM_APP_ID || "";
}

function instagramAppSecret() {
  return process.env.INSTAGRAM_APP_SECRET || process.env.META_INSTAGRAM_APP_SECRET || "";
}

function instagramRedirectUri() {
  return process.env.INSTAGRAM_REDIRECT_URI || process.env.META_INSTAGRAM_REDIRECT_URI || "";
}

function instagramApiVersion() {
  return process.env.INSTAGRAM_API_VERSION || process.env.META_GRAPH_VERSION || "v23.0";
}

function graphInstagramUrl(path: string) {
  return `https://graph.instagram.com/${instagramApiVersion()}${path}`;
}

export function instagramLoginConfigStatus() {
  const missing = [
    ["INSTAGRAM_APP_ID", instagramAppId()],
    ["INSTAGRAM_APP_SECRET", instagramAppSecret()],
    ["INSTAGRAM_REDIRECT_URI", instagramRedirectUri()]
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return { configured: missing.length === 0, missing };
}

export function instagramLoginScopes() {
  const raw =
    process.env.INSTAGRAM_SCOPES ||
    process.env.META_INSTAGRAM_SCOPES ||
    "instagram_business_basic,instagram_business_content_publish";
  return raw
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean)
    .filter((scope) => scope.startsWith("instagram_business_"));
}

export function instagramLoginPublishingReady() {
  const scopes = instagramLoginScopes();
  return scopes.includes("instagram_business_basic") && scopes.includes("instagram_business_content_publish");
}

export function buildInstagramLoginOAuthUrl(workspaceId: string) {
  const status = instagramLoginConfigStatus();
  if (!status.configured) {
    throw new Error(`Missing Instagram Login environment variables: ${status.missing.join(", ")}`);
  }

  const params = new URLSearchParams({
    enable_fb_login: "0",
    force_authentication: "1",
    client_id: instagramAppId(),
    redirect_uri: instagramRedirectUri(),
    response_type: "code",
    state: workspaceId,
    scope: instagramLoginScopes().join(",")
  });

  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeInstagramLoginCode(code: string) {
  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: instagramAppId(),
      client_secret: instagramAppSecret(),
      grant_type: "authorization_code",
      redirect_uri: instagramRedirectUri(),
      code
    }).toString(),
    cache: "no-store"
  } as RequestInit);

  const body = await response.json();
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_message ?? body.error?.message ?? "Instagram token exchange failed.");
  }

  return body as InstagramTokenResponse;
}

export async function exchangeInstagramLongLivedToken(accessToken: string) {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: instagramAppSecret(),
    access_token: accessToken
  });
  const response = await fetch(`https://graph.instagram.com/access_token?${params.toString()}`, {
    cache: "no-store"
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) {
    throw new Error(body.error?.message ?? "Instagram long-lived token exchange failed.");
  }
  return body as InstagramLongLivedTokenResponse;
}

export async function fetchInstagramBusinessProfile(accessToken: string, fallbackUserId?: string | number) {
  const params = new URLSearchParams({
    fields: "user_id,username,account_type",
    access_token: accessToken
  });
  const response = await fetch(graphInstagramUrl(`/me?${params.toString()}`), {
    cache: "no-store"
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Instagram profile fetch failed.");
  }

  return {
    ...(body as InstagramBusinessProfile),
    user_id: String(body.user_id ?? body.id ?? fallbackUserId ?? "")
  };
}

async function pollContainerReady(containerId: string, accessToken: string) {
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(
      graphInstagramUrl(`/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`),
      { cache: "no-store" }
    );
    const body = await res.json();
    if (body.status_code === "FINISHED") return;
    if (body.status_code === "ERROR") throw new Error(body.error?.message ?? "Instagram media container processing failed.");
  }
  throw new Error("Instagram media container timed out while processing. Try again.");
}

export async function publishInstagramBusinessImagePost({
  postDraft,
  instagramUserId,
  accessToken,
  imageUrls
}: InstagramPublishInput): Promise<InstagramPublishResult> {
  const caption = [postDraft.caption, postDraft.hashtags.join(" ")].filter(Boolean).join("\n\n");
  const firstImageUrl = imageUrls[0];

  if (!firstImageUrl) {
    throw new Error("Instagram publishing requires at least one image.");
  }

  if (imageUrls.length === 1) {
    const createRes = await fetch(graphInstagramUrl(`/${instagramUserId}/media`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken, image_url: firstImageUrl, media_type: "IMAGE", caption })
    });
    const createBody = await createRes.json();
    if (!createRes.ok || !createBody.id) throw new Error(createBody.error?.message ?? "Instagram media container creation failed.");
    const containerId = createBody.id as string;
    await pollContainerReady(containerId, accessToken);

    const publishRes = await fetch(graphInstagramUrl(`/${instagramUserId}/media_publish`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken, creation_id: containerId })
    });
    const publishBody = await publishRes.json();
    if (!publishRes.ok || !publishBody.id) throw new Error(publishBody.error?.message ?? "Instagram publishing failed.");
    return { id: publishBody.id as string, creationId: containerId, mediaType: "IMAGE", usedImageUrls: [firstImageUrl] };
  }

  const itemIds = await Promise.all(
    imageUrls.map(async (url) => {
      const res = await fetch(graphInstagramUrl(`/${instagramUserId}/media`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
          image_url: url,
          media_type: "IMAGE",
          is_carousel_item: true
        })
      });
      const body = await res.json();
      if (!res.ok || !body.id) throw new Error(body.error?.message ?? "Instagram carousel item creation failed.");
      return body.id as string;
    })
  );

  await Promise.all(itemIds.map((itemId) => pollContainerReady(itemId, accessToken)));

  const carouselRes = await fetch(graphInstagramUrl(`/${instagramUserId}/media`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      media_type: "CAROUSEL",
      children: itemIds.join(","),
      caption
    })
  });
  const carouselBody = await carouselRes.json();
  if (!carouselRes.ok || !carouselBody.id) throw new Error(carouselBody.error?.message ?? "Instagram carousel container creation failed.");
  const carouselId = carouselBody.id as string;
  await pollContainerReady(carouselId, accessToken);

  const publishRes = await fetch(graphInstagramUrl(`/${instagramUserId}/media_publish`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken, creation_id: carouselId })
  });
  const publishBody = await publishRes.json();
  if (!publishRes.ok || !publishBody.id) throw new Error(publishBody.error?.message ?? "Instagram carousel publishing failed.");
  return { id: publishBody.id as string, creationId: carouselId, mediaType: "CAROUSEL", usedImageUrls: imageUrls };
}
