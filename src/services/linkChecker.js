const db = require('../db');
const config = require('../config');

/**
 * Performs an HTTP HEAD (falling back to GET) request against a URL with a
 * timeout, and reports whether it's reachable.
 */
async function checkUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.linkCheckTimeoutMs);

  try {
    let response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    if (response.status === 405) {
      // Some servers don't support HEAD; retry with GET.
      response = await fetch(url, { method: 'GET', signal: controller.signal });
    }
    return response.ok ? 'ok' : 'broken';
  } catch {
    return 'broken';
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetches a batch of bookmarks and checks their status with limited
 * concurrency, then persists the results.
 */
async function runLinkCheckBatch() {
  const { rows } = await db.query(
    `SELECT id, url FROM bookmarks
     ORDER BY last_checked_at NULLS FIRST
     LIMIT 100`
  );

  const concurrency = config.linkCheckConcurrency;
  let index = 0;
  let checked = 0;

  async function worker() {
    while (index < rows.length) {
      const current = rows[index];
      index += 1;
      const status = await checkUrl(current.url);
      await db.query(
        `UPDATE bookmarks SET status = $1, last_checked_at = now() WHERE id = $2`,
        [status, current.id]
      );
      checked += 1;
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, rows.length) }, worker);
  await Promise.all(workers);
  return checked;
}

module.exports = { checkUrl, runLinkCheckBatch };
