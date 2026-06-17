import type { PostDraft } from "@/lib/types";

export type MetaPageAccount = {
  id: string;
  name: string;
  access_token: string;
  tasks?: string[];
  instagram_business_account?: {
    id: string;
    username?: string;
    name?: string;
  };
  connected_instagram_account?: {
    id: string;
    username?: string;
    name?: string;
  };
};

type FacebookPublishInput = {
  postDraft: PostDraft;
  pageId: string;
  pageAccessToken: string;
};

type InstagramPublishInput = {
  postDraft: PostDraft;
  instagramUserId: string;
  pageAccessToken: string;
  imageUrl: string;
};

export type MetaInstagramAccount = {
  id: string;
  username?: string;
  name?: string;
};

export type MetaConnectionIntent = "facebook" | "instagram";

export type MetaInstagramInspectionResult = {
  ok: boolean;
  instagram: MetaInstagramAccount | null;
  returnedFields: string[];
  error?: string;
  errorCode?: number;
  errorSubcode?: number;
  errorType?: string;
  status?: number;
};

const facebookLoginScopes = new Set([
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish"
]);

const standaloneInstagramScopes = new Set(["instagram_business_basic", "instagram_business_content_publish"]);

function graphVersion() {
  return process.env.META_GRAPH_VERSION || "v20.0";
}

function graphUrl(path: string) {
  return `https://graph.facebook.com/${graphVersion()}${path}`;
}

export function metaConfigStatus() {
  const missing = ["META_APP_ID", "META_APP_SECRET", "META_REDIRECT_URI"].filter((key) => !process.env[key]);
  return {
    configured: missing.length === 0,
    missing
  };
}

export function metaOAuthScopes() {
  return metaOAuthScopesFor("facebook");
}

