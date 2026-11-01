import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { unitLabel, useData, type RoomEntry } from './data';

const STORAGE_KEY = 'kl-room-finder:shortlist';
/** Keeps the combined WhatsApp message a sensible length. */
export const SHORTLIST_LIMIT = 10;

interface ShortlistState {
  entries: RoomEntry[];
  has: (roomId: string) => boolean;
  toggle: (roomId: string) => void;
  remove: (roomId: string) => void;
  clear: () => void;
  isFull: boolean;
}

const ShortlistContext = createContext<ShortlistState | null>(null);

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Rooms the visitor has saved. Kept in their own browser only, so nothing is sent anywhere until they enquire. */
export function ShortlistProvider({ children }: { children: ReactNode }) {
  const { findRoom } = useData();
  const [ids, setIds] = useState<string[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* private browsing or storage blocked: the shortlist still works until the tab closes */
    }
  }, [ids]);

  // Rooms removed from the website since they were saved are dropped quietly.
  const entries = useMemo(() => ids.map((id) => findRoom(id)).filter((e): e is RoomEntry => Boolean(e)), [ids, findRoom]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback(
    (id: string) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= SHORTLIST_LIMIT ? cur : [...cur, id])),
    [],
  );
  const remove = useCallback((id: string) => setIds((cur) => cur.filter((x) => x !== id)), []);
  const clear = useCallback(() => setIds([]), []);

  const value = useMemo(
    () => ({ entries, has, toggle, remove, clear, isFull: entries.length >= SHORTLIST_LIMIT }),
    [entries, has, toggle, remove, clear],
  );
  return <ShortlistContext.Provider value={value}>{children}</ShortlistContext.Provider>;
}

export function useShortlist() {
  const ctx = useContext(ShortlistContext);
  if (!ctx) throw new Error('useShortlist must be used inside ShortlistProvider');
  return ctx;
}

/** One enquiry listing every saved room with its link, so the agent can check them all in one go. */
export function shortlistMessage(entries: RoomEntry[], origin: string) {
  const lines = entries.map((e, i) => `${i + 1}. ${e.room.name} – ${unitLabel(e.property, e.unit)}\n   ${origin}/r/${e.room.id}`);
  return `Hi! I'm interested in these ${entries.length === 1 ? 'room' : `${entries.length} rooms`} from your website:\n\n${lines.join('\n')}\n\nAre they still available?`;
}
