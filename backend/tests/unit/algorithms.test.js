const { overlaps, mergeIntervals, hasConflict, findOverlappingPairs } = require('../../src/algorithms/intervals');
const { generateSlots } = require('../../src/algorithms/slotGenerator');
const { mergeSort, sortAppointments, compareAppointments } = require('../../src/algorithms/sorting');
const { relevanceScore, rankProviders, tokenize, escapeRegex } = require('../../src/algorithms/providerSearch');
const t = require('../../src/utils/time');

describe('interval algorithms', () => {
  test('UT-01 overlaps treats intervals as half-open', () => {
    expect(overlaps({ start: 540, end: 570 }, { start: 560, end: 600 })).toBe(true);
    expect(overlaps({ start: 540, end: 570 }, { start: 570, end: 600 })).toBe(false);
  });

  test('UT-02 mergeIntervals sorts and merges overlapping/touching ranges', () => {
    expect(mergeIntervals([{ start: 600, end: 630 }, { start: 540, end: 570 }, { start: 560, end: 600 }])).toEqual([{ start: 540, end: 630 }]);
    expect(mergeIntervals([])).toEqual([]);
  });

  test('UT-03 hasConflict uses binary search on sorted intervals', () => {
    const booked = [{ start: 540, end: 570 }, { start: 600, end: 630 }, { start: 700, end: 760 }];
    expect(hasConflict(booked, { start: 570, end: 600 })).toBe(false);
    expect(hasConflict(booked, { start: 620, end: 650 })).toBe(true);
    expect(hasConflict(booked, { start: 800, end: 830 })).toBe(false);
    expect(hasConflict([], { start: 0, end: 10 })).toBe(false);
  });

  test('UT-04 findOverlappingPairs reports all overlapping pairs', () => {
    const pairs = findOverlappingPairs([{ start: 0, end: 10 }, { start: 5, end: 15 }, { start: 20, end: 30 }, { start: 8, end: 9 }]);
    expect(pairs).toHaveLength(3);
  });
});

describe('slot generation', () => {
  test('UT-05 generates fixed-length slots and skips breaks', () => {
    const slots = generateSlots({ dayStart: 540, dayEnd: 720, slotDuration: 60, breaks: [{ start: 600, end: 660 }] });
    expect(slots.map((s) => s.startTime)).toEqual(['09:00', '11:00']);
  });

  test('UT-06 marks booked and past slots and applies buffers', () => {
    const slots = generateSlots({ dayStart: 540, dayEnd: 660, slotDuration: 30, bufferMinutes: 10, booked: [{ start: 580, end: 610 }], notBefore: 545 });
    expect(slots).toEqual([
      { startTime: '09:00', endTime: '09:30', status: 'past' },
      { startTime: '09:40', endTime: '10:10', status: 'booked' },
      { startTime: '10:20', endTime: '10:50', status: 'available' },
    ]);
  });

  test('UT-07 returns no slots for invalid input', () => {
    expect(generateSlots({ dayStart: 600, dayEnd: 540, slotDuration: 30 })).toEqual([]);
    expect(generateSlots({ dayStart: 540, dayEnd: 600, slotDuration: 0 })).toEqual([]);
  });
});

describe('sorting', () => {
  test('UT-08 mergeSort is stable and sorts by date then time', () => {
    const items = [
      { id: 1, date: '2026-11-02', startTime: '10:00' },
      { id: 2, date: '2026-11-01', startTime: '15:00' },
      { id: 3, date: '2026-11-02', startTime: '09:00' },
      { id: 4, date: '2026-11-02', startTime: '10:00' },
    ];
    expect(sortAppointments(items).map((a) => a.id)).toEqual([2, 3, 1, 4]);
    expect(sortAppointments(items, 'desc').map((a) => a.id)).toEqual([1, 4, 3, 2]);
    expect(mergeSort([3, 1, 2], (a, b) => a - b)).toEqual([1, 2, 3]);
    expect(compareAppointments(items[0], items[3])).toBe(0);
  });
});

describe('provider search', () => {
  const providers = [
    { name: 'Dr. Emily Chen', specialization: 'Dental Surgeon', categoryName: 'Dental Care', tags: ['cleaning'], city: 'San Francisco', bio: '', price: 120, ratingAverage: 4.8, ratingCount: 10, experienceYears: 9 },
    { name: 'Dr. Sarah Mitchell', specialization: 'General Physician', categoryName: 'Healthcare', tags: ['checkup'], city: 'New York', bio: 'dental referrals', price: 80, ratingAverage: 4.5, ratingCount: 3, experienceYears: 12 },
    { name: 'Jessica Taylor', specialization: 'Personal Trainer', categoryName: 'Fitness', tags: [], city: 'Los Angeles', bio: '', price: 60, ratingAverage: 4.9, ratingCount: 7, experienceYears: 7 },
  ];

  test('UT-09 relevanceScore weights fields and requires every term', () => {
    expect(relevanceScore(providers[0], ['dental'])).toBe(4 + 3);
    expect(relevanceScore(providers[1], ['dental'])).toBe(1);
    expect(relevanceScore(providers[0], ['dental', 'york'])).toBe(0);
  });

  test('UT-10 rankProviders filters, sorts and paginates', () => {
    const r = rankProviders(providers, { q: 'dental', sort: 'relevance', page: 1, limit: 10 });
    expect(r.items.map((p) => p.name)).toEqual(['Dr. Emily Chen', 'Dr. Sarah Mitchell']);
    expect(rankProviders(providers, { sort: 'price_asc', page: 1, limit: 2 }).items.map((p) => p.price)).toEqual([60, 80]);
    expect(rankProviders(providers, { sort: 'relevance', page: 2, limit: 2 }).items).toHaveLength(1);
  });

  test('UT-11 tokenize and escapeRegex sanitise input', () => {
    expect(tokenize('  Dental   CARE ')).toEqual(['dental', 'care']);
    expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c');
  });
});

describe('time utilities', () => {
  test('UT-12 converts and validates dates/times', () => {
    expect(t.toMinutes('09:30')).toBe(570);
    expect(t.toHHMM(570)).toBe('09:30');
    expect(t.isValidDate('2026-02-30')).toBe(false);
    expect(t.isValidDate('2028-02-29')).toBe(true);
    expect(t.addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(t.dayOfWeek('2026-11-02')).toBe(1);
    expect(t.diffInDays('2026-10-30', '2026-11-02')).toBe(3);
  });
});
