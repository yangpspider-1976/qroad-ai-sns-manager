-- Local SQLite development schema for QROAD AI SNS Manager.
-- The executable setup source of truth is scripts/setup-db.ts because Prisma's
-- schema engine fails in this Windows/Node 24 environment.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Workspace (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Manila',
  ownerId TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT Workspace_ownerId_fkey FOREIGN KEY (ownerId) REFERENCES User (id)
);

CREATE TABLE IF NOT EXISTS WorkspaceMember (
  id TEXT PRIMARY KEY NOT NULL,
  workspaceId TEXT NOT NULL,
  userId TEXT NOT NULL,
  role TEXT NOT NULL,
  CONSTRAINT WorkspaceMember_workspaceId_fkey FOREIGN KEY (workspaceId) REFERENCES Workspace (id) ON DELETE CASCADE,
  CONSTRAINT WorkspaceMember_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS WorkspaceMember_workspaceId_userId_key ON WorkspaceMember(workspaceId, userId);

CREATE TABLE IF NOT EXISTS BrandProfile (
  id TEXT PRIMARY KEY NOT NULL,
  workspaceId TEXT NOT NULL UNIQUE,
  companyName TEXT NOT NULL,
  services TEXT NOT NULL,
  targetAudience TEXT NOT NULL,
  tone TEXT NOT NULL,
  defaultCta TEXT NOT NULL,
  prohibitedTerms TEXT NOT NULL,
  languages TEXT NOT NULL,
  coreMessage TEXT NOT NULL,
  CONSTRAINT BrandProfile_workspaceId_fkey FOREIGN KEY (workspaceId) REFERENCES Workspace (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS SocialAccount (
  id TEXT PRIMARY KEY NOT NULL,
  workspaceId TEXT NOT NULL,
  platform TEXT NOT NULL,
  accountName TEXT NOT NULL,
  externalAccountId TEXT NOT NULL,
  tokenEncrypted TEXT NOT NULL,
  tokenExpiresAt DATETIME,
  scopes TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT SocialAccount_workspaceId_fkey FOREIGN KEY (workspaceId) REFERENCES Workspace (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ContentBrief (
  id TEXT PRIMARY KEY NOT NULL,
  workspaceId TEXT NOT NULL,
  objective TEXT NOT NULL,
  audience TEXT NOT NULL,
  offer TEXT NOT NULL,
  language TEXT NOT NULL,
  platforms TEXT NOT NULL,
  tone TEXT NOT NULL,
  contentType TEXT NOT NULL,
  notes TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ContentBrief_workspaceId_fkey FOREIGN KEY (workspaceId) REFERENCES Workspace (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PostDraft (
  id TEXT PRIMARY KEY NOT NULL,
  briefId TEXT NOT NULL,
  workspaceId TEXT NOT NULL,
  platform TEXT NOT NULL,
  caption TEXT NOT NULL,
  hashtags TEXT NOT NULL,
  cta TEXT NOT NULL,
  imageText TEXT NOT NULL,
  videoScript TEXT NOT NULL,
  qualityScore TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduledAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PostDraft_briefId_fkey FOREIGN KEY (briefId) REFERENCES ContentBrief (id) ON DELETE CASCADE,
  CONSTRAINT PostDraft_workspaceId_fkey FOREIGN KEY (workspaceId) REFERENCES Workspace (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS MediaAsset (
  id TEXT PRIMARY KEY NOT NULL,
  workspaceId TEXT NOT NULL,
  postDraftId TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  prompt TEXT,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT MediaAsset_workspaceId_fkey FOREIGN KEY (workspaceId) REFERENCES Workspace (id) ON DELETE CASCADE,
  CONSTRAINT MediaAsset_postDraftId_fkey FOREIGN KEY (postDraftId) REFERENCES PostDraft (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Approval (
  id TEXT PRIMARY KEY NOT NULL,
  postDraftId TEXT NOT NULL,
  reviewerId TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  comment TEXT,
  approvedAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT Approval_postDraftId_fkey FOREIGN KEY (postDraftId) REFERENCES PostDraft (id) ON DELETE CASCADE,
  CONSTRAINT Approval_reviewerId_fkey FOREIGN KEY (reviewerId) REFERENCES User (id)
);

CREATE TABLE IF NOT EXISTS PublishJob (
  id TEXT PRIMARY KEY NOT NULL,
  postDraftId TEXT NOT NULL,
  platform TEXT NOT NULL,
  runAt DATETIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  retryCount INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PublishJob_postDraftId_fkey FOREIGN KEY (postDraftId) REFERENCES PostDraft (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PublishLog (
  id TEXT PRIMARY KEY NOT NULL,
  postDraftId TEXT NOT NULL,
  platform TEXT NOT NULL,
  platformPostId TEXT,
  status TEXT NOT NULL,
  requestPayload TEXT,
  responsePayload TEXT,
  errorMessage TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PublishLog_postDraftId_fkey FOREIGN KEY (postDraftId) REFERENCES PostDraft (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PostMetric (
  id TEXT PRIMARY KEY NOT NULL,
  postDraftId TEXT NOT NULL,
  reach INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  engagement INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  leads INTEGER NOT NULL DEFAULT 0,
  collectedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PostMetric_postDraftId_fkey FOREIGN KEY (postDraftId) REFERENCES PostDraft (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS AuditLog (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL,
  workspaceId TEXT NOT NULL,
  action TEXT NOT NULL,
  entityType TEXT NOT NULL,
  entityId TEXT NOT NULL,
  metadata TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT AuditLog_userId_fkey FOREIGN KEY (userId) REFERENCES User (id),
  CONSTRAINT AuditLog_workspaceId_fkey FOREIGN KEY (workspaceId) REFERENCES Workspace (id) ON DELETE CASCADE
);
