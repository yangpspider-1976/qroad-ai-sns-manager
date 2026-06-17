import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — QROAD AI SNS Manager"
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "sans-serif", lineHeight: 1.7, color: "#111" }}>
      <h1>Privacy Policy</h1>
      <p><strong>Last updated: June 2026</strong></p>

      <p>
        QROAD AI SNS Manager (&ldquo;the App&rdquo;) is an internal social media management tool operated by QROAD Philippines.
        This Privacy Policy explains how we collect, use, and protect information when you connect third-party social media
        accounts to the App.
      </p>

      <h2>1. Information We Collect</h2>
      <p>When you authorize a social media platform (Facebook, Instagram, TikTok) through the App, we receive and store:</p>
      <ul>
        <li>OAuth access tokens required to publish content on your behalf</li>
        <li>Basic account identifiers (user ID, username, display name) returned by the platform</li>
        <li>Granted permission scopes</li>
      </ul>
      <p>We do not collect passwords. Tokens are stored in an encrypted database and used solely to publish content you approve.</p>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To authenticate API calls to connected social media platforms</li>
        <li>To display connected account status in the dashboard</li>
        <li>To publish drafts you explicitly approve in the App</li>
      </ul>
      <p>We do not sell, share, or transfer your data to third parties outside of the connected platform APIs.</p>

      <h2>3. TikTok Data</h2>
      <p>
        When you connect a TikTok account, the App uses TikTok&apos;s Content Posting API to publish photo and video content
        on your behalf. We request only the scopes necessary for posting ({" "}
        <code>user.info.basic</code>, <code>video.upload</code>, <code>video.publish</code>). We do not read your
        followers, messages, or analytics.
      </p>

      <h2>4. Data Retention</h2>
      <p>
        Access tokens are retained until you disconnect the account from the Integrations page or request deletion.
        You may disconnect any connected account at any time through the dashboard.
      </p>

      <h2>5. Security</h2>
      <p>
        Tokens are stored in a private database accessible only to authorized QROAD operators. The App is not publicly
        accessible — it is an internal tool.
      </p>

      <h2>6. Contact</h2>
      <p>
        For privacy questions, contact us at: <strong>info@qroad.ph</strong>
      </p>
    </main>
  );
}
