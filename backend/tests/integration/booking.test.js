const { api, setupDB, teardownDB, clearDB, createUser, createProvider, futureDate } = require('../helpers');
const { Appointment, Availability, Notification, ProviderProfile } = require('../../src/models');
const { addDays, todayStr } = require('../../src/utils/time');

beforeAll(setupDB);
afterAll(teardownDB);
afterEach(clearDB);

const book = (auth, body) => api().post('/api/appointments').set(auth).send(body);

describe('Slots & booking', () => {
  test('IT-09 lists generated slots for a working day', async () => {
    const provider = await createProvider();
    const res = await api().get(`/api/providers/${provider.user._id}/slots`).query({ date: futureDate() });
    expect(res.status).toBe(200);
    expect(res.body.data.isWorkingDay).toBe(true);
    expect(res.body.data.slots).toHaveLength(6);
    expect(res.body.data.slots[0]).toEqual({ startTime: '09:00', endTime: '09:30', status: 'available' });
  });

  test('IT-10 returns no slots on blocked dates and past dates', async () => {
    const date = futureDate();
    const provider = await createProvider({ availability: { blockedDates: [{ date, reason: 'Holiday' }] } });
    const blocked = await api().get(`/api/providers/${provider.user._id}/slots`).query({ date });
    expect(blocked.body.data.isWorkingDay).toBe(false);
    const past = await api().get(`/api/providers/${provider.user._id}/slots`).query({ date: addDays(todayStr(), -1) });
    expect(past.body.data.slots).toEqual([]);
  });

  test('IT-11 books an available slot and notifies both parties', async () => {
    const provider = await createProvider();
    const customer = await createUser('customer');
    const res = await book(customer.auth, { providerId: String(provider.user._id), date: futureDate(), startTime: '09:30', notes: 'First visit' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'pending', startTime: '09:30', endTime: '10:00', price: 50 });
    expect(await Notification.countDocuments({ appointment: res.body.data._id })).toBe(2);

    const slots = await api().get(`/api/providers/${provider.user._id}/slots`).query({ date: futureDate() });
    expect(slots.body.data.slots.find((s) => s.startTime === '09:30').status).toBe('booked');
  });

  test('IT-12 prevents double booking of the same slot', async () => {
    const provider = await createProvider();
    const a = await createUser('customer');
    const b = await createUser('customer');
    const body = { providerId: String(provider.user._id), date: futureDate(), startTime: '10:00' };
    expect((await book(a.auth, body)).status).toBe(201);
    const second = await book(b.auth, body);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('SLOT_TAKEN');
  });

  test('IT-13 concurrent requests for one slot produce exactly one booking (atomic guard)', async () => {
    const provider = await createProvider();
    const customers = await Promise.all(Array.from({ length: 10 }, () => createUser('customer')));
    const body = { providerId: String(provider.user._id), date: futureDate(), startTime: '11:00' };
    const results = await Promise.all(customers.map((c) => book(c.auth, body)));
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(9);
    expect(await Appointment.countDocuments({ provider: provider.user._id, isActive: true })).toBe(1);
  });

  test('IT-14 prevents a customer from double booking across providers', async () => {
    const p1 = await createProvider();
    const p2 = await createProvider({ category: p1.category });
    const customer = await createUser('customer');
    const date = futureDate();
    expect((await book(customer.auth, { providerId: String(p1.user._id), date, startTime: '09:00' })).status).toBe(201);
    const clash = await book(customer.auth, { providerId: String(p2.user._id), date, startTime: '09:00' });
    expect(clash.status).toBe(409);
    expect(clash.body.error.code).toBe('CUSTOMER_CONFLICT');
  });

  test('IT-15 detects partial overlaps when providers use different slot lengths', async () => {
    const p1 = await createProvider({ availability: { slotDuration: 60 } });
    const p2 = await createProvider({ category: p1.category });
    const customer = await createUser('customer');
    const date = futureDate();
    expect((await book(customer.auth, { providerId: String(p1.user._id), date, startTime: '09:00' })).status).toBe(201);
    const overlap = await book(customer.auth, { providerId: String(p2.user._id), date, startTime: '09:30' });
    expect(overlap.status).toBe(409);
    expect(overlap.body.error.code).toBe('CUSTOMER_CONFLICT');
  });

  test('IT-16 rejects invalid slots, past dates, unapproved providers and non-customers', async () => {
    const provider = await createProvider();
    const customer = await createUser('customer');
    const id = String(provider.user._id);
    expect((await book(customer.auth, { providerId: id, date: futureDate(), startTime: '09:15' })).body.error.code).toBe('INVALID_SLOT');
    expect((await book(customer.auth, { providerId: id, date: addDays(todayStr(), -2), startTime: '09:00' })).body.error.code).toBe('DAY_UNAVAILABLE');
    expect((await book(customer.auth, { providerId: id, date: futureDate(), startTime: '13:00' })).body.error.code).toBe('INVALID_SLOT');
    const hidden = await createProvider({ approved: false, category: provider.category });
    expect((await book(customer.auth, { providerId: String(hidden.user._id), date: futureDate(), startTime: '09:00' })).status).toBe(404);
    expect((await book(provider.auth, { providerId: id, date: futureDate(), startTime: '09:00' })).status).toBe(403);
  });
});

