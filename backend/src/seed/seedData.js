/**
 * Deterministic demo data. Appointment dates are generated relative to "today"
 * so the demo always shows a realistic mix of past and upcoming bookings.
 */
const { User, Category, ProviderProfile, Availability, Appointment, Notification, ActivityLog } = require('../models');
const { generateSlots } = require('../algorithms/slotGenerator');
const { todayStr, addDays, minutesOfDay, toMinutes } = require('../utils/time');

const DEMO_PASSWORDS = { admin: 'Admin@123', provider: 'Provider@123', customer: 'Customer@123' };

const CATEGORIES = [
  { name: 'Healthcare', icon: 'stethoscope', description: 'General physicians, specialists and therapists.' },
  { name: 'Dental Care', icon: 'smile', description: 'Dentists, orthodontists and oral hygiene experts.' },
  { name: 'Fitness & Training', icon: 'dumbbell', description: 'Personal trainers, yoga and fitness coaching.' },
  { name: 'Beauty & Wellness', icon: 'sparkles', description: 'Salons, spas, massage and skincare.' },
  { name: 'Legal Consulting', icon: 'scale', description: 'Lawyers and legal advisors for individuals and businesses.' },
  { name: 'Education & Tutoring', icon: 'graduation-cap', description: 'Private tutors and academic coaching.' },
  { name: 'Mental Health', icon: 'brain', description: 'Psychologists, counsellors and therapists.' },
];

const weekdays = (start, end, breakStart, breakEnd, workingDays = [1, 2, 3, 4, 5]) =>
  [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    dayOfWeek: d,
    isWorking: workingDays.includes(d),
    startTime: start,
    endTime: end,
    breakStart,
    breakEnd,
  }));

