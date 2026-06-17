import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — QROAD AI SNS Manager"
};

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "sans-serif", lineHeight: 1.7, color: "#111" }}>
      <h1>Terms of Service</h1>
      <p><strong>Last updated: June 2026</strong></p>

      <p>
        These Terms of Service govern your use of QROAD AI SNS Manager (&ldquo;the App&rdquo;), an internal content
        scheduling and publishing tool operated by QROAD Philippines.
      </p>

      <h2>1. Acceptance</h2>
      <p>
        By accessing or using the App, you agree to these Terms. The App is intended for internal use by authorized
        QROAD team members only.
      </p>

      <h2>2. Use of the App</h2>
      <ul>
        <li>You may only connect social media accounts you own or are authorized to manage.</li>
        <li>You are responsible for all content published through the App from your connected accounts.</li>
        <li>You must comply with the terms of service of each connected platform (Facebook, Instagram, TikTok).</li>
        <li>You may not use the App to publish content that violates platform community guidelines or applicable law.</li>
      </ul>

      <h2>3. Third-Party Platform Access</h2>
      <p>
        The App connects to Facebook, Instagram, and TikTok via their official APIs. By connecting an account,
        you authorize the App to publish content on your behalf using the permissions you grant during the OAuth flow.
        You may revoke access at any time from the Integrations page or directly from the platform&apos;s settings.
      </p>

      <h2>4. Content</h2>
      <p>
        You retain ownership of all content you create and publish through the App. QROAD Philippines does not claim
        any rights over your published content.
      </p>

      <h2>5. Limitation of Liability</h2>
      <p>
        The App is provided &ldquo;as is&rdquo; for internal operational use. QROAD Philippines is not liable for
        publishing errors, API downtime, or platform-side rejections of content submitted through the App.
      </p>

      <h2>6. Changes</h2>
      <p>
        We may update these Terms as the App evolves. Continued use after changes constitutes acceptance of the
        updated Terms.
      </p>

      <h2>7. Contact</h2>
      <p>
        For questions about these Terms, contact: <strong>info@qroad.ph</strong>
      </p>
    </main>
  );
}
