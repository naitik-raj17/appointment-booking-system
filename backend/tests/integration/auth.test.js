const { api, setupDB, teardownDB, clearDB, createUser, createCategory } = require('../helpers');
const { ProviderProfile, Availability, Notification } = require('../../src/models');

beforeAll(setupDB);
afterAll(teardownDB);
afterEach(clearDB);

describe('Authentication', () => {
  test('IT-01 registers a customer and returns a JWT', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'Jane Doe', email: 'Jane@Example.com', password: 'Secret123' });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user).toMatchObject({ email: 'jane@example.com', role: 'customer' });
    expect(res.body.data.user.password).toBeUndefined();
    expect(await Notification.countDocuments({ type: 'welcome' })).toBe(1);
  });

  test('IT-02 registers a provider with profile and default availability (pending approval)', async () => {
    const cat = await createCategory('Dental Care');
    const res = await api().post('/api/auth/register').send({
      name: 'Dr Who', email: 'who@test.com', password: 'Secret123', role: 'provider', categoryId: String(cat._id), specialization: 'Dentist', price: 90,
    });
    expect(res.status).toBe(201);
    const profile = await ProviderProfile.findOne({ user: res.body.data.user._id });
    expect(profile.isApproved).toBe(false);
    expect(await Availability.countDocuments({ provider: res.body.data.user._id })).toBe(1);
  });

  test('IT-03 rejects weak passwords, duplicate email and admin self-registration', async () => {
    expect((await api().post('/api/auth/register').send({ name: 'Weak', email: 'w@test.com', password: 'short' })).status).toBe(400);
    await api().post('/api/auth/register').send({ name: 'Dup', email: 'dup@test.com', password: 'Secret123' });
    const dup = await api().post('/api/auth/register').send({ name: 'Dup', email: 'dup@test.com', password: 'Secret123' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('EMAIL_TAKEN');
    const admin = await api().post('/api/auth/register').send({ name: 'Evil', email: 'evil@test.com', password: 'Secret123', role: 'admin' });
    expect(admin.status).toBe(400);
  });

  test('IT-04 provider registration requires category and specialization', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'No Cat', email: 'nocat@test.com', password: 'Secret123', role: 'provider' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('IT-05 logs in with valid credentials only', async () => {
    const { user } = await createUser('customer');
    expect((await api().post('/api/auth/login').send({ email: user.email, password: 'wrongpass1' })).status).toBe(401);
    const ok = await api().post('/api/auth/login').send({ email: user.email, password: 'Password1' });
    expect(ok.status).toBe(200);
    const me = await api().get('/api/auth/me').set('Authorization', `Bearer ${ok.body.data.token}`);
    expect(me.body.data.user.email).toBe(user.email);
  });

  test('IT-06 blocks deactivated users and invalid tokens', async () => {
    const { user, auth } = await createUser('customer', { isActive: false });
    expect((await api().post('/api/auth/login').send({ email: user.email, password: 'Password1' })).status).toBe(403);
    expect((await api().get('/api/auth/me').set(auth)).status).toBe(403);
    expect((await api().get('/api/auth/me').set('Authorization', 'Bearer not-a-token')).status).toBe(401);
    expect((await api().get('/api/auth/me')).status).toBe(401);
  });

  test('IT-07 enforces role-based access control', async () => {
    const customer = await createUser('customer');
    const provider = await createUser('provider');
    const admin = await createUser('admin');
    expect((await api().get('/api/admin/stats').set(customer.auth)).status).toBe(403);
    expect((await api().get('/api/admin/stats').set(provider.auth)).status).toBe(403);
    expect((await api().get('/api/admin/stats').set(admin.auth)).status).toBe(200);
    expect((await api().get('/api/providers/me/availability').set(customer.auth)).status).toBe(403);
  });

  test('IT-08 updates account details and changes password', async () => {
    const { user, auth } = await createUser('customer');
    const upd = await api().put('/api/auth/me').set(auth).send({ name: 'Renamed User', phone: '+1 555 0100' });
    expect(upd.body.data.user.name).toBe('Renamed User');
    expect((await api().put('/api/auth/password').set(auth).send({ currentPassword: 'nope', newPassword: 'NewPass123' })).status).toBe(400);
    expect((await api().put('/api/auth/password').set(auth).send({ currentPassword: 'Password1', newPassword: 'NewPass123' })).status).toBe(200);
    expect((await api().post('/api/auth/login').send({ email: user.email, password: 'NewPass123' })).status).toBe(200);
  });
});
