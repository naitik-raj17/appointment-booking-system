const { api, setupDB, teardownDB, clearDB, createUser, createProvider, createCategory, futureDate } = require('../helpers');
const { ActivityLog } = require('../../src/models');

beforeAll(setupDB);
afterAll(teardownDB);
afterEach(clearDB);

describe('Provider search', () => {
  test('IT-26 searches approved providers by text, category, price and sort', async () => {
    const dental = await createCategory('Dental Care');
    const health = await createCategory('Healthcare');
    await createProvider({ category: dental, profile: { specialization: 'Orthodontist', price: 110, city: 'Boston' } });
    await createProvider({ category: health, profile: { specialization: 'Cardiologist', price: 150, city: 'Chicago' } });
    await createProvider({ category: dental, approved: false, profile: { specialization: 'Hidden Dentist' } });

    expect((await api().get('/api/providers')).body.meta.total).toBe(2);
    expect((await api().get('/api/providers').query({ category: 'dental-care' })).body.data[0].specialization).toBe('Orthodontist');
    expect((await api().get('/api/providers').query({ q: 'cardio' })).body.meta.total).toBe(1);
    expect((await api().get('/api/providers').query({ maxPrice: 120 })).body.meta.total).toBe(1);
    expect((await api().get('/api/providers').query({ city: 'chi' })).body.meta.total).toBe(1);
    expect((await api().get('/api/providers').query({ sort: 'price_desc' })).body.data[0].price).toBe(150);
    expect((await api().get('/api/providers').query({ sort: 'bogus' })).status).toBe(400);
  });

  test('IT-27 returns a provider profile with availability and hides unapproved ones', async () => {
    const p = await createProvider();
    const res = await api().get(`/api/providers/${p.user._id}`);
    expect(res.body.data.availability.slotDuration).toBe(30);
    const hidden = await createProvider({ approved: false });
    expect((await api().get(`/api/providers/${hidden.user._id}`)).status).toBe(404);
    expect((await api().get('/api/providers/not-an-id')).status).toBe(400);
  });
});

describe('Administration', () => {
  test('IT-28 approves a provider so it appears in search', async () => {
    const admin = await createUser('admin');
    const p = await createProvider({ approved: false });
    expect((await api().get('/api/providers')).body.meta.total).toBe(0);
    const res = await api().patch(`/api/admin/providers/${p.user._id}/approval`).set(admin.auth).send({ isApproved: true });
    expect(res.body.data.isApproved).toBe(true);
    expect((await api().get('/api/providers')).body.meta.total).toBe(1);
    expect(await ActivityLog.countDocuments({ action: 'provider.approved' })).toBe(1);
  });

  test('IT-29 manages users: list, deactivate, delete rules', async () => {
    const admin = await createUser('admin');
    const customer = await createUser('customer');
    const list = await api().get('/api/admin/users').set(admin.auth).query({ role: 'customer' });
    expect(list.body.meta.total).toBe(1);

    expect((await api().patch(`/api/admin/users/${customer.user._id}`).set(admin.auth).send({ isActive: false })).body.data.isActive).toBe(false);
    expect((await api().get('/api/auth/me').set(customer.auth)).status).toBe(403);
    expect((await api().patch(`/api/admin/users/${admin.user._id}`).set(admin.auth).send({ isActive: false })).status).toBe(400);

    const p = await createProvider();
    const c2 = await createUser('customer');
    await api().post('/api/appointments').set(c2.auth).send({ providerId: String(p.user._id), date: futureDate(), startTime: '09:00' });
    expect((await api().delete(`/api/admin/users/${c2.user._id}`).set(admin.auth)).body.error.code).toBe('HAS_HISTORY');
    expect((await api().delete(`/api/admin/users/${customer.user._id}`).set(admin.auth)).status).toBe(200);
    expect((await api().delete(`/api/admin/users/${admin.user._id}`).set(admin.auth)).status).toBe(400);
  });

  test('IT-30 category CRUD and in-use protection', async () => {
    const admin = await createUser('admin');
    const created = await api().post('/api/admin/categories').set(admin.auth).send({ name: 'Pet Care', description: 'Vets and groomers', icon: 'paw-print' });
    expect(created.status).toBe(201);
    expect(created.body.data.slug).toBe('pet-care');
    expect((await api().post('/api/admin/categories').set(admin.auth).send({ name: 'Pet Care' })).status).toBe(409);

    const id = created.body.data._id;
    expect((await api().put(`/api/admin/categories/${id}`).set(admin.auth).send({ name: 'Pet & Animal Care', isActive: false })).body.data.slug).toBe('pet-and-animal-care');
    expect((await api().get('/api/categories')).body.data).toHaveLength(0);

    const p = await createProvider();
    expect((await api().delete(`/api/admin/categories/${p.category._id}`).set(admin.auth)).body.error.code).toBe('CATEGORY_IN_USE');
    expect((await api().delete(`/api/admin/categories/${id}`).set(admin.auth)).status).toBe(200);
  });

  test('IT-31 admin sees analytics, all appointments and activity; can cancel any appointment', async () => {
    const admin = await createUser('admin');
    const p = await createProvider();
    const c = await createUser('customer');
    const booked = await api().post('/api/appointments').set(c.auth).send({ providerId: String(p.user._id), date: futureDate(), startTime: '09:00' });

    const stats = await api().get('/api/admin/stats').set(admin.auth);
    expect(stats.body.data.appointments.byStatus.pending).toBe(1);
    expect(stats.body.data.bookingsLast14Days).toHaveLength(14);
    expect(stats.body.data.bookingsLast14Days[13].count).toBe(1);

    expect((await api().get('/api/admin/appointments').set(admin.auth)).body.meta.total).toBe(1);
    expect((await api().get('/api/admin/activity').set(admin.auth)).body.meta.total).toBeGreaterThan(0);
    const cancel = await api().patch(`/api/appointments/${booked.body.data._id}/status`).set(admin.auth).send({ status: 'cancelled', reason: 'Provider unavailable' });
    expect(cancel.body.data.status).toBe('cancelled');
  });

  test('IT-32 notifications can be listed and marked as read', async () => {
    const c = await createUser('customer');
    const p = await createProvider();
    await api().post('/api/appointments').set(c.auth).send({ providerId: String(p.user._id), date: futureDate(), startTime: '09:00' });
    const list = await api().get('/api/notifications').set(c.auth);
    expect(list.body.meta.unread).toBe(1);
    await api().patch(`/api/notifications/${list.body.data[0]._id}/read`).set(c.auth);
    expect((await api().get('/api/notifications').set(c.auth)).body.meta.unread).toBe(0);
    expect((await api().patch('/api/notifications/read-all').set(p.auth)).body.data.updated).toBe(1);
  });
});
