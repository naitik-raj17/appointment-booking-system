const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { createApp } = require('./app');
const { User } = require('./models');
const { seedDatabase } = require('./seed/seedData');

async function start() {
  const { inMemory } = await connectDB();
  console.log(`[db] connected (${inMemory ? 'in-memory MongoDB' : 'MongoDB'})`);

  if (env.seedOnStart || (inMemory && (await User.estimatedDocumentCount()) === 0)) {
    const summary = await seedDatabase();
    console.log(`[seed] demo data loaded: ${JSON.stringify(summary)}`);
  }

  const server = createApp().listen(env.port, () => {
    console.log(`[api] BookEase API listening on http://localhost:${env.port}/api`);
  });

  const shutdown = async (signal) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('[api] failed to start:', err);
  process.exit(1);
});
