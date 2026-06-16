**AI SNS Posting Automation Tool**

*Claude Code Development Task Instruction Document*

Prepared for QROAD Philippines | Version 1.0 | 2026-06-11

**Document purpose:**

This document is written as a practical implementation instruction for Claude Code. It defines the development objective, recommended stack, folder structure, build phases, acceptance criteria, and specific tasks for building an MVP AI social media posting automation tool for QROAD Philippines.

# **1\. Role and Objective for Claude Code**

Use the following role definition when starting the Claude Code project:

You are a senior full-stack engineer building a secure internal MVP for QROAD Philippines.  
Your goal is to create an AI-powered social media posting automation dashboard that helps users generate, localize, approve, schedule, and publish posts for Facebook, Instagram, and TikTok.  
Build incrementally. Use mock integrations first. Do not hardcode secrets. Do not use unofficial scraping or password-based automation.

# **2\. Product Name and MVP Goal**

| Item | Specification |
| :---- | :---- |
| Project name | QROAD AI SNS Manager |
| MVP goal | Create an internal web dashboard for AI-assisted SNS content creation, approval, scheduling, and basic publishing workflow. |
| Initial users | QROAD marketing operators and managers. |
| Primary platforms | Facebook Page, Instagram Professional Account, TikTok draft/upload workflow. |
| Must-have principle | No content should be publicly published unless it is approved. |
| Initial deployment mode | Local-first development with environment-based API keys and optional cloud deployment later. |

# **3\. Recommended Tech Stack**

| Layer | Recommended Choice | Reason |
| :---- | :---- | :---- |
| Frontend | Next.js \+ React \+ Tailwind CSS | Fast dashboard development, good routing, reusable components. |
| Backend | Next.js API routes or Node.js service layer | Simplifies MVP development while supporting future separation. |
| Database | PostgreSQL via Supabase or local Postgres with Prisma | Reliable relational model for workspaces, posts, approvals, schedules, logs. |
| ORM | Prisma | Clear schema, migrations, typed client. |
| Auth | NextAuth/Auth.js or simple local admin auth for MVP | Use secure auth; avoid hardcoded admin bypass in production. |
| Storage | Local storage for MVP, Supabase Storage/S3 later | Store generated images, uploaded assets, and thumbnails. |
| Job queue | Simple cron worker first; BullMQ \+ Redis later | Scheduled publishing can begin with a lightweight worker. |
| AI service | Provider adapter pattern | Allows OpenAI/Anthropic/local models to be swapped later. |
| Testing | Vitest/Jest \+ Playwright optional | Unit tests for services and workflow validation. |

# **4\. Environment Variables**

Create .env.example with the following variables. Do not commit real secrets.

\# App  
APP\_URL=http://localhost:3000  
DATABASE\_URL=postgresql://user:password@localhost:5432/qroad\_ai\_sns  
NEXTAUTH\_SECRET=replace\_me  
NEXTAUTH\_URL=http://localhost:3000

\# AI Provider  
AI\_PROVIDER=openai  
OPENAI\_API\_KEY=  
ANTHROPIC\_API\_KEY=

\# Meta API  
META\_APP\_ID=  
META\_APP\_SECRET=  
META\_GRAPH\_VERSION=v23.0  
META\_REDIRECT\_URI=http://localhost:3000/api/auth/meta/callback

\# TikTok API  
TIKTOK\_CLIENT\_KEY=  
TIKTOK\_CLIENT\_SECRET=  
TIKTOK\_REDIRECT\_URI=http://localhost:3000/api/auth/tiktok/callback

\# Storage  
STORAGE\_PROVIDER=local  
LOCAL\_UPLOAD\_DIR=./uploads

\# Safety  
MOCK\_PUBLISHING=true  
REQUIRE\_APPROVAL\_BEFORE\_PUBLISH=true

# **5\. Required Folder Structure**

