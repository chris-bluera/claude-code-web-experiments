const db = require('../config/database');
const AIService = require('./aiService');
const axios = require('axios');
const cheerio = require('cheerio');

class BookmarkService {
  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Fetch page content and metadata
   */
  async fetchPageContent(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BookmarkBot/1.0)'
        }
      });

      const $ = cheerio.load(response.data);

      // Remove script and style elements
      $('script, style, nav, footer, aside').remove();

      // Extract metadata
      const title = $('title').text().trim() ||
                   $('meta[property="og:title"]').attr('content') ||
                   $('h1').first().text().trim();

      const description = $('meta[name="description"]').attr('content') ||
                         $('meta[property="og:description"]').attr('content') ||
                         '';

      const keywords = $('meta[name="keywords"]').attr('content') || '';

      // Extract main content (simple heuristic)
      let content = $('article').text() || $('main').text() || $('body').text();
      content = content.replace(/\s+/g, ' ').trim();

      // Limit content length
      const maxLength = parseInt(process.env.MAX_CONTENT_LENGTH) || 50000;
      if (content.length > maxLength) {
        content = content.substring(0, maxLength);
      }

      return {
        title,
        description,
        keywords,
        content
      };
    } catch (error) {
      console.error('Failed to fetch page content:', error.message);
      return null;
    }
  }

  /**
   * Create a new bookmark with AI analysis
   */
  async createBookmark(bookmarkData, apiKey = null) {
    const { url, title, description, fetchContent = true } = bookmarkData;

    // Fetch page content if enabled
    let pageData = { title, description, content: '' };
    if (fetchContent && process.env.ENABLE_PAGE_CONTENT_FETCH !== 'false') {
      const fetched = await this.fetchPageContent(url);
      if (fetched) {
        pageData = {
          title: fetched.title || title,
          description: fetched.description || description,
          content: fetched.content
        };
      }
    }

    // Generate content summary for AI
    const contentSummary = pageData.content
      ? await this.aiService.summarizeContent(pageData.content, 300, apiKey)
      : pageData.description;

    // Get existing categories
    const categoriesResult = await db.query('SELECT * FROM categories ORDER BY name');
    const categories = categoriesResult.rows;

    // Find similar bookmarks using text similarity (we'll do vector search after embedding is created)
    const similarBookmarks = await this.findSimilarBookmarksByText(
      pageData.title,
      pageData.description
    );

    // Get AI analysis
    const analysis = await this.aiService.analyzeBookmark(
      {
        url,
        title: pageData.title,
        description: pageData.description,
        contentSummary
      },
      categories,
      similarBookmarks,
      apiKey
    );

    // Determine category ID
    let categoryId = null;
    if (analysis.isNewCategory) {
      // Create new category
      const newCategoryResult = await db.query(
        'INSERT INTO categories (name, description, is_auto_generated) VALUES ($1, $2, $3) RETURNING id',
        [analysis.category, `AI-generated category for ${analysis.category}`, true]
      );
      categoryId = newCategoryResult.rows[0].id;
    } else {
      // Find existing category
      const existingCategory = categories.find(
        c => c.name.toLowerCase() === analysis.category.toLowerCase()
      );
      categoryId = existingCategory?.id;
    }

    // Generate embedding
    const embeddingText = `${pageData.title} ${pageData.description} ${contentSummary}`;
    const embedding = await this.aiService.generateEmbedding(embeddingText, apiKey);

    // Insert bookmark
    const result = await db.query(
      `INSERT INTO bookmarks
       (url, title, description, category_id, page_content, meta_description,
        ai_summary, ai_tags, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        url,
        pageData.title,
        pageData.description,
        categoryId,
        pageData.content,
        pageData.description,
        analysis.summary,
        analysis.tags,
        `[${embedding.join(',')}]` // pgvector format
      ]
    );

    const bookmark = result.rows[0];

    // Add tags
    if (analysis.tags && analysis.tags.length > 0) {
      await this.addTagsToBookmark(bookmark.id, analysis.tags);
    }

    return {
      bookmark,
      analysis,
      categoryCreated: analysis.isNewCategory
    };
  }

  /**
   * Find similar bookmarks using text search
   */
  async findSimilarBookmarksByText(title, description) {
    const searchText = `${title} ${description}`.toLowerCase();
    const words = searchText.split(/\s+/).filter(w => w.length > 3).slice(0, 5);

    if (words.length === 0) return [];

    const query = `
      SELECT b.id, b.title, b.url, c.name as category_name
      FROM bookmarks b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE ${words.map((_, i) => `(LOWER(b.title) LIKE $${i + 1} OR LOWER(b.description) LIKE $${i + 1})`).join(' OR ')}
      LIMIT 5
    `;

    const params = words.map(w => `%${w}%`);
    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Add tags to a bookmark
   */
  async addTagsToBookmark(bookmarkId, tags) {
    for (const tagName of tags) {
      // Insert or get tag
      const tagResult = await db.query(
        'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
        [tagName.toLowerCase()]
      );
      const tagId = tagResult.rows[0].id;

      // Link to bookmark
      await db.query(
        'INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [bookmarkId, tagId]
      );
    }
  }

  /**
   * Get all bookmarks
   */
  async getAllBookmarks(limit = 100, offset = 0) {
    const result = await db.query(
      `SELECT b.*, c.name as category_name, c.color as category_color,
              ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags
       FROM bookmarks b
       LEFT JOIN categories c ON b.category_id = c.id
       LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id
       LEFT JOIN tags t ON bt.tag_id = t.id
       WHERE b.is_archived = false
       GROUP BY b.id, c.name, c.color
       ORDER BY b.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  /**
   * Search bookmarks (keyword search)
   */
  async searchBookmarks(query, limit = 50) {
    const result = await db.query(
      `SELECT b.*, c.name as category_name, c.color as category_color,
              ts_rank(to_tsvector('english', b.title || ' ' || COALESCE(b.description, '')), query) as rank
       FROM bookmarks b
       LEFT JOIN categories c ON b.category_id = c.id,
       plainto_tsquery('english', $1) query
       WHERE to_tsvector('english', b.title || ' ' || COALESCE(b.description, '')) @@ query
             AND b.is_archived = false
       ORDER BY rank DESC
       LIMIT $2`,
      [query, limit]
    );
    return result.rows;
  }

  /**
   * Semantic search using embeddings
   */
  async semanticSearch(query, apiKey = null, limit = 20, threshold = 0.7) {
    // Generate embedding for query
    const embedding = await this.aiService.generateEmbedding(query, apiKey);

    // Use the database function for vector search
    const result = await db.query(
      'SELECT * FROM search_bookmarks_semantic($1, $2, $3)',
      [`[${embedding.join(',')}]`, threshold, limit]
    );

    return result.rows;
  }

  /**
   * Get bookmark by ID
   */
  async getBookmarkById(id) {
    const result = await db.query(
      `SELECT b.*, c.name as category_name, c.color as category_color,
              ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags
       FROM bookmarks b
       LEFT JOIN categories c ON b.category_id = c.id
       LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id
       LEFT JOIN tags t ON bt.tag_id = t.id
       WHERE b.id = $1
       GROUP BY b.id, c.name, c.color`,
      [id]
    );
    return result.rows[0];
  }

  /**
   * Update bookmark
   */
  async updateBookmark(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await db.query(
      `UPDATE bookmarks SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete bookmark
   */
  async deleteBookmark(id) {
    await db.query('DELETE FROM bookmarks WHERE id = $1', [id]);
  }

  /**
   * Get related bookmarks
   */
  async getRelatedBookmarks(bookmarkId, limit = 5) {
    const result = await db.query(
      'SELECT * FROM get_related_bookmarks($1, $2)',
      [bookmarkId, limit]
    );
    return result.rows;
  }
}

module.exports = BookmarkService;
