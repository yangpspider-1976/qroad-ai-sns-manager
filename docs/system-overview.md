**AI Social Media Posting Automation System**

*System Understanding Guide for Developers*

Prepared for QROAD Philippines | Version 1.0 | 2026-06-11

**Document purpose:**

This document explains the product concept, business purpose, user workflow, module design, platform constraints, and recommended MVP scope for an AI-powered tool that helps QROAD Philippines create, localize, approve, schedule, publish, and analyze social media posts across Facebook, Instagram, and TikTok.

# **1\. Executive Summary**

The proposed system is not just a bulk posting tool. It should be designed as an AI Social Media Operations Manager for SMEs and agencies. The system helps users generate draft content, adapt it for each platform, create image or video asset instructions, manage approval, schedule publishing, monitor engagement, and improve future posts based on performance data.

| Item | Recommended Direction |
| :---- | :---- |
| Product concept | AI Social Media Operations Manager for SMEs and agencies |
| Primary users | QROAD internal marketers, account managers, designers, client approvers, and later external SME clients |
| Core platforms | Facebook Pages, Instagram Professional Accounts, TikTok creator/business accounts |
| MVP principle | Human-reviewed automation: AI drafts content, humans approve before publishing |
| Business outcome | Reduce content production time, standardize SNS operations, improve lead generation, and support QROAD monthly management packages |

# **2\. Business Context and Goals**

QROAD Philippines wants to manage SNS marketing for its own business and for client businesses. The marketing strategy emphasizes lead generation through free digital audits, social media management, website development, and digital marketing services. The new tool should support that workflow by reducing repetitive work and giving non-technical operators a structured process.

* Create platform-specific posts from a single content brief.  
* Generate English, Korean, Filipino, and Taglish variants for different target audiences.  
* Generate image copy, thumbnail text, short-form video scripts, and designer task briefs.  
* Schedule content across Facebook, Instagram, and TikTok with approval controls.  
* Collect engagement data and suggest the next content direction.  
* Generate client-facing reports and support QROAD service upsell.

# **3\. Target Users and Permissions**

| User Role | Main Responsibilities | Required Access |
| :---- | :---- | :---- |
| Admin | Create workspaces, connect platform accounts, manage users, configure AI and API keys. | Full access |
| Marketing Manager | Create campaigns, generate content, review drafts, approve schedules, review performance. | Workspace management and approval |
| Content Operator | Create drafts, edit captions, upload assets, prepare scheduled posts. | Draft and edit access |
| Designer / Editor | Review image/video requirements, upload final assets, update thumbnails. | Asset access only |
| Client Approver | Review content, leave comments, approve or reject posts. | Review-only approval access |
| Viewer | View calendar and reports without editing. | Read-only access |

# **4\. End-to-End Workflow**

The recommended default workflow should be:

1. Create or select a brand workspace.  
2. Enter a content brief: objective, target audience, offer, language, platforms, and preferred tone.  
3. AI generates platform-specific draft captions, hashtags, CTA options, image text, and short-form video script.  
4. Operator reviews and edits the drafts.  
5. AI performs quality checks for clarity, CTA strength, platform fit, duplication, and risky claims.  
6. Manager or client approves the content.  
7. System schedules or publishes to the selected platforms.  
8. System stores publishing logs and post identifiers.  
9. System collects performance metrics and engagement messages when supported by API permissions.  
10. AI recommends content improvements and prepares weekly/monthly reports.

# **5\. Core Product Modules**

| Module | Purpose | Main Functions |
| :---- | :---- | :---- |
| Brand Workspace | Manage each client or brand separately. | Brand profile, tone, services, target customers, default CTA, prohibited claims, platform connections. |
| AI Content Studio | Generate and refine social media content. | Captions, headlines, hooks, hashtags, CTA, translations, platform-specific variants, A/B versions. |
| Asset Generator | Support image/video production. | Template-based image generation, image copy, thumbnail copy, AI image prompts, designer task briefs. |
| Publishing Calendar | Plan and control publishing. | Draft status, approval status, scheduled time, platform previews, publishing logs, failed job retry. |
| Engagement Inbox | Centralize comments and lead signals. | Comment collection, AI response suggestions, hot lead detection, assignment, status tracking. |
| Performance Report | Analyze results and generate reports. | Reach, impressions, engagement, clicks, leads, best content, recommendations, monthly PDF/DOCX report. |

# **6\. Recommended MVP Scope**

The MVP should focus on reliable content creation, approval, scheduling, and basic publishing. Advanced automation should be added later after API approvals and operational validation.