qroad-ai-sns-manager/  
  app/  
    dashboard/  
    workspaces/  
    content-studio/  
    calendar/  
    approvals/  
    reports/  
    settings/  
    api/  
      ai/  
      publish/  
      auth/  
      webhooks/  
  components/  
    layout/  
    forms/  
    content/  
    calendar/  
    reports/  
  lib/  
    ai/  
    auth/  
    db/  
    platform/  
      meta/  
      tiktok/  
      mock/  
    scheduler/  
    validation/  
  prisma/  
    schema.prisma  
    migrations/  
  scripts/  
    seed.ts  
    worker.ts  
  tests/  
  docs/  
  uploads/  
  .env.example  
  README.md

# **6\. Database Schema Requirements**

Implement the following entities in Prisma. Names can be adjusted, but the workflow must be preserved.

| Model | Purpose | Minimum Fields |
| :---- | :---- | :---- |
| User | System user accounts. | id, email, name, role, createdAt |
| Workspace | Client or brand workspace. | id, name, timezone, ownerId, status |
| WorkspaceMember | User access by workspace. | workspaceId, userId, role |
| BrandProfile | Brand memory for AI generation. | workspaceId, services, targetAudience, tone, defaultCta, prohibitedTerms, languages |
| SocialAccount | Connected platform account. | workspaceId, platform, accountName, externalAccountId, tokenEncrypted, tokenExpiresAt, scopes |
| ContentBrief | User input before AI generation. | workspaceId, objective, audience, offer, language, platforms, notes |
| PostDraft | Generated or edited post. | briefId, workspaceId, platform, caption, hashtags, status, scheduledAt |
| MediaAsset | Images/videos/thumbnails. | workspaceId, postDraftId, type, url, prompt, width, height, status |
| Approval | Review workflow. | postDraftId, reviewerId, status, comment, approvedAt |
| PublishJob | Scheduled publishing task. | postDraftId, platform, runAt, status, retryCount, error |
| PublishLog | API result log. | postDraftId, platform, platformPostId, status, requestPayload, responsePayload, errorMessage |
| PostMetric | Post performance data. | postDraftId, reach, impressions, engagement, comments, clicks, leads, collectedAt |
| AuditLog | Security and action history. | userId, workspaceId, action, entityType, entityId, metadata, createdAt |

# **7\. Build Phase 0 \- Project Setup and Guardrails**

1. Initialize a new Git repository and create a clean Next.js project.  
2. Install Tailwind CSS, Prisma, database client, validation library, date utility, and testing framework.  
3. Create .env.example and never commit real API keys.  
4. Add README.md with local installation steps.  
5. Add mock mode as the default publishing mode.  
6. Create a simple health check endpoint.  
7. Set up linting and formatting.

Acceptance criteria:

* npm install and npm run dev start successfully.  
* Database migration runs successfully.  
* App shows a working dashboard shell.  
* No real platform publishing is possible while MOCK\_PUBLISHING=true.

# **8\. Build Phase 1 \- Workspace and Brand Profile**

8. Create workspace list, create workspace, edit workspace, and workspace detail pages.  
9. Create Brand Profile form with company name, services, target audience, tone, languages, default CTA, and prohibited terms.  
10. Create default seed data for QROAD Philippines.  
11. Implement role-based UI logic for Admin, Manager, Operator, Client Approver, and Viewer.  
12. Add audit logs for workspace and brand profile changes.

Acceptance criteria:

* User can create a QROAD Philippines workspace.  
* Brand profile can be saved and loaded.  
* AI generation requests can read the saved brand profile.  
* Workspace pages do not expose data from other workspaces.

# **9\. Build Phase 2 \- AI Content Studio**

Create an AI content generation workflow that converts one brief into platform-specific posts.

13. Create Content Brief form: objective, target audience, offer, language, platforms, tone, content type, notes.  
14. Build AI provider adapter: generateContentBriefVariants(input) returns structured JSON.  
15. Create prompts for Facebook, Instagram, TikTok, image copy, hashtags, CTA, and short-form script.  
16. Store each generated result as PostDraft records.  
17. Allow manual editing of every draft.  
18. Add A/B version generation: problem-based, benefit-based, proof-based, price-based, and trust-based variants.  
19. Add quality scoring: hook strength, clarity, CTA strength, platform fit, risk warning, duplication warning.

