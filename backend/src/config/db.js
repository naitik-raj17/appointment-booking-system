const mongoose = require('mongoose');
const env = require('./env');

let memoryServer = null;

/**
 * Connects to MongoDB. Falls back to an in-memory MongoDB instance when
 * USE_IN_MEMORY_DB=true or no MONGODB_URI is configured (zero-setup demo mode).
 */
async function connectDB(uriOverride) {
  let uri = uriOverride || env.mongoUri;
  let inMemory = false;

  if (!uriOverride && (env.useInMemoryDb || !uri)) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri('bookease');
    inMemory = true;
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);

  // Build indexes up-front: the partial unique indexes on appointments are the
  // database-level guarantee against double booking, so they must exist before
  // the first request is served.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));

  return { uri, inMemory };
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

module.exports = { connectDB, disconnectDB };