| Included in MVP | Reason |
| :---- | :---- |
| Brand/client workspace | Required for agency-style operations and future SaaS expansion. |
| AI caption and content brief generator | Immediate productivity gain for operators. |
| Platform-specific content variants | Facebook, Instagram, and TikTok require different caption length, tone, and format. |
| Image copy and template-based asset generation | Safer and more controllable than fully automated design in the first release. |
| Approval workflow | Prevents accidental publishing and protects client accounts. |
| Content calendar | Core operating screen for weekly/monthly SNS management. |
| Facebook Page and Instagram publishing integration | Most realistic first API integration path through Meta Graph API. |
| TikTok draft/upload mode first | Lower risk than direct auto-publishing while app approval is pending. |
| Publishing logs and failure states | Required for debugging and operational trust. |
| Basic performance dashboard | Enables content improvement and client reporting. |

# **7\. Functions to Defer Until Phase 2 or 3**

| Function | Why It Should Be Deferred |
| :---- | :---- |
| Fully automatic TikTok Direct Post | Requires specific TikTok permissions, app review, user authorization, and careful privacy/disclosure UX. |
| Automatic ad campaign launch | High risk if budgets are spent without human approval. |
| Competitor crawling | Potential platform policy and data compliance issues. |
| Bulk DM automation | High spam and policy risk. |
| Advanced video editing | Large scope; better to integrate with external tools or generate editor briefs first. |
| Full CRM automation | Useful later, but first prove content and publishing workflow. |

# **8\. Platform API Reality Check**

The system must be designed around official platform APIs and permission review. Do not build workflows that depend on browser automation, password sharing, unofficial scraping, or automating personal profiles. These approaches are unstable and may violate platform policies.

| Platform | Recommended MVP Handling | Important Notes |
| :---- | :---- | :---- |
| Facebook | Publish to Facebook Pages through Meta Graph API / Pages API. | Focus on Page posts, not personal profiles. Requires Page access tokens and permissions such as pages\_manage\_posts and pages\_read\_engagement. |
| Instagram | Publish to Instagram Professional Accounts through Instagram Graph API content publishing. | Usually requires an Instagram Professional account linked to a Facebook Page. Content publishing uses media container creation and publishing steps. |
| TikTok | Start with upload/draft workflow. Add direct publish after app review and permission approval. | Content Posting API supports direct post and upload workflows, but direct post requires stricter review and user authorization. |

# **9\. AI Capabilities**

| Capability | Input | Output |
| :---- | :---- | :---- |
| Content generation | Goal, target, offer, tone, platform, language. | Captions, hooks, titles, CTA, hashtags. |
| Localization | Original draft and target market. | English, Korean, Filipino, Taglish versions with local marketing phrasing. |
| Image asset support | Post topic and platform size. | Image headline, subtitle, CTA, prompt, template placement. |
| Short-form script | Topic and desired video length. | Hook, scene breakdown, caption, voiceover, thumbnail text. |
| Quality scoring | Draft content and brand rules. | Clarity score, CTA score, platform fit, risk warnings. |
| Performance interpretation | Metrics by platform and post. | Plain-English analysis and next content recommendations. |

# **10\. Brand Profile Requirements**

Each brand workspace should store structured brand memory so that AI output remains consistent.

| Field | Example for QROAD Philippines |
| :---- | :---- |
| Company name | QROAD Philippines |
| Services | Social media management, website development, digital marketing, influencer support, online store support. |
| Target audience | Philippine SMEs, Korean-owned businesses in the Philippines, K-brands, game/content/e-commerce companies. |
| Core message | Korean-standard execution \+ Philippine-local digital marketing. |
| Default offer | Free Digital Growth Audit and 15-minute consultation. |
| Tone | Professional, practical, trustworthy, not exaggerated. |
| Languages | English, Korean, Taglish, Filipino. |
| Prohibited claims | Guaranteed revenue, 100% success, unverified awards, unsupported performance promises. |

# **11\. High-Level Architecture**

Recommended architecture for the first production-ready MVP:

* Frontend: Next.js or React-based dashboard with Tailwind CSS for fast admin UI development.  
* Backend: Node.js API routes or Express/NestJS service for API orchestration, OAuth callbacks, AI generation, and publishing jobs.  
* Database: PostgreSQL or Supabase Postgres for workspaces, users, brands, posts, assets, approvals, schedules, logs, and metrics.  
* Storage: Supabase Storage, S3-compatible storage, or local storage for MVP assets and generated images.  
* Job queue: BullMQ/Redis, Supabase Edge Functions, or a simple cron worker for scheduled publishing.  
* AI provider abstraction: OpenAI, Anthropic, or other model providers should be wrapped behind one internal service interface.  
* Platform adapter layer: Separate Meta and TikTok integration services so API changes do not affect the whole application.  
* Mock mode: Build a mock publisher first to validate UI and workflow before live API integrations.

# **12\. Suggested Data Model**