Required AI JSON output shape:

{  
  "briefSummary": "string",  
  "platformDrafts": \[  
    {  
      "platform": "facebook|instagram|tiktok",  
      "caption": "string",  
      "hashtags": \["string"\],  
      "cta": "string",  
      "imageText": {  
        "headline": "string",  
        "subtitle": "string",  
        "buttonText": "string"  
      },  
      "videoScript": {  
        "hook": "string",  
        "scenes": \["string"\],  
        "voiceover": "string",  
        "thumbnailText": "string"  
      },  
      "qualityScore": {  
        "hook": 1,  
        "clarity": 1,  
        "cta": 1,  
        "platformFit": 1,  
        "riskLevel": "low|medium|high",  
        "warnings": \["string"\]  
      }  
    }  
  \]  
}

Acceptance criteria:

* One user brief can generate Facebook, Instagram, and TikTok drafts.  
* Generated content follows the saved brand profile.  
* User can edit and save every draft.  
* Risky claims are flagged before approval.

# **10\. Build Phase 3 \- Asset Generator**

20. Create a simple template-based image generator using HTML/CSS rendering or canvas/SVG output.  
21. Support at least three sizes: 1080x1080, 1080x1920, and 1200x630.  
22. Generate image headline, subtitle, and CTA text from the PostDraft.  
23. Allow user to export image as PNG.  
24. Create designer task brief output for cases where a human designer will finish the asset.  
25. Store generated assets as MediaAsset records linked to PostDraft.

Acceptance criteria:

* User can generate a simple branded image from a draft.  
* Images are saved and visible in platform preview.  
* Designer task brief includes size, text, tone, layout guidance, and CTA.

# **11\. Build Phase 4 \- Approval Workflow**

26. Implement post statuses: Draft, Ready for Review, Revision Requested, Approved, Scheduled, Published, Failed, Archived.  
27. Create approval page showing caption, hashtags, image preview, video script, and schedule time.  
28. Allow reviewers to approve, reject, or request changes with comments.  
29. Block scheduling and publishing if REQUIRE\_APPROVAL\_BEFORE\_PUBLISH=true and status is not Approved.  
30. Add approval history and audit logs.

Acceptance criteria:

* Draft cannot be scheduled unless approved.  
* Approver can leave comments.  
* Status transitions are visible and logged.

# **12\. Build Phase 5 \- Publishing Calendar and Scheduler**

31. Create monthly and weekly calendar views.  
32. Allow approved posts to be scheduled by platform and time zone.  
33. Create PublishJob records for scheduled posts.  
34. Build scheduler worker that checks due jobs every minute in development mode.  
35. In mock mode, mark jobs as Published and create fake platformPostId.  
36. Create Failed state with retry button and error message display.  
37. Create publishing log page for debugging.

Acceptance criteria:

* Approved posts can be scheduled from calendar.  
* Mock publishing creates logs without calling live APIs.  
* Failed jobs show clear error messages.  
* No unapproved post can be published.

# **13\. Build Phase 6 \- Platform Adapter Layer**

Create platform adapters behind a common interface so that mock publishing and live APIs use the same application workflow.

interface PublisherAdapter {  
  platform: 'facebook' | 'instagram' | 'tiktok' | 'mock';  
  validatePost(postDraft, mediaAssets): Promise\<ValidationResult\>;  
  publishPost(postDraft, mediaAssets, socialAccount): Promise\<PublishResult\>;  
  getPostMetrics?(platformPostId, socialAccount): Promise\<PostMetricResult\>;  
}

## **13.1 Meta Adapter**

