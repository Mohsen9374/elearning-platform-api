const app = require('./app');
const config = require('./config');
const { connectDB, disconnectDB } = require('./config/db');

async function start() {
  await connectDB(config.mongoUri);
  console.log('Connected to MongoDB');

  const server = app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port} (${config.env})`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
