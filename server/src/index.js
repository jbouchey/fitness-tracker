require('./config/env'); // validate env vars first
const app = require('./app');
const { PORT } = require('./config/env');
const prisma = require('./config/database');
const { processWeekTransition } = require('./rpg/campaignService');

async function runWeekTransition() {
  try {
    await processWeekTransition(prisma);
  } catch (err) {
    console.error('[RPG] Weekly transition failed:', err);
  }
}

async function main() {
  await prisma.$connect();
  console.log('Database connected.');

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Check for expired quest weeks on startup and then every hour (idempotent)
  runWeekTransition();
  setInterval(runWeekTransition, 60 * 60 * 1000);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
