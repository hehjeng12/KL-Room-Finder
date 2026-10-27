import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RoomCard } from '../components/Cards';
import { SearchIcon } from '../components/Icons';
import { unitLabel, useData, useDocumentTitle } from '../data';
import { ROOM_TYPES } from './roomTypes';

type Sort = 'default' | 'price' | 'media';

export function RoomsPage() {
  const { rooms, catalogue } = useData();
  const [params, setParams] = useSearchParams();
  useDocumentTitle('All rooms for rent');

  const q = params.get('q') ?? '';
  const type = params.get('type') ?? '';
  const property = params.get('property') ?? '';
  const videoOnly = params.get('video') === '1';
  const hideTaken = params.get('available') === '1';
  const sort = (params.get('sort') as Sort) || 'default';

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const types = ROOM_TYPES.filter((t) => rooms.some((r) => r.room.type === t.type));
  const hasPrices = rooms.some((r) => r.room.price != null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rooms.filter((r) => {
      if (type && r.room.type !== type) return false;
      if (property && r.property.id !== property) return false;
      if (videoOnly && !r.room.media.some((m) => m.kind === 'video')) return false;
      if (hideTaken && r.room.status?.toLowerCase() === 'taken') return false;
      if (needle) {
        const hay = `${unitLabel(r.property, r.unit)} ${r.room.name} ${r.room.type} ${r.property.area ?? ''}`.toLowerCase();
        if (!needle.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    if (sort === 'price') list.sort((a, b) => (a.room.price ?? Infinity) - (b.room.price ?? Infinity));
    if (sort === 'media') list.sort((a, b) => b.room.media.length - a.room.media.length);
    return list;
  }, [rooms, q, type, property, videoOnly, hideTaken, sort]);

  const filtered = Boolean(q || type || property || videoOnly || hideTaken);

  return (
    <div className="container page">
      <header className="page-head">
        <h1>Rooms for rent</h1>
        <p className="muted">{results.length} of {rooms.length} rooms</p>
      </header>

      <div className="filters">
        <label className="search compact">
          <SearchIcon />
          <input value={q} onChange={(e) => update('q', e.target.value)} placeholder="Search property, unit or room" aria-label="Search rooms" />
        </label>
        <select value={property} onChange={(e) => update('property', e.target.value)} aria-label="Property">
          <option value="">All properties</option>
          {catalogue.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => update('sort', e.target.value === 'default' ? '' : e.target.value)} aria-label="Sort">
          <option value="default">Sort: by property</option>
          {hasPrices && <option value="price">Sort: price, low to high</option>}
          <option value="media">Sort: most photos & videos</option>
        </select>
        <label className="toggle">
          <input type="checkbox" checked={videoOnly} onChange={(e) => update('video', e.target.checked ? '1' : '')} />
          With video tour
        </label>
        <label className="toggle">
          <input type="checkbox" checked={hideTaken} onChange={(e) => update('available', e.target.checked ? '1' : '')} />
          Hide taken
        </label>
      </div>

      <div className="chips" role="group" aria-label="Room type">
        <button className={!type ? 'chip active' : 'chip'} onClick={() => update('type', '')}>All types</button>
        {types.map((t) => (
          <button key={t.type} className={type === t.type ? 'chip active' : 'chip'} onClick={() => update('type', t.type)}>
            {t.label}
          </button>
        ))}
      </div>

      {results.length > 0 ? (
        <div className="grid grid-4">
          {results.map((r) => <RoomCard key={r.room.id} entry={r} />)}
        </div>
      ) : (
        <div className="empty-state">
          <p>No rooms match those filters.</p>
          {filtered && <button className="btn btn-outline" onClick={() => setParams({}, { replace: true })}>Clear filters</button>}
        </div>
      )}
    </div>
  );
}