describe('Appointment lifecycle', () => {
  async function bookedAppointment(startTime = '09:00', date = futureDate()) {
    const provider = await createProvider();
    const customer = await createUser('customer');
    const res = await book(customer.auth, { providerId: String(provider.user._id), date, startTime });
    return { provider, customer, appt: res.body.data };
  }

  test('IT-17 provider confirms; customer cancels and the slot is released', async () => {
    const { provider, customer, appt } = await bookedAppointment();
    const confirm = await api().patch(`/api/appointments/${appt._id}/status`).set(provider.auth).send({ status: 'confirmed' });
    expect(confirm.body.data.status).toBe('confirmed');

    const cancel = await api().patch(`/api/appointments/${appt._id}/cancel`).set(customer.auth).send({ reason: 'Travelling' });
    expect(cancel.body.data).toMatchObject({ status: 'cancelled', isActive: false, cancellationReason: 'Travelling' });

    const other = await createUser('customer');
    expect((await book(other.auth, { providerId: String(provider.user._id), date: appt.date, startTime: '09:00' })).status).toBe(201);
  });

  test('IT-18 provider rejects; invalid transitions are refused', async () => {
    const { provider, customer, appt } = await bookedAppointment();
    expect((await api().patch(`/api/appointments/${appt._id}/status`).set(provider.auth).send({ status: 'rejected', reason: 'Fully booked' })).body.data.status).toBe('rejected');
    const again = await api().patch(`/api/appointments/${appt._id}/status`).set(provider.auth).send({ status: 'confirmed' });
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe('INVALID_TRANSITION');
    expect((await api().patch(`/api/appointments/${appt._id}/status`).set(customer.auth).send({ status: 'confirmed' })).status).toBe(403);
  });

  test('IT-19 cannot complete a future appointment; can complete and review a past one', async () => {
    const { provider, customer, appt } = await bookedAppointment();
    await api().patch(`/api/appointments/${appt._id}/status`).set(provider.auth).send({ status: 'confirmed' });
    const early = await api().patch(`/api/appointments/${appt._id}/status`).set(provider.auth).send({ status: 'completed' });
    expect(early.body.error.code).toBe('NOT_STARTED');

    await Appointment.updateOne({ _id: appt._id }, { date: addDays(todayStr(), -1) });
    expect((await api().patch(`/api/appointments/${appt._id}/status`).set(provider.auth).send({ status: 'completed' })).body.data.status).toBe('completed');

    const review = await api().post(`/api/appointments/${appt._id}/review`).set(customer.auth).send({ rating: 4, review: 'Great' });
    expect(review.body.data.rating).toBe(4);
    const profile = await ProviderProfile.findOne({ user: provider.user._id });
    expect(profile.ratingAverage).toBe(4);
    expect(profile.ratingCount).toBe(1);
    expect((await api().post(`/api/appointments/${appt._id}/review`).set(customer.auth).send({ rating: 5 })).status).toBe(409);
  });

  test('IT-20 reschedules to a free slot, resets to pending and frees the old slot', async () => {
    const { provider, customer, appt } = await bookedAppointment('09:00');
    await api().patch(`/api/appointments/${appt._id}/status`).set(provider.auth).send({ status: 'confirmed' });
    const res = await api().patch(`/api/appointments/${appt._id}/reschedule`).set(customer.auth).send({ date: appt.date, startTime: '10:30' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ startTime: '10:30', endTime: '11:00', status: 'pending', rescheduleCount: 1 });
    const slots = await api().get(`/api/providers/${provider.user._id}/slots`).query({ date: appt.date });
    expect(slots.body.data.slots.find((s) => s.startTime === '09:00').status).toBe('available');
  });

  test('IT-21 reschedule into a taken slot fails', async () => {
    const { provider, customer, appt } = await bookedAppointment('09:00');
    const other = await createUser('customer');
    await book(other.auth, { providerId: String(provider.user._id), date: appt.date, startTime: '10:00' });
    const res = await api().patch(`/api/appointments/${appt._id}/reschedule`).set(customer.auth).send({ date: appt.date, startTime: '10:00' });
    expect(res.status).toBe(409);
  });

  test('IT-22 enforces the cancellation window for customers', async () => {
    const provider = await createProvider();
    const customer = await createUser('customer');
    const soon = new Date(Date.now() + 30 * 60 * 1000);
    const appt = await Appointment.create({
      customer: customer.user._id, provider: provider.user._id, providerProfile: (await ProviderProfile.findOne({ user: provider.user._id }))._id,
      date: todayStr(soon), startTime: `${String(soon.getHours()).padStart(2, '0')}:00`, endTime: '23:59',
    });
    const res = await api().patch(`/api/appointments/${appt._id}/cancel`).set(customer.auth).send({});
    expect(res.body.error.code).toBe('CHANGE_WINDOW_CLOSED');
    expect((await api().patch(`/api/appointments/${appt._id}/cancel`).set(provider.auth).send({})).status).toBe(200);
  });

  test('IT-23 users cannot see or modify appointments of others', async () => {
    const { appt } = await bookedAppointment();
    const stranger = await createUser('customer');
    expect((await api().get(`/api/appointments/${appt._id}`).set(stranger.auth)).status).toBe(404);
    expect((await api().patch(`/api/appointments/${appt._id}/cancel`).set(stranger.auth).send({})).status).toBe(404);
  });

  test('IT-24 lists own appointments with scope filters and summary counts', async () => {
    const { customer, provider } = await bookedAppointment('09:00');
    const list = await api().get('/api/appointments').set(customer.auth).query({ scope: 'upcoming' });
    expect(list.body.meta.total).toBe(1);
    expect((await api().get('/api/appointments').set(customer.auth).query({ scope: 'past' })).body.meta.total).toBe(0);
    const summary = await api().get('/api/appointments/summary').set(provider.auth);
    expect(summary.body.data.byStatus.pending).toBe(1);
    expect(summary.body.data.upcoming).toHaveLength(1);
  });

  test('IT-25 provider updates availability; validation rejects bad schedules', async () => {
    const provider = await createProvider();
    const week = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, isWorking: d !== 0, startTime: '10:00', endTime: '14:00', breakStart: '12:00', breakEnd: '12:30' }));
    const ok = await api().put('/api/providers/me/availability').set(provider.auth).send({ slotDuration: 60, bufferMinutes: 0, weeklySchedule: week, blockedDates: [] });
    expect(ok.status).toBe(200);
    expect((await Availability.findOne({ provider: provider.user._id })).slotDuration).toBe(60);

    const bad = week.map((d) => (d.dayOfWeek === 1 ? { ...d, breakStart: '15:00', breakEnd: '16:00' } : d));
    expect((await api().put('/api/providers/me/availability').set(provider.auth).send({ slotDuration: 60, weeklySchedule: bad, blockedDates: [] })).status).toBe(400);
  });
});