* Implement OAuth connection placeholder first.  
* Store social account metadata and token reference securely.  
* Implement Facebook Page publishing only after mock workflow is stable.  
* Implement Instagram publishing after account linking and permissions are confirmed.  
* Use the official Meta Graph API and Pages API only. Do not automate browser sessions.

## **13.2 TikTok Adapter**

* Start with draft/upload workflow or manual export if API approval is not ready.  
* Direct post should be feature-flagged and disabled by default.  
* Use OAuth and the official TikTok Content Posting API only.  
* Support privacy/disclosure fields when required by the API.

Acceptance criteria:

* The same UI can publish through mock adapter or real adapter based on environment settings.  
* Platform adapters return structured success/failure results.  
* All API errors are stored in PublishLog.

# **14\. Build Phase 7 \- Engagement Inbox**

38. Create engagement inbox UI with platform, post, comment/message text, lead score, status, and assigned user.  
39. For MVP, allow manual import or mock comment generation if live APIs are not approved.  
40. Add AI response suggestion based on brand profile.  
41. Classify messages as Hot Lead, Warm Lead, Cold Lead, Spam, or Support.  
42. Add status: New, Assigned, Responded, Closed.

Acceptance criteria:

* User can review incoming comments in one screen.  
* AI suggests safe reply drafts.  
* Hot leads are highlighted.

# **15\. Build Phase 8 \- Performance Dashboard and Reports**

43. Create dashboard cards for drafts, scheduled posts, published posts, failed jobs, and lead signals.  
44. Create post-level performance table.  
45. Add manual or mock metric entry for early MVP testing.  
46. Generate AI performance summary using available metrics.  
47. Create monthly report export in HTML/PDF or DOCX if feasible.  
48. Recommend next content topics based on best-performing drafts and metrics.

Acceptance criteria:

* Manager can see weekly/monthly operations overview.  
* Top posts are displayed.  
* AI produces a short next-action recommendation.

# **16\. UI Pages to Build**

| Page | Main Components |
| :---- | :---- |
| /dashboard | KPI cards, upcoming posts, failed jobs, quick actions. |
| /workspaces | Workspace list, create button, status. |
| /workspaces/\[id\]/settings | Brand profile, members, social accounts, prohibited terms. |
| /content-studio | Brief form, AI generation button, generated drafts, quality scores. |
| /calendar | Monthly/weekly calendar, scheduling controls, post status badges. |
| /approvals | Review queue, approve/reject buttons, comments. |
| /assets | Generated images, uploaded media, designer briefs. |
| /inbox | Comments/leads, AI reply suggestions, assignment. |
| /reports | Performance table, AI summary, monthly report export. |
| /settings/integrations | Meta/TikTok connection status, mock mode indicator. |

# **17\. Required Safety Rules**

* Do not publish unapproved content.  
* Do not store or log plain-text access tokens.  
* Do not automate personal Facebook profiles.  
* Do not build unofficial scraping or browser automation for platform posting.  
* Do not send automated bulk DMs.  
* Show clear warnings when API permissions are missing or tokens are expired.  
* Keep MOCK\_PUBLISHING=true by default in development.  
* Add confirmation modals before any live publishing action.

# **18\. Testing Requirements**

| Test Area | Required Tests |
| :---- | :---- |
| AI generation | Valid JSON output, brand profile usage, prohibited term detection, fallback when AI fails. |
| Approval workflow | Unapproved posts cannot be scheduled or published. |
| Scheduler | Due jobs are processed once, failure is logged, retry works. |
| Platform adapters | Mock adapter returns success, real adapter errors are handled safely. |
| Permissions | User roles cannot access unauthorized workspaces. |
| Data integrity | PostDraft, Approval, PublishJob, PublishLog relationships remain consistent. |
| UI | Main pages load, forms validate required fields, status badges update correctly. |

# **19\. Claude Code Implementation Prompt**

Copy and paste the following prompt into Claude Code after creating the project folder:

Build an MVP called QROAD AI SNS Manager.