export function metaOAuthScopesFor(intent: MetaConnectionIntent) {
  const raw =
    intent === "instagram"
      ? process.env.META_INSTAGRAM_SCOPES || "pages_show_list,pages_read_engagement,pages_manage_posts"
      : process.env.META_FACEBOOK_SCOPES || "pages_show_list,pages_read_engagement,pages_manage_posts";
  return raw
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

export function metaFacebookLoginScopesFor(intent: MetaConnectionIntent) {
  const scopes = metaOAuthScopesFor(intent).filter((scope) => facebookLoginScopes.has(scope));
  return intent === "instagram" && scopes.length === 0 ? metaOAuthScopesFor("facebook") : scopes;
}

export function metaStandaloneInstagramScopes() {
  return metaOAuthScopesFor("instagram").filter((scope) => standaloneInstagramScopes.has(scope));
}

export function metaInstagramEnabled() {
  const scopes = metaFacebookLoginScopesFor("instagram");
  return scopes.includes("pages_show_list");
}

export function metaInstagramPublishingReady() {
  const scopes = metaOAuthScopesFor("instagram");
  return (
    scopes.includes("instagram_content_publish") ||
    (scopes.includes("instagram_business_basic") && scopes.includes("instagram_business_content_publish"))
  );
}

export function buildMetaOAuthUrl(workspaceId: string, intent: MetaConnectionIntent = "facebook") {
  const status = metaConfigStatus();
  if (!status.configured) {
    throw new Error(`Missing Meta environment variables: ${status.missing.join(", ")}`);
  }

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? "",
    redirect_uri: process.env.META_REDIRECT_URI ?? "",
    response_type: "code",
    state: `${workspaceId}:${intent}`,
    scope: metaFacebookLoginScopesFor(intent).join(",")
  });

  return `https://www.facebook.com/${graphVersion()}/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForLongLivedToken(code: string) {
  const tokenParams = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? "",
    client_secret: process.env.META_APP_SECRET ?? "",
    redirect_uri: process.env.META_REDIRECT_URI ?? "",
    code
  });
  const shortTokenResponse = await fetch(graphUrl(`/oauth/access_token?${tokenParams.toString()}`), {
    cache: "no-store"
  });
  const shortToken = await shortTokenResponse.json();
  if (!shortTokenResponse.ok || !shortToken.access_token) {
    throw new Error(shortToken.error?.message ?? "Meta token exchange failed.");
  }

  const longTokenParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID ?? "",
    client_secret: process.env.META_APP_SECRET ?? "",
    fb_exchange_token: shortToken.access_token
  });
  const longTokenResponse = await fetch(graphUrl(`/oauth/access_token?${longTokenParams.toString()}`), {
    cache: "no-store"
  });
  const longToken = await longTokenResponse.json();
  if (!longTokenResponse.ok || !longToken.access_token) {
    throw new Error(longToken.error?.message ?? "Meta long-lived token exchange failed.");
  }

  return {
    accessToken: longToken.access_token as string,
    expiresIn: typeof longToken.expires_in === "number" ? longToken.expires_in : null
  };
}

export async function fetchManagedFacebookPages(userAccessToken: string, options: { includeInstagram?: boolean } = {}) {
  const fields = ["id", "name", "access_token", "tasks"];
  if (options.includeInstagram) {
    fields.push("instagram_business_account{id,username,name}", "connected_instagram_account{id,username,name}");
  }
  const params = new URLSearchParams({
    fields: fields.join(","),
    access_token: userAccessToken
  });
  const response = await fetch(graphUrl(`/me/accounts?${params.toString()}`), {
    cache: "no-store"
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Unable to load managed Facebook Pages.");
  }
  return (Array.isArray(body.data) ? body.data : []) as MetaPageAccount[];
}

export async function fetchLinkedInstagramAccount(pageId: string, pageAccessToken: string) {
  const inspection = await inspectLinkedInstagramAccount(pageId, pageAccessToken);
  if (!inspection.ok) {
    throw new Error(inspection.error ?? "Unable to load linked Instagram account for this Page.");
  }

  return inspection.instagram;
}

export async function inspectLinkedInstagramAccount(pageId: string, pageAccessToken: string): Promise<MetaInstagramInspectionResult> {
  const params = new URLSearchParams({
    fields: "instagram_business_account{id,username,name},connected_instagram_account{id,username,name}",
    access_token: pageAccessToken
  });
  const response = await fetch(graphUrl(`/${pageId}?${params.toString()}`), {
    cache: "no-store"
  });
  const body = await response.json();
  if (!response.ok) {
    return {
      ok: false,
      instagram: null,
      returnedFields: [],
      error: body.error?.message ?? "Unable to load linked Instagram account for this Page.",
      errorCode: typeof body.error?.code === "number" ? body.error.code : undefined,
      errorSubcode: typeof body.error?.error_subcode === "number" ? body.error.error_subcode : undefined,
      errorType: typeof body.error?.type === "string" ? body.error.type : undefined,
      status: response.status
    };
  }

  return {
    ok: true,
    instagram: (body.instagram_business_account ?? body.connected_instagram_account ?? null) as MetaInstagramAccount | null,
    returnedFields: Object.keys(body).filter((key) => key !== "id")
  };
}

export async function publishFacebookTextPost({ postDraft, pageId, pageAccessToken }: FacebookPublishInput) {
  const response = await fetch(graphUrl(`/${pageId}/feed`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: pageAccessToken,
      message: [postDraft.caption, postDraft.hashtags.join(" ")].filter(Boolean).join("\n\n")
    })
  });
  const body = await response.json();
  if (!response.ok || !body.id) {
    throw new Error(body.error?.message ?? "Facebook publishing failed.");
  }
  return body as { id: string };
}

export async function publishFacebookPhotoPost({
  postDraft,
  pageId,
  pageAccessToken,
  imageUrl
}: FacebookPublishInput & { imageUrl: string }) {
  const response = await fetch(graphUrl(`/${pageId}/photos`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: pageAccessToken,
      url: imageUrl,
      message: [postDraft.caption, postDraft.hashtags.join(" ")].filter(Boolean).join("\n\n")
    })
  });
  const body = await response.json();
  if (!response.ok || !body.id) {
    throw new Error(body.error?.message ?? "Facebook photo publishing failed.");
  }
  return body as { id: string; post_id?: string };
}

export async function publishFacebookMultiPhotoPost({
  postDraft,
  pageId,
  pageAccessToken,
  imageUrls
}: FacebookPublishInput & { imageUrls: string[] }) {
  // Upload each photo as unpublished to get photo IDs
  const photoIds = await Promise.all(
    imageUrls.map(async (url) => {
      const res = await fetch(graphUrl(`/${pageId}/photos`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: pageAccessToken, url, published: false })
      });
      const body = await res.json();
      if (!res.ok || !body.id) throw new Error(body.error?.message ?? "Facebook photo upload failed.");
      return body.id as string;
    })
  );

  // Post to feed with all photos attached
  const response = await fetch(graphUrl(`/${pageId}/feed`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: pageAccessToken,
      message: [postDraft.caption, postDraft.hashtags.join(" ")].filter(Boolean).join("\n\n"),
      attached_media: photoIds.map((id) => ({ media_fbid: id }))
    })
  });
  const body = await response.json();
  if (!response.ok || !body.id) throw new Error(body.error?.message ?? "Facebook multi-photo publishing failed.");
  return body as { id: string; post_id?: string };
}

export async function publishInstagramImagePost({ postDraft, instagramUserId, pageAccessToken, imageUrl }: InstagramPublishInput) {
  const caption = [postDraft.caption, postDraft.hashtags.join(" ")].filter(Boolean).join("\n\n");
  const createResponse = await fetch(graphUrl(`/${instagramUserId}/media`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: pageAccessToken,
      image_url: imageUrl,
      caption
    })
  });
  const createBody = await createResponse.json();
  if (!createResponse.ok || !createBody.id) {
    throw new Error(createBody.error?.message ?? "Instagram media container creation failed.");
  }

  const publishResponse = await fetch(graphUrl(`/${instagramUserId}/media_publish`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: pageAccessToken,
      creation_id: createBody.id
    })
  });
  const publishBody = await publishResponse.json();
  if (!publishResponse.ok || !publishBody.id) {
    throw new Error(publishBody.error?.message ?? "Instagram publishing failed.");
  }

  return { id: publishBody.id as string, creationId: createBody.id as string };
}
