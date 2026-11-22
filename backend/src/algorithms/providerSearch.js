/**
 * Provider search ranking. The database narrows the candidate set with indexed
 * filters (approved, category, price, rating, city); this module scores and
 * orders the remaining candidates.
 */

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function tokenize(query) {
  return String(query || '')
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
}

/** Field weights: a match in the name or specialization matters more than in the bio. */
const WEIGHTS = { name: 5, specialization: 4, category: 3, tags: 3, city: 2, bio: 1 };

/**
 * Relevance score = Σ over terms of Σ over fields (weight × [field contains term]).
 * Returns 0 when any term matches no field (AND semantics across terms).
 * Time O(t × f) per provider for t terms and f fields.
 */
function relevanceScore(provider, terms) {
  if (terms.length === 0) return 0;
  const fields = {
    name: provider.name,
    specialization: provider.specialization,
    category: provider.categoryName,
    tags: (provider.tags || []).join(' '),
    city: provider.city,
    bio: provider.bio,
  };
  let total = 0;
  for (const term of terms) {
    let termScore = 0;
    for (const [field, weight] of Object.entries(WEIGHTS)) {
      if (String(fields[field] || '').toLowerCase().includes(term)) termScore += weight;
    }
    if (termScore === 0) return 0;
    total += termScore;
  }
  return total;
}

const SORTERS = {
  relevance: (a, b) => b.score - a.score || b.ratingAverage - a.ratingAverage,
  rating: (a, b) => b.ratingAverage - a.ratingAverage || b.ratingCount - a.ratingCount,
  price_asc: (a, b) => a.price - b.price,
  price_desc: (a, b) => b.price - a.price,
  experience: (a, b) => b.experienceYears - a.experienceYears,
  name: (a, b) => a.name.localeCompare(b.name),
};

/**
 * Filters by text, sorts and paginates. Time O(n·t·f + n log n), space O(n).
 */
function rankProviders(providers, { q, sort = 'relevance', page = 1, limit = 12 }) {
  const terms = tokenize(q);
  let results = providers.map((p) => ({ ...p, score: relevanceScore(p, terms) }));
  if (terms.length > 0) results = results.filter((p) => p.score > 0);

  const sortKey = SORTERS[sort] ? sort : 'relevance';
  const effectiveSort = sortKey === 'relevance' && terms.length === 0 ? 'rating' : sortKey;
  results.sort((a, b) => SORTERS[effectiveSort](a, b) || a.name.localeCompare(b.name));

  const total = results.length;
  const start = (page - 1) * limit;
  return {
    items: results.slice(start, start + limit),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

module.exports = { escapeRegex, tokenize, relevanceScore, rankProviders, SORT_OPTIONS: Object.keys(SORTERS) };
