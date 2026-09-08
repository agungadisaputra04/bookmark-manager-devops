const db = require('../db');

async function createBookmark(userId, { url, title, tags }) {
  const result = await db.query(
    `INSERT INTO bookmarks (user_id, url, title, tags)
     VALUES ($1, $2, $3, $4)
     RETURNING id, url, title, tags, status, last_checked_at, created_at`,
    [userId, url, title, tags || []]
  );
  return result.rows[0];
}

async function listBookmarks(userId, { tag, status } = {}) {
  const conditions = ['user_id = $1'];
  const params = [userId];

  if (tag) {
    params.push(tag);
    conditions.push(`$${params.length} = ANY(tags)`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  const result = await db.query(
    `SELECT id, url, title, tags, status, last_checked_at, created_at
     FROM bookmarks
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC`,
    params
  );
  return result.rows;
}

async function getBookmarkById(userId, id) {
  const result = await db.query(
    `SELECT id, url, title, tags, status, last_checked_at, created_at
     FROM bookmarks WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0] || null;
}

async function updateBookmark(userId, id, { title, tags }) {
  const result = await db.query(
    `UPDATE bookmarks
     SET title = COALESCE($3, title),
         tags = COALESCE($4, tags)
     WHERE id = $1 AND user_id = $2
     RETURNING id, url, title, tags, status, last_checked_at, created_at`,
    [id, userId, title || null, tags || null]
  );
  return result.rows[0] || null;
}

async function deleteBookmark(userId, id) {
  const result = await db.query(
    `DELETE FROM bookmarks WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );
  return result.rowCount > 0;
}

module.exports = {
  createBookmark,
  listBookmarks,
  getBookmarkById,
  updateBookmark,
  deleteBookmark,
};