Context:  
QROAD Philippines needs an internal AI-powered SNS operations dashboard for Facebook, Instagram, and TikTok. The system must help marketers create content drafts, localize them, generate image copy and short-form video scripts, approve content, schedule posts, publish in mock mode first, and later connect to Meta and TikTok official APIs.

Build requirements:  
1\. Use Next.js, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.  
2\. Create a workspace-based structure for multiple clients/brands.  
3\. Implement Brand Profile storage and seed QROAD Philippines sample data.  
4\. Implement AI Content Studio with structured JSON output for platform-specific drafts.  
5\. Implement editable PostDraft records with statuses.  
6\. Implement approval workflow. Do not allow scheduling/publishing unless approved.  
7\. Implement calendar scheduling and mock publishing worker.  
8\. Implement platform adapter interface with mock, Meta placeholder, and TikTok placeholder adapters.  
9\. Implement MediaAsset handling and simple template-based image generation/export.  
10\. Implement basic dashboard, reports, and audit logs.  
11\. Keep MOCK\_PUBLISHING=true by default.  
12\. Do not use unofficial scraping, browser automation, or password-based posting.  
13\. Write README setup instructions, .env.example, and basic tests.

Development approach:  
Work in small commits/phases. After each phase, run type checks, linting, and tests. If a requirement depends on external API approval, create a mock or placeholder implementation and clearly document what is needed for live integration.

# **20\. Step-by-Step Build Checklist**

| Step | Task | Done When |
| :---- | :---- | :---- |
| 1 | Create project and install dependencies. | App runs locally and shows dashboard shell. |
| 2 | Define Prisma schema and migrate database. | All required tables exist. |
| 3 | Create seed data for QROAD workspace. | Dashboard shows sample workspace. |
| 4 | Build Brand Profile form. | Profile saves and loads. |
| 5 | Build AI Content Studio. | A brief generates platform drafts. |
| 6 | Build PostDraft editor. | Drafts can be edited and saved. |
| 7 | Build approval workflow. | Only approved posts can be scheduled. |
| 8 | Build calendar and scheduler. | Mock posts publish at scheduled time. |
| 9 | Build media asset generator. | User can generate/export simple branded images. |
| 10 | Build platform adapters. | Mock works; Meta/TikTok placeholders documented. |
| 11 | Build engagement inbox mock. | Comments can be classified and assigned. |
| 12 | Build reports page. | Monthly summary and AI recommendations appear. |
| 13 | Add tests and README. | Setup and test instructions are clear. |

# **21\. Definition of Done for MVP**

* A non-technical operator can create a workspace and brand profile.  
* A content brief can generate Facebook, Instagram, and TikTok draft content.  
* Drafts can be edited, approved, scheduled, and mock-published.  
* The system blocks unapproved content from publishing.  
* The calendar clearly shows draft, approved, scheduled, published, and failed statuses.  
* Generated assets or asset instructions are connected to each post.  
* Publishing logs and audit logs exist.  
* Basic reports show operations summary and next content recommendations.  
* README explains how to run locally and how to switch from mock to live API integration later.  
* No secrets are committed to the repository.

# **22\. Live API Integration Notes**

* Meta integration requires creating a Meta Developer App, configuring OAuth redirect URI, requesting the required permissions, and completing App Review for live client use.  
* Facebook publishing should target Facebook Pages, not personal profiles.  
* Instagram publishing should target Instagram Professional Accounts connected to Facebook Pages.  
* TikTok direct publishing should remain disabled until the app has the required Content Posting API permissions and approval.  
* Implement re-authentication when access tokens expire or permissions are revoked.  
* Keep platform API version configurable through environment variables.

# **23\. API Reference Links**

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

# **24\. Final Instruction to Claude Code**

Do not attempt to implement all live platform APIs before the workflow is stable.  
First build the internal workflow with mock publishing.  
Then add real Meta integration.  
Then add TikTok upload/draft.  
Then add direct TikTok publishing only after approval and feature-flag review.  
Prioritize safety, logs, approval gates, and predictable operator workflow over aggressive automation.