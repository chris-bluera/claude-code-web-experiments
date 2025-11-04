-- AI Bookmark Organizer Database Schema
-- PostgreSQL with pgvector extension

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Categories/Folders table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    color VARCHAR(7), -- Hex color for UI
    icon VARCHAR(50), -- Icon identifier
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_auto_generated BOOLEAN DEFAULT false, -- AI-created vs user-created
    UNIQUE(name, parent_id)
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    favicon_url TEXT,

    -- Page metadata
    page_content TEXT, -- Cached page content for search
    meta_description TEXT,
    meta_keywords TEXT,

    -- AI analysis
    ai_summary TEXT, -- AI-generated summary
    ai_tags TEXT[], -- AI-generated tags
    embedding vector(1536), -- OpenAI ada-002 embedding (or configurable size)

    -- User interaction
    visit_count INTEGER DEFAULT 0,
    last_visited_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- User notes
    user_notes TEXT,
    is_favorite BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false
);

-- Tags table (many-to-many with bookmarks)
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookmark-Tag junction table
CREATE TABLE IF NOT EXISTS bookmark_tags (
    bookmark_id INTEGER REFERENCES bookmarks(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (bookmark_id, tag_id)
);

-- AI conversations/chat history
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    bookmark_id INTEGER REFERENCES bookmarks(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual messages in conversations
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences/settings
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_bookmarks_url ON bookmarks(url);
CREATE INDEX idx_bookmarks_category ON bookmarks(category_id);
CREATE INDEX idx_bookmarks_created ON bookmarks(created_at DESC);
CREATE INDEX idx_bookmarks_favorite ON bookmarks(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_bookmarks_archived ON bookmarks(is_archived);

-- Vector similarity search index
CREATE INDEX idx_bookmarks_embedding ON bookmarks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Full-text search indexes
CREATE INDEX idx_bookmarks_title_fts ON bookmarks USING gin(to_tsvector('english', title));
CREATE INDEX idx_bookmarks_content_fts ON bookmarks USING gin(to_tsvector('english', page_content));
CREATE INDEX idx_bookmarks_tags_fts ON bookmarks USING gin(ai_tags);

CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_parent ON categories(parent_id);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookmarks_updated_at BEFORE UPDATE ON bookmarks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO categories (name, description, icon, is_auto_generated) VALUES
    ('Uncategorized', 'Default category for new bookmarks', '📝', false),
    ('Reading List', 'Articles and content to read later', '📚', false),
    ('Work', 'Work-related bookmarks', '💼', false),
    ('Personal', 'Personal bookmarks', '👤', false),
    ('Research', 'Research and reference materials', '🔬', false)
ON CONFLICT DO NOTHING;

-- Insert default settings
INSERT INTO settings (key, value) VALUES
    ('ai_model', 'anthropic/claude-3.5-sonnet'),
    ('embedding_model', 'openai/text-embedding-ada-002'),
    ('auto_categorize', 'true'),
    ('auto_tag', 'true'),
    ('max_suggestions', '5')
ON CONFLICT DO NOTHING;

-- Views for common queries

-- View: Bookmarks with category names
CREATE OR REPLACE VIEW bookmarks_with_categories AS
SELECT
    b.*,
    c.name as category_name,
    c.color as category_color,
    c.icon as category_icon
FROM bookmarks b
LEFT JOIN categories c ON b.category_id = c.id;

-- View: Category statistics
CREATE OR REPLACE VIEW category_stats AS
SELECT
    c.id,
    c.name,
    COUNT(b.id) as bookmark_count,
    MAX(b.created_at) as last_bookmark_added
FROM categories c
LEFT JOIN bookmarks b ON c.id = b.category_id
GROUP BY c.id, c.name;

-- Function: Semantic search for bookmarks
CREATE OR REPLACE FUNCTION search_bookmarks_semantic(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id integer,
    url text,
    title varchar(500),
    description text,
    category_name varchar(255),
    similarity float
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id,
        b.url,
        b.title,
        b.description,
        c.name as category_name,
        1 - (b.embedding <=> query_embedding) as similarity
    FROM bookmarks b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.embedding IS NOT NULL
        AND 1 - (b.embedding <=> query_embedding) > match_threshold
    ORDER BY b.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Get related bookmarks (similar content)
CREATE OR REPLACE FUNCTION get_related_bookmarks(
    bookmark_id_param integer,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id integer,
    url text,
    title varchar(500),
    similarity float
) AS $$
DECLARE
    target_embedding vector(1536);
BEGIN
    -- Get the embedding of the target bookmark
    SELECT embedding INTO target_embedding
    FROM bookmarks
    WHERE id = bookmark_id_param;

    IF target_embedding IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        b.id,
        b.url,
        b.title,
        1 - (b.embedding <=> target_embedding) as similarity
    FROM bookmarks b
    WHERE b.id != bookmark_id_param
        AND b.embedding IS NOT NULL
    ORDER BY b.embedding <=> target_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust username as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_username;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_username;
