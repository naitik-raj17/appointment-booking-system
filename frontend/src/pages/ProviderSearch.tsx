import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { categoryApi, providerApi } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useDebounce } from '../hooks/useDebounce';
import { Avatar, Badge, Button, CategoryIcon, EmptyState, ErrorState, Input, Pagination, Rating, Select, Skeleton } from '../components/ui';
import { formatMoney } from '../utils/format';

const SORTS = [
  { value: 'relevance', label: 'Best match' },
  { value: 'rating', label: 'Top rated' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'experience', label: 'Most experienced' },
  { value: 'name', label: 'Name (A–Z)' },
];

export default function ProviderSearch() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [city, setCity] = useState(params.get('city') || '');
  const [showFilters, setShowFilters] = useState(false);
  const debouncedQ = useDebounce(q);
  const debouncedCity = useDebounce(city);

  const category = params.get('category') || '';
  const sort = params.get('sort') || 'relevance';
  const maxPrice = params.get('maxPrice') || '';
  const minRating = params.get('minRating') || '';
  const page = Number(params.get('page') || 1);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (debouncedQ !== (params.get('q') || '') || debouncedCity !== (params.get('city') || '')) update({ q: debouncedQ, city: debouncedCity });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, debouncedCity]);

  const categories = useAsync(() => categoryApi.list(), []);
  const results = useAsync(
    () =>
      providerApi.search({
        q: params.get('q') || undefined,
        city: params.get('city') || undefined,
        category: category || undefined,
        sort,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        minRating: minRating ? Number(minRating) : undefined,
        page,
        limit: 9,
      }),
    [params.toString()]
  );

  const activeFilters = [category, maxPrice, minRating, params.get('city')].filter(Boolean).length;
  const clearAll = () => {
    setQ('');
    setCity('');
    setParams(new URLSearchParams(), { replace: true });
  };

  const filters = (
    <div className="space-y-5">
      <div>
        <p className="label">Category</p>
        <div className="flex flex-col gap-1">
          <button onClick={() => update({ category: '' })} className={`rounded-md px-2.5 py-1.5 text-left text-sm ${!category ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}>
            All categories
          </button>
          {categories.data?.map((c) => (
            <button key={c._id} onClick={() => update({ category: c.slug })} className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm ${category === c.slug ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              <span className="flex items-center gap-2">
                <CategoryIcon icon={c.icon} className="h-4 w-4" /> {c.name}
              </span>
              <span className="text-xs text-slate-400">{c.providerCount}</span>
            </button>
          ))}
        </div>
      </div>
      <Input label="City" placeholder="Any city" value={city} onChange={(e) => setCity(e.target.value)} />
      <Select label="Max price" value={maxPrice} onChange={(e) => update({ maxPrice: e.target.value })}>
        <option value="">Any price</option>
        {[50, 100, 150, 200].map((p) => (
          <option key={p} value={p}>
            Up to {formatMoney(p)}
          </option>
        ))}
      </Select>
      <Select label="Minimum rating" value={minRating} onChange={(e) => update({ minRating: e.target.value })}>
        <option value="">Any rating</option>
        {[4.5, 4, 3].map((r) => (
          <option key={r} value={r}>
            {r}+ stars
          </option>
        ))}
      </Select>
      {activeFilters > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="h-4 w-4" /> Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Find a provider</h1>
        <p className="mt-1 text-sm text-slate-500">Search by name, specialization, service or city.</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search providers…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search providers" />
        </div>
        <div className="flex gap-2">
          <select className="input sm:w-52" value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort by">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <Button variant="outline" className="lg:hidden" onClick={() => setShowFilters((s) => !s)}>
            <SlidersHorizontal className="h-4 w-4" /> Filters{activeFilters ? ` (${activeFilters})` : ''}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className={`${showFilters ? 'block' : 'hidden'} card p-4 lg:block lg:w-64 lg:shrink-0 lg:self-start`}>{filters}</aside>

        <section className="min-w-0 flex-1">
          {results.error ? (
            <ErrorState message={results.error} onRetry={results.reload} />
          ) : results.loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-56" />
              ))}
            </div>
          ) : results.data && results.data.data.length > 0 ? (
            <>
              <p className="mb-3 text-sm text-slate-500">
                {results.data.meta.total} provider{results.data.meta.total === 1 ? '' : 's'} found
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.data.data.map((p) => (
                  <Link key={p.id} to={`/providers/${p.id}`} className="card flex flex-col p-5 transition hover:border-brand-300 hover:shadow-md">
                    <div className="flex items-start gap-3">
                      <Avatar name={p.name} size="lg" />
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold text-slate-900">{p.name}</h2>
                        <p className="truncate text-sm text-slate-500">{p.specialization}</p>
                        <div className="mt-1">
                          <Rating value={p.ratingAverage} count={p.ratingCount} />
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-slate-600">{p.bio}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.category && (
                        <Badge className="bg-brand-50 text-brand-700 ring-brand-600/20">
                          <CategoryIcon icon={p.category.icon} className="h-3 w-3" /> {p.category.name}
                        </Badge>
                      )}
                      {p.tags.slice(0, 2).map((t) => (
                        <Badge key={t}>{t}</Badge>
                      ))}
                    </div>
                    <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <MapPin className="h-4 w-4" /> {p.city || '—'}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatMoney(p.price, p.currency)}
                        <span className="font-normal text-slate-500"> / session</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <Pagination page={results.data.meta.page} totalPages={results.data.meta.totalPages} total={results.data.meta.total} onChange={(p) => update({ page: String(p) })} />
            </>
          ) : (
            <EmptyState
              title="No providers match your search"
              message="Try a different keyword or remove some filters."
              action={
                <Button variant="outline" onClick={clearAll}>
                  Clear search
                </Button>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
