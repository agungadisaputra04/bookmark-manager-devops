const cron = require('node-cron');
const config = require('./config');
const { runLinkCheckBatch } = require('./services/linkChecker');

console.log(`link-checker worker started. Schedule: "${config.linkCheckCron}"`);

let running = false;

async function tick() {
  if (running) {
    console.log('Previous link-check batch still running, skipping this tick.');
    return;
  }
  running = true;
  try {
    const checked = await runLinkCheckBatch();
    console.log(`Link-check batch complete: ${checked} bookmark(s) checked.`);
  } catch (err) {
    console.error('Link-check batch failed:', err.message);
  } finally {
    running = false;
  }
}

cron.schedule(config.linkCheckCron, tick);

// Run once immediately on startup so the worker isn't idle until the first
// scheduled tick.
tick();

process.on('SIGTERM', () => {
  console.log('Worker received SIGTERM, exiting.');
  process.exit(0);
});
