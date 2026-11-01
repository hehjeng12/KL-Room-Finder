import { useSearchParams } from 'react-router-dom';
import { PropertyCard } from '../components/Cards';
import { SearchIcon } from '../components/Icons';
import { areaList, useData, useDocumentTitle } from '../data';

export function PropertiesPage() {
  const { catalogue } = useData();
  const [params, setParams] = useSearchParams();
  useDocumentTitle('Properties');

  // Kept in the URL so an area can be linked from a post, e.g. /properties?area=Kepong
  const q = params.get('q') ?? '';
  const area = params.get('area') ?? '';
  const areas = areaList(catalogue.properties);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const needle = q.trim().toLowerCase();
  const list = catalogue.properties.filter(
    (p) => (!area || p.area === area) && (!needle || `${p.name} ${p.area ?? ''} ${p.address ?? ''}`.toLowerCase().includes(needle)),
  );

  return (
    <div className="container page">
      <header className="page-head">
        <h1>Properties</h1>
        <p className="muted">{catalogue.properties.length} condominiums and apartments with rooms for rent</p>
      </header>
      <div className="filters">
        <label className="search compact">
          <SearchIcon />
          <input value={q} onChange={(e) => update('q', e.target.value)} placeholder="Search by name or area" aria-label="Search properties" />
        </label>
      </div>
      {areas.length > 0 && (
        <div className="chips" role="group" aria-label="Area">
          <button className={!area ? 'chip active' : 'chip'} onClick={() => update('area', '')}>All areas</button>
          {areas.map((a) => (
            <button key={a} className={area === a ? 'chip active' : 'chip'} onClick={() => update('area', a)}>{a}</button>
          ))}
        </div>
      )}
      {list.length > 0 ? (
        <div className="grid grid-3">
          {list.map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
      ) : (
        <div className="empty-state"><p>No properties match{q ? ` “${q}”` : ''}{area ? ` in ${area}` : ''}.</p></div>
      )}
    </div>
  );
}
