const express = require('express');
const router = express.Router();
const AIService = require('../services/aiService');
const BookmarkService = require('../services/bookmarkService');
const db = require('../config/database');

const aiService = new AIService();
const bookmarkService = new BookmarkService();

/**
 * POST /api/ai/analyze - Analyze a bookmark for categorization
 */
router.post('/analyze', async (req, res) => {
  try {
    const { bookmark, apiKey } = req.body;

    if (!bookmark || !bookmark.url || !bookmark.title) {
      return res.status(400).json({
        success: false,
        error: 'Bookmark object with url and title is required'
      });
    }

    // Get existing categories
    const categoriesResult = await db.query('SELECT * FROM categories ORDER BY name');
    const categories = categoriesResult.rows;

    // Find similar bookmarks
    const similarBookmarks = await bookmarkService.findSimilarBookmarksByText(
      bookmark.title,
      bookmark.description || ''
    );

    // Analyze
    const analysis = await aiService.analyzeBookmark(
      bookmark,
      categories,
      similarBookmarks,
      apiKey
    );

    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('Error analyzing bookmark:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ai/chat - Chat with AI about bookmark organization
 */
router.post('/chat', async (req, res) => {
  try {
    const { conversationHistory, bookmark, apiKey } = req.body;

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return res.status(400).json({
        success: false,
        error: 'Conversation history array is required'
      });
    }

    if (!bookmark) {
      return res.status(400).json({
        success: false,
        error: 'Bookmark object is required'
      });
    }

    // Get categories
    const categoriesResult = await db.query('SELECT * FROM categories ORDER BY name');
    const categories = categoriesResult.rows;

    // Get AI response
    const response = await aiService.chatAboutOrganization(
      conversationHistory,
      bookmark,
      categories,
      apiKey
    );

    res.json({ success: true, data: { message: response } });
  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ai/suggest - Get organization suggestions
 */
router.post('/suggest', async (req, res) => {
  try {
    const { bookmark, apiKey } = req.body;

    if (!bookmark) {
      return res.status(400).json({
        success: false,
        error: 'Bookmark object is required'
      });
    }

    // Get existing categories
    const categoriesResult = await db.query('SELECT * FROM categories ORDER BY name');
    const categories = categoriesResult.rows;

    // Find similar bookmarks
    const similarBookmarks = await bookmarkService.findSimilarBookmarksByText(
      bookmark.title,
      bookmark.description || ''
    );

    // Get suggestions
    const analysis = await aiService.analyzeBookmark(
      bookmark,
      categories,
      similarBookmarks,
      apiKey
    );

    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ai/enhance-search - Enhance search query with AI
 */
router.post('/enhance-search', async (req, res) => {
  try {
    const { query, apiKey } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const enhanced = await aiService.enhanceSearchQuery(query, apiKey);
    res.json({ success: true, data: enhanced });
  } catch (error) {
    console.error('Error enhancing search:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ai/embedding - Generate embedding for text
 */
router.post('/embedding', async (req, res) => {
  try {
    const { text, apiKey } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    const embedding = await aiService.generateEmbedding(text, apiKey);
    res.json({ success: true, data: { embedding } });
  } catch (error) {
    console.error('Error generating embedding:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
