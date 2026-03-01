require('./config/env'); // validate env vars first
const app = require('./app');
const { PORT } = require('./config/env');
const prisma = require('./config/database');

async function main() {
  await prisma.$connect();
  console.log('Database connected.');

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
