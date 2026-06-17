export type TikTokUserInfo = {
  open_id: string;
  union_id?: string;
  avatar_url?: string;
  display_name: string;
};

type TikTokPhotoUploadInput = {
  accessToken: string;
  title: string;
  description: string;
  imageUrls: string[];
  postMode?: "DIRECT_POST" | "MEDIA_UPLOAD";
  privacyLevel?: string;
  disableComment?: boolean;
  autoAddMusic?: boolean;
  brandContentToggle?: boolean;
  brandOrganicToggle?: boolean;
};

export type TikTokPhotoUploadResult = {
  publishId: string;
  uploadUrl?: string;
  raw: unknown;
};

export type TikTokCreatorInfo = {
  creator_avatar_url?: string;
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options?: string[];
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
  max_video_post_duration_sec?: number;
};

function tiktokApiUrl(path: string) {
  return `https://open.tiktokapis.com${path}`;
}

export function tiktokConfigStatus() {
  const missing = ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REDIRECT_URI"].filter(
    (key) => !process.env[key]
  );
  return { configured: missing.length === 0, missing };
}

export function tiktokOAuthScopes() {
  const raw = process.env.TIKTOK_SCOPES || "user.info.basic,video.upload,video.publish";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildTikTokOAuthUrl(workspaceId: string) {
  const status = tiktokConfigStatus();
  if (!status.configured) {
    throw new Error(`Missing TikTok environment variables: ${status.missing.join(", ")}`);
  }

  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
    response_type: "code",
    scope: tiktokOAuthScopes().join(","),
    redirect_uri: process.env.TIKTOK_REDIRECT_URI ?? "",
    state: workspaceId
  });

  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

export async function exchangeTikTokCode(code: string) {
  const response = await fetch(tiktokApiUrl("/v2/oauth/token/"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
      client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "",
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.TIKTOK_REDIRECT_URI ?? ""
    }).toString(),
    cache: "no-store"
  } as RequestInit);
  const body = await response.json();
  if (!response.ok || body.error) {
    throw new Error(body.error_description ?? body.error ?? "TikTok token exchange failed.");
  }
  return body as {
    access_token: string;
    expires_in: number;
    open_id: string;
    refresh_token: string;
    refresh_expires_in: number;
    scope: string;
    token_type: string;
  };
}

export async function fetchTikTokUserInfo(accessToken: string): Promise<TikTokUserInfo> {
  const params = new URLSearchParams({ fields: "open_id,union_id,avatar_url,display_name" });
  const response = await fetch(tiktokApiUrl(`/v2/user/info/?${params.toString()}`), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  } as RequestInit);
  const body = await response.json();
  if (!response.ok || body.error?.code !== "ok") {
    throw new Error(body.error?.message ?? "TikTok user info fetch failed.");
  }
  return body.data?.user as TikTokUserInfo;
}

function truncateUtf16(value: string, maxLength: number) {
  return Array.from(value).slice(0, maxLength).join("");
}

export function buildTikTokPhotoPostInfo(title: string, description: string) {
  return {
    title: truncateUtf16(title.trim() || "SNS post", 90),
    description: truncateUtf16(description.trim(), 4000)
  };
}

export async function fetchTikTokCreatorInfo(accessToken: string): Promise<TikTokCreatorInfo> {
  const response = await fetch(tiktokApiUrl("/v2/post/publish/creator_info/query/"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8"
    },
    cache: "no-store"
  } as RequestInit);
  const body = await response.json();
  if (!response.ok || body.error?.code !== "ok") {
    throw new Error(body.error?.message ?? "TikTok creator info fetch failed.");
  }
  return body.data as TikTokCreatorInfo;
}

export async function uploadTikTokPhotoPost({
  accessToken,
  title,
  description,
  imageUrls,
  postMode = "MEDIA_UPLOAD",
  privacyLevel,
  disableComment,
  autoAddMusic,
  brandContentToggle,
  brandOrganicToggle
}: TikTokPhotoUploadInput): Promise<TikTokPhotoUploadResult> {
  const postInfo = {
    ...buildTikTokPhotoPostInfo(title, description),
    ...(postMode === "DIRECT_POST"
      ? {
          privacy_level: privacyLevel,
          disable_comment: Boolean(disableComment),
          auto_add_music: Boolean(autoAddMusic),
          brand_content_toggle: Boolean(brandContentToggle),
          brand_organic_toggle: Boolean(brandOrganicToggle)
        }
      : {})
  };
  const response = await fetch(tiktokApiUrl("/v2/post/publish/content/init/"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8"
    },
    body: JSON.stringify({
      media_type: "PHOTO",
      post_mode: postMode,
      post_info: postInfo,
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: 0,
        photo_images: imageUrls
      }
    }),
    cache: "no-store"
  } as RequestInit);
  const body = await response.json();
  if (!response.ok || body.error?.code !== "ok") {
    throw new Error(body.error?.message ?? body.error_description ?? "TikTok photo upload failed.");
  }

  return {
    publishId: String(body.data?.publish_id ?? ""),
    uploadUrl: body.data?.upload_url,
    raw: body
  };
}
