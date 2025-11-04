const express = require('express');
const router = express.Router();
const BookmarkService = require('../services/bookmarkService');

const bookmarkService = new BookmarkService();

/**
 * GET /api/bookmarks - Get all bookmarks
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const bookmarks = await bookmarkService.getAllBookmarks(limit, offset);
    res.json({ success: true, data: bookmarks });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bookmarks/search - Search bookmarks (keyword)
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 50 } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }

    const bookmarks = await bookmarkService.searchBookmarks(q, parseInt(limit));
    res.json({ success: true, data: bookmarks, count: bookmarks.length });
  } catch (error) {
    console.error('Error searching bookmarks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bookmarks/search/semantic - AI semantic search
 */
router.post('/search/semantic', async (req, res) => {
  try {
    const { query, apiKey, limit = 20, threshold = 0.7 } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    const bookmarks = await bookmarkService.semanticSearch(
      query,
      apiKey,
      parseInt(limit),
      parseFloat(threshold)
    );

    res.json({ success: true, data: bookmarks, count: bookmarks.length });
  } catch (error) {
    console.error('Error in semantic search:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bookmarks/:id - Get bookmark by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const bookmark = await bookmarkService.getBookmarkById(req.params.id);

    if (!bookmark) {
      return res.status(404).json({ success: false, error: 'Bookmark not found' });
    }

    res.json({ success: true, data: bookmark });
  } catch (error) {
    console.error('Error fetching bookmark:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bookmarks/:id/related - Get related bookmarks
 */
router.get('/:id/related', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const related = await bookmarkService.getRelatedBookmarks(req.params.id, limit);

    res.json({ success: true, data: related });
  } catch (error) {
    console.error('Error fetching related bookmarks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bookmarks - Create new bookmark with AI analysis
 */
router.post('/', async (req, res) => {
  try {
    const { url, title, description, apiKey, fetchContent } = req.body;

    if (!url || !title) {
      return res.status(400).json({
        success: false,
        error: 'URL and title are required'
      });
    }

    const result = await bookmarkService.createBookmark(
      { url, title, description, fetchContent },
      apiKey
    );

    res.status(201).json({
      success: true,
      data: result.bookmark,
      analysis: result.analysis,
      categoryCreated: result.categoryCreated
    });
  } catch (error) {
    console.error('Error creating bookmark:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/bookmarks/:id - Update bookmark
 */
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const bookmark = await bookmarkService.updateBookmark(req.params.id, updates);

    if (!bookmark) {
      return res.status(404).json({ success: false, error: 'Bookmark not found' });
    }

    res.json({ success: true, data: bookmark });
  } catch (error) {
    console.error('Error updating bookmark:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/bookmarks/:id - Delete bookmark
 */
router.delete('/:id', async (req, res) => {
  try {
    await bookmarkService.deleteBookmark(req.params.id);
    res.json({ success: true, message: 'Bookmark deleted' });
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
