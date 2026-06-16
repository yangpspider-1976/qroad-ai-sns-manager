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
  imageUrl: string;
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

export async function publishInstagramBusinessImagePost({
  postDraft,
  instagramUserId,
  accessToken,
  imageUrl
}: InstagramPublishInput) {
  const caption = [postDraft.caption, postDraft.hashtags.join(" ")].filter(Boolean).join("\n\n");
  const createResponse = await fetch(graphInstagramUrl(`/${instagramUserId}/media`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      image_url: imageUrl,
      caption
    })
  });
  const createBody = await createResponse.json();
  if (!createResponse.ok || !createBody.id) {
    throw new Error(createBody.error?.message ?? "Instagram media container creation failed.");
  }

  const publishResponse = await fetch(graphInstagramUrl(`/${instagramUserId}/media_publish`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      creation_id: createBody.id
    })
  });
  const publishBody = await publishResponse.json();
  if (!publishResponse.ok || !publishBody.id) {
    throw new Error(publishBody.error?.message ?? "Instagram publishing failed.");
  }

  return { id: publishBody.id as string, creationId: createBody.id as string };
}
