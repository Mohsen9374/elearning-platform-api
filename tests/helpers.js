const os = require('os');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config');
const User = require('../src/models/User');

// Fail fast instead of buffering queries when the database is unreachable.
mongoose.set('bufferCommands', false);

async function connect() {
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 5000,
    // Workaround for MongoDB driver >= 7.6 under Jest (NODE-7832): the driver loads `os`
    // via dynamic import(), which Jest's VM sandbox rejects, so the handshake is sent
    // without client metadata and the server refuses it. Passing `os` explicitly avoids that.
    runtimeAdapters: { os },
  });
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}

async function clear() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

async function close() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

/** Registers a user through the API and returns { user, token }. */
async function registerUser(overrides = {}) {
  const payload = { name: 'Jane Doe', email: 'jane@example.com', password: 'secret123', ...overrides };
  const res = await request(app).post('/api/v1/auth/register').send(payload);
  return { ...res.body.data, res };
}

async function createAdmin() {
  await User.create({ name: 'Admin', email: 'admin@example.com', password: 'admin1234', role: 'admin' });
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@example.com', password: 'admin1234' });
  return res.body.data.token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { app, request, connect, clear, close, registerUser, createAdmin, auth };
