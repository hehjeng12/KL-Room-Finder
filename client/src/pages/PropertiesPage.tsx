import { useState } from 'react';
import { PropertyCard } from '../components/Cards';
import { SearchIcon } from '../components/Icons';
import { useData, useDocumentTitle } from '../data';

export function PropertiesPage() {
  const { catalogue } = useData();
  const [q, setQ] = useState('');
  useDocumentTitle('Properties');

  const needle = q.trim().toLowerCase();
  const list = catalogue.properties.filter(
    (p) => !needle || `${p.name} ${p.area ?? ''} ${p.address ?? ''}`.toLowerCase().includes(needle),
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
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or area" aria-label="Search properties" />
        </label>
      </div>
      {list.length > 0 ? (
        <div className="grid grid-3">
          {list.map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
      ) : (
        <div className="empty-state"><p>No properties match “{q}”.</p></div>
      )}
    </div>
  );
}