const PROVIDERS = [
  {
    name: 'Dr. Sarah Mitchell', email: 'sarah.mitchell@bookease.com', phone: '+1 212 555 0101', category: 'Healthcare',
    specialization: 'General Physician', city: 'New York', address: '245 Park Ave, Suite 12', price: 80, experienceYears: 12,
    tags: ['family medicine', 'checkup', 'vaccination'],
    bio: 'Board-certified family physician focused on preventive care, annual check-ups and chronic disease management for adults and children.',
    availability: { slotDuration: 30, bufferMinutes: 0, weeklySchedule: weekdays('09:00', '17:00', '13:00', '14:00') },
  },
  {
    name: 'Dr. Rajesh Kumar', email: 'rajesh.kumar@bookease.com', phone: '+1 312 555 0144', category: 'Healthcare',
    specialization: 'Cardiologist', city: 'Chicago', address: '900 N Michigan Ave', price: 150, experienceYears: 18,
    tags: ['heart', 'ecg', 'blood pressure'],
    bio: 'Consultant cardiologist with 18 years of experience in hypertension, arrhythmia and preventive cardiology.',
    availability: { slotDuration: 45, bufferMinutes: 15, weeklySchedule: weekdays('10:00', '18:00', '13:30', '14:30', [1, 2, 3, 4]) },
  },
  {
    name: 'Dr. Emily Chen', email: 'emily.chen@bookease.com', phone: '+1 415 555 0177', category: 'Dental Care',
    specialization: 'Dental Surgeon', city: 'San Francisco', address: '1 Market St, Floor 4', price: 120, experienceYears: 9,
    tags: ['cleaning', 'fillings', 'root canal'],
    bio: 'Gentle, patient-first dentistry: cleanings, fillings, root canals and cosmetic whitening using the latest imaging technology.',
    availability: { slotDuration: 30, bufferMinutes: 10, weeklySchedule: weekdays('08:30', '16:30', '12:00', '13:00') },
  },
  {
    name: 'Dr. Michael Brown', email: 'michael.brown@bookease.com', phone: '+1 617 555 0123', category: 'Dental Care',
    specialization: 'Orthodontist', city: 'Boston', address: '75 State St', price: 110, experienceYears: 14,
    tags: ['braces', 'aligners', 'teens'],
    bio: 'Specialist in braces and clear aligners for teens and adults. Free first consultation for new patients.',
    availability: { slotDuration: 30, bufferMinutes: 0, weeklySchedule: weekdays('09:00', '17:00', '12:30', '13:30', [1, 2, 3, 4, 5, 6]) },
  },
  {
    name: 'Jessica Taylor', email: 'jessica.taylor@bookease.com', phone: '+1 310 555 0190', category: 'Fitness & Training',
    specialization: 'Certified Personal Trainer', city: 'Los Angeles', address: 'Iron Peak Gym, 50 Sunset Blvd', price: 60, experienceYears: 7,
    tags: ['weight loss', 'strength', 'hiit'],
    bio: 'NASM-certified trainer helping clients build strength and lose weight with personalised plans and nutrition guidance.',
    availability: { slotDuration: 60, bufferMinutes: 0, weeklySchedule: weekdays('07:00', '19:00', '12:00', '13:00', [1, 2, 3, 4, 5, 6]) },
  },
  {
    name: 'Priya Sharma', email: 'priya.sharma@bookease.com', phone: '+1 512 555 0165', category: 'Fitness & Training',
    specialization: 'Yoga & Mindfulness Instructor', city: 'Austin', address: 'Lotus Studio, 300 Congress Ave', price: 40, experienceYears: 10,
    tags: ['yoga', 'meditation', 'flexibility'],
    bio: 'Hatha and Vinyasa yoga sessions for all levels, with a focus on breath work, flexibility and stress reduction.',
    availability: { slotDuration: 60, bufferMinutes: 15, weeklySchedule: weekdays('06:30', '12:30', undefined, undefined, [0, 1, 2, 3, 4, 5, 6]) },
  },
  {
    name: 'Olivia Martinez', email: 'olivia.martinez@bookease.com', phone: '+1 305 555 0132', category: 'Beauty & Wellness',
    specialization: 'Senior Hair Stylist', city: 'Miami', address: 'Glow Salon, 820 Ocean Dr', price: 55, experienceYears: 8,
    tags: ['haircut', 'coloring', 'bridal'],
    bio: 'Cuts, colour and styling for every occasion. Specialist in balayage and bridal hair.',
    availability: { slotDuration: 45, bufferMinutes: 0, weeklySchedule: weekdays('10:00', '19:00', '14:00', '14:45', [2, 3, 4, 5, 6]) },
  },
  {
    name: 'Liam Johnson', email: 'liam.johnson@bookease.com', phone: '+1 206 555 0158', category: 'Beauty & Wellness',
    specialization: 'Licensed Massage Therapist', city: 'Seattle', address: 'Evergreen Spa, 400 Pine St', price: 90, experienceYears: 6,
    tags: ['deep tissue', 'sports massage', 'relaxation'],
    bio: 'Deep-tissue, sports and Swedish massage to relieve tension and speed up recovery.',
    availability: { slotDuration: 60, bufferMinutes: 15, weeklySchedule: weekdays('11:00', '20:00', '15:00', '15:30') },
  },
  {
    name: 'Amanda Lewis', email: 'amanda.lewis@bookease.com', phone: '+1 646 555 0111', category: 'Legal Consulting',
    specialization: 'Family Law Attorney', city: 'New York', address: '120 Broadway, 30th Floor', price: 200, experienceYears: 15,
    tags: ['divorce', 'custody', 'mediation'],
    bio: 'Compassionate representation in divorce, custody and mediation. Initial consultations are confidential.',
    availability: { slotDuration: 60, bufferMinutes: 0, weeklySchedule: weekdays('09:00', '17:00', '12:00', '13:00') },
  },
  {
    name: 'David Wilson', email: 'david.wilson@bookease.com', phone: '+1 720 555 0187', category: 'Education & Tutoring',
    specialization: 'Mathematics & Physics Tutor', city: 'Denver', address: 'Online / Denver Public Library', price: 45, experienceYears: 5,
    tags: ['calculus', 'sat', 'physics'],
    bio: 'High school and university tutoring in calculus, algebra and physics. SAT/ACT math preparation.',
    availability: { slotDuration: 60, bufferMinutes: 0, weeklySchedule: weekdays('15:00', '21:00', undefined, undefined, [0, 1, 2, 3, 4]) },
  },
  {
    name: 'Dr. Sophia Anderson', email: 'sophia.anderson@bookease.com', phone: '+1 503 555 0109', category: 'Mental Health',
    specialization: 'Clinical Psychologist', city: 'Portland', address: '600 SW Main St', price: 130, experienceYears: 11,
    tags: ['anxiety', 'cbt', 'counselling'],
    bio: 'Evidence-based therapy (CBT, ACT) for anxiety, depression and burnout. In-person and video sessions.',
    availability: { slotDuration: 50, bufferMinutes: 10, weeklySchedule: weekdays('09:00', '18:00', '13:00', '14:00') },
  },
  {
    name: 'Daniel Kim', email: 'daniel.kim@bookease.com', phone: '+1 312 555 0199', category: 'Healthcare',
    specialization: 'Physiotherapist', city: 'Chicago', address: '220 W Adams St', price: 85, experienceYears: 4,
    tags: ['rehab', 'back pain', 'sports injury'], pendingApproval: true,
    bio: 'Physiotherapy for sports injuries, back pain and post-surgery rehabilitation.',
    availability: { slotDuration: 45, bufferMinutes: 0, weeklySchedule: weekdays('08:00', '16:00', '12:00', '12:45') },
  },
];

