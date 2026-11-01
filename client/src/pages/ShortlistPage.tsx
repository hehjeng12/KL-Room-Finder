import { Link } from 'react-router-dom';
import { fullEnquiry } from '../api';
import { RoomCard } from '../components/Cards';
import { ContactButtons } from '../components/ContactButtons';
import { useData, useDocumentTitle } from '../data';
import { shortlistMessage, useShortlist } from '../shortlist';

export function ShortlistPage() {
  const { site } = useData();
  const { entries, remove, clear } = useShortlist();
  useDocumentTitle('Saved rooms');

  if (entries.length === 0) {
    return (
      <div className="container page empty-state">
        <h1>No saved rooms yet</h1>
        <p className="muted">Tap the ♡ on any room to save it. Save a few in different areas, then ask about them all in one message.</p>
        <Link to="/rooms" className="btn btn-primary">Browse rooms</Link>
      </div>
    );
  }

  const message = shortlistMessage(entries, location.origin);

  return (
    <div className="container page">
      <header className="page-head">
        <h1>Saved rooms</h1>
        <p className="muted">{entries.length} room{entries.length === 1 ? '' : 's'} saved on this device</p>
      </header>

      <div className="shortlist-layout">
        <div className="grid grid-3">
          {entries.map((e) => (
            <div key={e.room.id} className="shortlist-item">
              <button type="button" className="remove" onClick={() => remove(e.room.id)} aria-label={`Remove ${e.room.name} from saved rooms`}>Remove</button>
              <RoomCard entry={e} />
            </div>
          ))}
        </div>

        <aside className="sticky-panel">
          <h3>Ask about {entries.length === 1 ? 'this room' : `all ${entries.length} rooms`} at once</h3>
          <p className="small muted">One message with every room's link. I'll reply with the price, male/female unit and availability for each.</p>
          <p className="small muted">Your message will look like this:</p>
          <div className="preview-message">{fullEnquiry(site, message)}</div>
          <ContactButtons message={message} />
          <button type="button" className="btn btn-ghost" onClick={clear}>Clear saved rooms</button>
        </aside>
      </div>
    </div>
  );
}
