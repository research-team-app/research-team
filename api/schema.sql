-- ResearchTeam local development schema
-- Run automatically by Docker Compose on first start (postgres initdb).
-- To reset: docker compose down -v && docker compose up

-- ── Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    profile_image_url TEXT,
    title TEXT,
    institution TEXT,
    department TEXT,
    bio TEXT,
    phone TEXT,
    linkedin_url TEXT,
    google_scholar_url TEXT,
    orcid_id TEXT,
    research_gate_url TEXT,
    personal_website TEXT,
    twitter_handle TEXT,
    resume_url TEXT,
    status TEXT DEFAULT 'public',
    current_projects TEXT,
    academic_status TEXT,
    research_interests TEXT,
    education TEXT,
    experience TEXT,
    publications TEXT,
    grants TEXT,
    deleted_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at)
WHERE
    deleted_at IS NOT NULL;

-- Grants
CREATE TABLE IF NOT EXISTS grants (
    id INTEGER PRIMARY KEY,
    number TEXT,
    title TEXT NOT NULL,
    agency_code TEXT,
    agency_name TEXT,
    open_date DATE,
    close_date DATE,
    opp_status TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grants_opp_status ON grants (opp_status);

CREATE INDEX IF NOT EXISTS idx_grants_agency ON grants (agency_name);

CREATE INDEX IF NOT EXISTS idx_grants_open_date ON grants (open_date);

CREATE INDEX IF NOT EXISTS idx_grants_close_date ON grants (close_date);

CREATE INDEX IF NOT EXISTS idx_grants_updated_at ON grants (updated_at DESC);

-- ── Grant details (full fetchOpportunity response cached for vector quality + API fallback) ──
-- grant_id PRIMARY KEY gives automatic index; WHERE grant_id = X is O(log n).
-- Extracted columns (synopsis … funding_categories) power vector embeddings and future filters.
CREATE TABLE IF NOT EXISTS grant_details (
    grant_id INTEGER PRIMARY KEY,
    synopsis TEXT, -- synopsis.synopsisDesc (main description for vectors)
    eligibility TEXT, -- synopsis.applicantEligibilityDesc
    award_floor TEXT, -- synopsis.awardFloorFormatted
    award_ceiling TEXT, -- synopsis.awardCeilingFormatted
    cost_sharing BOOLEAN, -- synopsis.costSharing
    agency_contact_email TEXT, -- synopsis.agencyContactEmail
    applicant_types TEXT, -- synopsis.applicantTypes as JSON text
    funding_instruments TEXT, -- synopsis.fundingInstruments as JSON text
    funding_categories TEXT, -- synopsis.fundingActivityCategories as JSON text
    raw_data TEXT, -- full fetchOpportunity JSON (TEXT not JSONB for DSQL)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants pipeline summary
CREATE TABLE IF NOT EXISTS grants_summary_cron (
    id SERIAL PRIMARY KEY,
    posted_count INTEGER,
    closed_count INTEGER,
    archived_count INTEGER,
    forecasted_count INTEGER,
    last_7_days_count INTEGER,
    last_4_weeks_count INTEGER,
    category_agriculture INTEGER,
    category_education INTEGER,
    category_st INTEGER,
    category_health INTEGER,
    summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Wishlist
CREATE TABLE IF NOT EXISTS wishlist (
    user_id TEXT NOT NULL,
    grant_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, grant_id)
);

-- ── Follows
CREATE TABLE IF NOT EXISTS user_follows (
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows (follower_id);

CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows (following_id);

-- ── Direct messages
CREATE TABLE IF NOT EXISTS user_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_messages_recipient ON user_messages (recipient_id);

CREATE INDEX IF NOT EXISTS idx_user_messages_sender ON user_messages (sender_id);

CREATE TABLE IF NOT EXISTS user_message_attachments (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    uploader_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes INTEGER,
    file_data BYTEA,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Groups
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    visibility TEXT NOT NULL DEFAULT 'public',
    owner_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_memberships (
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON group_memberships (user_id);

CREATE TABLE IF NOT EXISTS group_messages (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_message_attachments (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    uploader_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes INTEGER,
    file_data BYTEA,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_message_replies (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    parent_reply_id TEXT,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Feed
CREATE TABLE IF NOT EXISTS feed_posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_posts_author ON feed_posts (author_id);

CREATE TABLE IF NOT EXISTS feed_post_attachments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    uploader_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes INTEGER,
    file_data BYTEA,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_post_attachments_post_id ON feed_post_attachments (post_id);

CREATE TABLE IF NOT EXISTS feed_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    parent_comment_id TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_comments_post_id ON feed_comments (post_id);

CREATE TABLE IF NOT EXISTS feed_likes (
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS feed_dislikes (
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

-- ── Reporting / moderation
CREATE TABLE IF NOT EXISTS post_reports (
    post_id TEXT NOT NULL,
    reporter_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, reporter_id)
);

CREATE TABLE IF NOT EXISTS bug_reports (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Contact / mailing list
CREATE TABLE IF NOT EXISTS contact_us (
    id SERIAL PRIMARY KEY,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mailing_list (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);