| Entity | Purpose | Key Fields |
| :---- | :---- | :---- |
| Workspace | Separates each client or brand. | id, name, owner\_id, timezone, status |
| BrandProfile | Stores AI brand memory. | workspace\_id, services, audience, tone, prohibited\_terms, default\_cta |
| SocialAccount | Stores platform connection data. | platform, account\_id, display\_name, token\_reference, permissions, expiry |
| ContentBrief | Stores user input for AI generation. | objective, target, offer, language, platforms, campaign |
| PostDraft | Stores generated and edited content. | brief\_id, platform, caption, hashtags, media\_requirements, status |
| Asset | Stores media files and image prompts. | type, url, prompt, size, status |
| Approval | Tracks review workflow. | post\_id, reviewer\_id, status, comment, approved\_at |
| Schedule | Tracks publishing schedule. | post\_id, platform, scheduled\_at, timezone, job\_status |
| PublishLog | Stores API result and errors. | post\_id, platform\_post\_id, status, request\_id, error\_message |
| PostMetric | Stores performance data. | post\_id, reach, impressions, comments, clicks, leads, collected\_at |

# **13\. Security and Compliance Principles**

* Never store plain-text API tokens in the database. Use encrypted storage or a secrets manager.  
* Implement role-based access control at workspace level.  
* Log all publishing actions with user, timestamp, platform, and API response.  
* Use OAuth where supported instead of asking users to share passwords.  
* Provide a clear privacy policy and terms page before app review.  
* Maintain separate development, staging, and production environments.  
* Keep a mock publishing mode so testing does not accidentally publish to real accounts.  
* Add human approval before any public publishing action in the MVP.

# **14\. Reporting and Analytics**

The first version does not need deep analytics. However, the system should collect enough data to explain what worked and what should be posted next.

| Metric Group | Examples |
| :---- | :---- |
| Publishing operations | Number of drafts, approved posts, scheduled posts, published posts, failed posts. |
| Content performance | Reach, impressions, reactions, comments, shares, saves, clicks. |
| Lead signals | Comments asking price, consultation requests, DM handoff count, form clicks. |
| AI recommendations | Best topic, best CTA, best platform, next content suggestions. |
| Client report | Monthly content count, top posts, comments/leads, next month plan. |

# **15\. Roadmap**

| Phase | Goal | Scope |
| :---- | :---- | :---- |
| Phase 1 \- Internal MVP | Build a usable internal SNS production and scheduling tool. | Brand workspace, AI content studio, approval, calendar, mock publishing, Meta publishing integration, basic reports. |
| Phase 2 \- Agency Workflow | Support QROAD client operations. | Client approval links, monthly report generator, engagement inbox, TikTok draft/upload, better analytics. |
| Phase 3 \- SaaS Extension | Offer the tool as a client-facing platform. | Self-service onboarding, subscription billing, multi-language templates, advanced integrations. |
| Phase 4 \- Growth Automation | Connect content performance to paid media and sales. | Ad candidate recommendation, proposal generation, Free Digital Growth Audit automation, CRM integration. |

# **16\. Main Risks and Mitigation**

| Risk | Impact | Mitigation |
| :---- | :---- | :---- |
| Platform API approval delays | Publishing may not work immediately for all accounts. | Start with mock mode and manual export. Prioritize Meta first and TikTok draft upload second. |
| Accidental publishing | Client trust and brand damage. | Require approval state before scheduled publishing. |
| Poor AI output quality | Low content quality and repeated edits. | Use brand profiles, templates, prompt versioning, and quality scoring. |
| Token expiry or revoked permissions | Publishing failures. | Build token status checks, re-authentication flow, and clear error messages. |
| Over-automation | Spam-like behavior or policy risk. | Limit automated posting frequency and avoid unsolicited DM automation. |
| Weak reporting | Clients may not see value. | Generate monthly reports with content count, top posts, lead signals, and next actions. |

# **17\. API Reference Links for Developers**

* Meta Graph API Overview: https://developers.facebook.com/docs/graph-api/overview/  
* Meta Pages API: https://developers.facebook.com/docs/pages-api/  
* Facebook Pages API \- Posts: https://developers.facebook.com/docs/pages-api/posts/  
* Instagram Platform / Instagram API: https://developers.facebook.com/docs/instagram-platform/  
* Instagram Content Publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/  
* Meta App Review: https://developers.facebook.com/docs/app-review/  
* TikTok Content Posting API \- Get Started: https://developers.tiktok.com/doc/content-posting-api-get-started/  
* TikTok Content Posting API \- Direct Post: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post/  
* TikTok Content Posting API \- Upload Content: https://developers.tiktok.com/doc/content-posting-api-get-started-upload-content/  
* TikTok Content Posting API \- Video Status: https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status/

# **18\. Final Developer Notes**

Build this as a controlled workflow product, not as an unsafe automation bot. The MVP should help QROAD create better content faster, approve it safely, publish reliably, and explain performance clearly.