const CUSTOMERS = [
  { name: 'Alice Johnson', email: 'alice@example.com', phone: '+1 917 555 0142' },
  { name: 'Bob Smith', email: 'bob@example.com', phone: '+1 646 555 0175' },
  { name: 'Carol Davis', email: 'carol@example.com', phone: '+1 415 555 0168' },
  { name: 'Ethan Wright', email: 'ethan@example.com', phone: '+1 312 555 0137' },
  { name: 'Grace Lee', email: 'grace@example.com', phone: '+1 206 555 0104' },
];

const REVIEWS = [
  [5, 'Excellent experience, very professional and on time.'],
  [5, 'Explained everything clearly. Highly recommended!'],
  [4, 'Great session, slightly delayed start but worth it.'],
  [5, 'Friendly, knowledgeable and easy to book.'],
  [4, 'Very helpful. Will book again.'],
  [3, 'Good overall, the clinic was a bit busy.'],
];

const NOTES = ['', '', 'First visit.', 'Follow-up from last session.', 'Please call if running late.', 'Prefer a quiet room if possible.'];

/** Small deterministic PRNG (mulberry32) so every seed produces the same data. */
function prng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function seedDatabase({ now = new Date() } = {}) {
  await Promise.all([User, Category, ProviderProfile, Availability, Appointment, Notification, ActivityLog].map((m) => m.deleteMany({})));
  const rand = prng(20261030);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const categories = await Category.insertMany(CATEGORIES.map((c) => ({ ...c, slug: Category.slugify(c.name) })));
  const categoryByName = new Map(categories.map((c) => [c.name, c]));

  const admin = await User.create({ name: 'System Administrator', email: 'admin@bookease.com', password: DEMO_PASSWORDS.admin, role: 'admin', phone: '+1 800 555 0100' });
  const customers = [];
  for (const c of CUSTOMERS) customers.push(await User.create({ ...c, password: DEMO_PASSWORDS.customer, role: 'customer' }));

  const providers = [];
  for (const p of PROVIDERS) {
    const user = await User.create({ name: p.name, email: p.email, phone: p.phone, password: DEMO_PASSWORDS.provider, role: 'provider' });
    const profile = await ProviderProfile.create({
      user: user._id,
      category: categoryByName.get(p.category)._id,
      specialization: p.specialization,
      bio: p.bio,
      experienceYears: p.experienceYears,
      city: p.city,
      address: p.address,
      price: p.price,
      tags: p.tags,
      isApproved: !p.pendingApproval,
    });
    const today = todayStr(now);
    const availability = await Availability.create({
      provider: user._id,
      ...p.availability,
      blockedDates: p.name === 'Dr. Sarah Mitchell' ? [{ date: addDays(today, 10), reason: 'Medical conference' }] : [],
    });
    providers.push({ user, profile, availability, pending: Boolean(p.pendingApproval) });
  }

  // Appointments: walk each approved provider's calendar from 21 days ago to 14 days ahead.
  const today = todayStr(now);
  const nowMin = minutesOfDay(now);
  const customerSlots = new Set();
  const docs = [];
  const ratings = new Map();

  for (const prov of providers.filter((p) => !p.pending)) {
    for (let offset = -21; offset <= 14; offset += 1) {
      const date = addDays(today, offset);
      const day = prov.availability.getDaySchedule(date);
      if (!day) continue;
      const slots = generateSlots({ ...day, slotDuration: prov.availability.slotDuration, bufferMinutes: prov.availability.bufferMinutes });
      const count = Math.floor(rand() * (offset < 0 ? 3 : 3));
      const chosen = new Set();
      for (let i = 0; i < count; i += 1) chosen.add(pick(slots));

      for (const slot of chosen) {
        const isPast = offset < 0 || (offset === 0 && toMinutes(slot.startTime) < nowMin);
        // Keep demo customer Alice busy so her dashboard is rich.
        const customer = rand() < 0.2 ? customers[0] : pick(customers);
        const key = `${customer._id}|${date}|${slot.startTime}`;
        if (customerSlots.has(key)) continue;

        const r = rand();
        let status;
        if (isPast) status = r < 0.72 ? 'completed' : r < 0.86 ? 'cancelled' : r < 0.93 ? 'rejected' : 'confirmed';
        else status = r < 0.55 ? 'confirmed' : r < 0.9 ? 'pending' : 'cancelled';
        if (['pending', 'confirmed'].includes(status)) customerSlots.add(key);

        // Requested 1–7 days before the appointment date, never in the future.
        const created = new Date(now);
        created.setDate(created.getDate() + offset - 1 - Math.floor(rand() * 7));
        if (created > now) created.setTime(now.getTime() - Math.floor(rand() * 6) * 3600 * 1000);
        const history = [{ status: 'pending', changedBy: customer._id, note: 'Booking requested', at: created }];
        if (status !== 'pending') {
          history.push({ status: status === 'completed' ? 'confirmed' : status, changedBy: status === 'cancelled' ? customer._id : prov.user._id, note: '', at: created });
        }
        if (status === 'completed') history.push({ status: 'completed', changedBy: prov.user._id, note: '', at: created });

        const doc = {
          customer: customer._id,
          provider: prov.user._id,
          providerProfile: prov.profile._id,
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status,
          isActive: ['pending', 'confirmed'].includes(status),
          notes: pick(NOTES),
          price: prov.profile.price,
          statusHistory: history,
          createdAt: created,
          updatedAt: created,
        };
        if (status === 'cancelled') {
          doc.cancellationReason = pick(['Schedule conflict', 'Feeling better now', 'Travelling that week']);
          doc.cancelledBy = customer._id;
        }
        if (status === 'completed' && rand() < 0.8) {
          const [rating, review] = pick(REVIEWS);
          doc.rating = rating;
          doc.review = review;
          const agg = ratings.get(String(prov.profile._id)) || { sum: 0, n: 0 };
          ratings.set(String(prov.profile._id), { sum: agg.sum + rating, n: agg.n + 1 });
        }
        docs.push(doc);
      }
    }
  }

  // Guarantee the demo customer has at least one confirmed upcoming visit with the demo provider.
  const sarah = providers[0];
  for (let offset = 1; offset <= 14; offset += 1) {
    const date = addDays(today, offset);
    const day = sarah.availability.getDaySchedule(date);
    if (!day) continue;
    const taken = new Set(docs.filter((d) => d.isActive && String(d.provider) === String(sarah.user._id) && d.date === date).map((d) => d.startTime));
    const slot = generateSlots({ ...day, slotDuration: 30 }).find((s) => !taken.has(s.startTime) && !customerSlots.has(`${customers[0]._id}|${date}|${s.startTime}`));
    if (slot) {
      docs.push({
        customer: customers[0]._id, provider: sarah.user._id, providerProfile: sarah.profile._id, date, startTime: slot.startTime, endTime: slot.endTime,
        status: 'confirmed', isActive: true, notes: 'Annual check-up.', price: sarah.profile.price,
        statusHistory: [{ status: 'pending', changedBy: customers[0]._id, note: 'Booking requested' }, { status: 'confirmed', changedBy: sarah.user._id, note: '' }],
      });
      break;
    }
  }

  const appointments = await Appointment.insertMany(docs);

  await Promise.all(
    [...ratings.entries()].map(([profileId, { sum, n }]) =>
      ProviderProfile.updateOne({ _id: profileId }, { ratingAverage: Math.round((sum / n) * 10) / 10, ratingCount: n })
    )
  );

  // A few notifications and audit entries so the inbox and activity feed are not empty.
  const alice = customers[0];
  const aliceUpcoming = appointments
    .filter((a) => String(a.customer) === String(alice._id) && a.status === 'confirmed' && a.date >= today)
    .slice(0, 3);
  const providerName = new Map(providers.map((p) => [String(p.user._id), p.user.name]));
  await Notification.insertMany([
    { user: alice._id, type: 'welcome', title: 'Welcome to BookEase', message: 'Your account is ready. Find a provider and book your first appointment in seconds.', link: '/providers', isRead: true, emailStatus: 'skipped' },
    ...aliceUpcoming.map((a) => ({
      user: alice._id, type: 'booking_confirmed', title: 'Appointment confirmed', appointment: a._id, link: '/customer/appointments', emailStatus: 'skipped',
      message: `Your appointment with ${providerName.get(String(a.provider))} on ${a.date} at ${a.startTime} was confirmed.`,
    })),
    { user: sarah.user._id, type: 'welcome', title: 'Welcome to BookEase', message: 'Your provider profile is live. Keep your working hours up to date.', link: '/provider/availability', isRead: true, emailStatus: 'skipped' },
    { user: admin._id, type: 'booking_request', title: 'Provider awaiting approval', message: 'Daniel Kim (Physiotherapist) registered and is waiting for approval.', link: '/admin/manage?tab=providers', emailStatus: 'skipped' },
  ]);

  await ActivityLog.insertMany([
    { actorRole: 'system', action: 'system.seeded', description: 'Demo data loaded' },
    ...providers.filter((p) => p.pending).map((p) => ({ actor: p.user._id, actorRole: 'provider', action: 'user.registered', entityType: 'User', entityId: p.user._id, description: `${p.user.name} registered as provider` })),
  ]);

  return { categories: categories.length, customers: customers.length, providers: providers.length, appointments: appointments.length };
}

module.exports = { seedDatabase, DEMO_PASSWORDS };
