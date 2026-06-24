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

export type FacebookPublishAccount = {
  accountName: string;
  externalAccountId: string;
  tokenEncrypted: string;
  source: "database" | "environment";
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

const defaultFacebookPageScopes = ["pages_show_list", "pages_read_engagement", "pages_manage_posts"];

const facebookPageScopes = new Set(defaultFacebookPageScopes);

const standaloneInstagramScopes = new Set(["instagram_business_basic", "instagram_business_content_publish"]);

export function facebookPageEnvStatus() {
  const missing = ["FACEBOOK_PAGE_ID", "FACEBOOK_PAGE_ACCESS_TOKEN"].filter((key) => !process.env[key]);
  return {
    configured: missing.length === 0,
    missing
  };
}

export function facebookEnvPageForDisplay() {
  const status = facebookPageEnvStatus();
  if (!status.configured) return null;

  return {
    id: "env-facebook-page",
    pageId: process.env.FACEBOOK_PAGE_ID ?? "",
    pageName: process.env.FACEBOOK_PAGE_NAME || "Configured Facebook Page",
    active: true,
    tokenExpiresAt: null,
    scopes: {
      source: "environment",
      note: "Configured with FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN."
    }
  };
}

export function facebookEnvPageForPublishing(): FacebookPublishAccount | null {
  const status = facebookPageEnvStatus();
  if (!status.configured) return null;

  return {
    accountName: process.env.FACEBOOK_PAGE_NAME || "Configured Facebook Page",
    externalAccountId: process.env.FACEBOOK_PAGE_ID ?? "",
    tokenEncrypted: process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? "",
    source: "environment"
  };
}

function graphVersion() {
  return process.env.META_GRAPH_VERSION || "v20.0";
}

function graphUrl(path: string) {
  return `https://graph.facebook.com/${graphVersion()}${path}`;
}

export function metaConfigStatus() {
  // META_BUSINESS_LOGIN_CONFIG_ID is optional: when present we use Facebook
  // Login for Business, otherwise we fall back to classic scope-based login.
  // Requiring it here would disable the Connect button even though
  // buildMetaOAuthUrl() works fine without it.
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
      ? process.env.META_INSTAGRAM_SCOPES || defaultFacebookPageScopes.join(",")
      : process.env.META_FACEBOOK_SCOPES || defaultFacebookPageScopes.join(",");
  return raw
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

export function metaFacebookLoginScopesFor(intent: MetaConnectionIntent) {
  const scopes = metaOAuthScopesFor(intent).filter((scope) => facebookPageScopes.has(scope));
  return scopes.length > 0 ? scopes : defaultFacebookPageScopes;
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
    state: `${workspaceId}:${intent}`
  });

  const businessLoginConfigId = process.env.META_BUSINESS_LOGIN_CONFIG_ID || process.env.META_CONFIG_ID;
  if (businessLoginConfigId) {
    // Facebook Login for Business: permissions are defined by the configuration.
    // Passing `scope` alongside `config_id` is rejected/ignored by Meta, so we
    // send only the config id here.
    params.set("config_id", businessLoginConfigId);
  } else {
    // Classic Facebook Login: request the Page scopes directly.
    params.set("scope", metaFacebookLoginScopesFor(intent).join(","));
    params.set("auth_type", "rerequest");
    params.set("return_scopes", "true");
  }

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

export function metaUsesBusinessLogin() {
  return Boolean(process.env.META_BUSINESS_LOGIN_CONFIG_ID || process.env.META_CONFIG_ID);
}

/**
 * Look up which Facebook account a user access token belongs to. Used to
 * explain "no Pages returned" failures (the #1 cause is signing in with a
 * personal account that has no admin role on the target Page).
 */
export async function fetchMetaUserIdentity(userAccessToken: string): Promise<{ id: string; name: string } | null> {
  const params = new URLSearchParams({ fields: "id,name", access_token: userAccessToken });
  const response = await fetch(graphUrl(`/me?${params.toString()}`), { cache: "no-store" });
  const body = await response.json();
  if (!response.ok || !body.id) return null;
  return { id: body.id as string, name: typeof body.name === "string" ? body.name : "" };
}

/**
 * Probe what the user token can actually see, for diagnosing "no Pages
 * returned" failures: the raw /me/accounts result, the businesses the token
 * can enumerate, and which permissions Graph reports as granted.
 */
export async function probeMetaPageAccess(userAccessToken: string) {
  const accountsParams = new URLSearchParams({ fields: "id,name,tasks", access_token: userAccessToken });
  const accountsRes = await fetch(graphUrl(`/me/accounts?${accountsParams.toString()}`), { cache: "no-store" });
  const accountsBody = await accountsRes.json().catch(() => ({} as Record<string, unknown>));
  const accountsData = Array.isArray((accountsBody as { data?: unknown }).data)
    ? ((accountsBody as { data: Array<{ id?: string; name?: string }> }).data)
    : [];

  const permsRes = await fetch(graphUrl(`/me/permissions?access_token=${encodeURIComponent(userAccessToken)}`), {
    cache: "no-store"
  });
  const permsBody = await permsRes.json().catch(() => ({} as Record<string, unknown>));
  const grantedPermissions = Array.isArray((permsBody as { data?: unknown }).data)
    ? ((permsBody as { data: Array<{ permission?: string; status?: string }> }).data)
        .filter((p) => p.status === "granted")
        .map((p) => p.permission ?? "")
        .filter(Boolean)
    : [];

  const bizParams = new URLSearchParams({ fields: "id,name", access_token: userAccessToken });
  const bizRes = await fetch(graphUrl(`/me/businesses?${bizParams.toString()}`), { cache: "no-store" });
  const bizBody = await bizRes.json().catch(() => ({} as Record<string, unknown>));
  const businesses = Array.isArray((bizBody as { data?: unknown }).data)
    ? ((bizBody as { data: Array<{ id?: string; name?: string }> }).data).map((b) => b.name ?? b.id ?? "?")
    : [];

  return {
    accountsStatus: accountsRes.status,
    accountsCount: accountsData.length,
    accountsError: typeof (accountsBody as { error?: { message?: string } }).error?.message === "string"
      ? (accountsBody as { error: { message: string } }).error.message
      : null,
    grantedPermissions,
    businessesCount: businesses.length,
    businesses,
    businessesError: typeof (bizBody as { error?: { message?: string } }).error?.message === "string"
      ? (bizBody as { error: { message: string } }).error.message
      : null
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
  // Upload photo assets as unpublished, then create a feed story that attaches them.
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
