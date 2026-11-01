import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchCatalogue, fetchSite, type Catalogue, type Property, type Room, type SiteInfo, type Unit } from './api';

/** A room together with the property and unit it belongs to, for flat listings and search. */
export interface RoomEntry {
  room: Room;
  unit: Unit;
  property: Property;
}

interface DataState {
  site: SiteInfo;
  catalogue: Catalogue;
  rooms: RoomEntry[];
  findProperty: (id: string) => Property | undefined;
  findRoom: (id: string) => RoomEntry | undefined;
}

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchSite(), fetchCatalogue()])
      .then(([s, c]) => {
        setSite(s);
        setCatalogue(c);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const value = useMemo<DataState | null>(() => {
    if (!site || !catalogue) return null;
    const rooms = catalogue.properties.flatMap((property) =>
      property.units.flatMap((unit) => unit.rooms.map((room) => ({ room, unit, property }))),
    );
    const propertyById = new Map(catalogue.properties.map((p) => [p.id, p]));
    const roomById = new Map(rooms.map((r) => [r.room.id, r]));
    return {
      site,
      catalogue,
      rooms,
      findProperty: (id) => propertyById.get(id),
      findRoom: (id) => roomById.get(id),
    };
  }, [site, catalogue]);

  if (error) {
    return (
      <div className="state-screen">
        <h1>We couldn't load the listings</h1>
        <p>Please refresh the page in a moment.</p>
        <button className="btn btn-primary" onClick={() => location.reload()}>Try again</button>
      </div>
    );
  }

  if (!value) {
    return (
      <div className="state-screen">
        <div className="spinner" aria-label="Loading" />
      </div>
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}

export const unitLabel = (property: Property, unit: Unit) => (unit.name ? `${property.name} · ${unit.name}` : property.name);

/** Distinct property areas, alphabetically, for the area filters. */
export const areaList = (properties: Property[]) =>
  [...new Set(properties.map((p) => p.area).filter((a): a is string => Boolean(a)))].sort((a, b) => a.localeCompare(b));

export const roomCover = (room: Room) => room.media.find((m) => m.kind === 'photo') ?? room.media[0];

export const countMedia = (items: { kind: string }[]) => ({
  photos: items.filter((m) => m.kind === 'photo').length,
  videos: items.filter((m) => m.kind === 'video').length,
});

export function enquiryMessage(entry: RoomEntry | null, property: Property | null, pageUrl: string) {
  if (entry) {
    const where = entry.unit.name ? `${entry.property.name} (unit ${entry.unit.name})` : entry.property.name;
    return `Hi! I saw the ${entry.room.name} at ${where} on your website and I'm interested. Is it still available? ${pageUrl}`;
  }
  if (property) {
    return `Hi! I'm interested in renting a room at ${property.name}. Which rooms are available now? ${pageUrl}`;
  }
  return "Hi! I found your rooms for rent website and I'd like to ask about available rooms.";
}

export function useDocumentTitle(title: string) {
  const { site } = useData();
  useEffect(() => {
    document.title = title ? `${title} | ${site.brandName}` : `${site.brandName} – Rooms for Rent`;
  }, [title, site.brandName]);
}
