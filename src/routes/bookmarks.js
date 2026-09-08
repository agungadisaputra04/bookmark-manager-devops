const express = require('express');
const { authenticate } = require('../middleware/auth');
const { isValidUrl } = require('../utils/validators');
const bookmarkService = require('../services/bookmarkService');

const router = express.Router();

router.use(authenticate);

router.post('/', async (req, res, next) => {
  try {
    const { url, title, tags } = req.body;

    if (!isValidUrl(url)) {
      return res.status(400).json({ error: 'A valid http(s) URL is required' });
    }
    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (tags !== undefined && !Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array of strings' });
    }

    const bookmark = await bookmarkService.createBookmark(req.userId, { url, title, tags });
    return res.status(201).json(bookmark);
  } catch (err) {
    return next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { tag, status } = req.query;
    const bookmarks = await bookmarkService.listBookmarks(req.userId, { tag, status });
    return res.json(bookmarks);
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const bookmark = await bookmarkService.getBookmarkById(req.userId, req.params.id);
    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    return res.json(bookmark);
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { title, tags } = req.body;
    if (tags !== undefined && !Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array of strings' });
    }

    const bookmark = await bookmarkService.updateBookmark(req.userId, req.params.id, { title, tags });
    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    return res.json(bookmark);
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await bookmarkService.deleteBookmark(req.userId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
