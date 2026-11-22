const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const { createApp } = require('../src/app');
const { User, Category, ProviderProfile, Availability } = require('../src/models');
const { signToken } = require('../src/middleware/auth');
const { todayStr, addDays, dayOfWeek } = require('../src/utils/time');

let mongo;
const app = createApp();
const api = () => request(app);

async function setupDB() {
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri('bookease-test'));
}

async function teardownDB() {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}

async function clearDB() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

let counter = 0;
async function createUser(role = 'customer', overrides = {}) {
  counter += 1;
  const user = await User.create({
    name: `${role} ${counter}`,
    email: `${role}${counter}@test.com`,
    password: 'Password1',
    role,
    ...overrides,
  });
  return { user, token: signToken(user), auth: { Authorization: `Bearer ${signToken(user)}` } };
}

async function createCategory(name = 'Healthcare') {
  return Category.create({ name, slug: Category.slugify(name) });
}

/** Provider working every day 09:00–12:00, 30-minute slots, no breaks. */
async function createProvider({ category, approved = true, profile = {}, availability = {} } = {}) {
  const cat = category || (await createCategory(`Cat ${counter + 1}`));
  const p = await createUser('provider');
  await ProviderProfile.create({ user: p.user._id, category: cat._id, specialization: 'General Physician', city: 'Boston', price: 50, isApproved: approved, ...profile });
  await Availability.create({
    provider: p.user._id,
    slotDuration: 30,
    weeklySchedule: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, isWorking: true, startTime: '09:00', endTime: '12:00' })),
    ...availability,
  });
  return { ...p, category: cat };
}

/** A date at least `minDays` ahead (so it is outside the cancellation window). */
const futureDate = (minDays = 3) => addDays(todayStr(), minDays);

function nextDateWithDay(dow, minDays = 3) {
  let d = futureDate(minDays);
  while (dayOfWeek(d) !== dow) d = addDays(d, 1);
  return d;
}

module.exports = { api, setupDB, teardownDB, clearDB, createUser, createCategory, createProvider, futureDate, nextDateWithDay };
