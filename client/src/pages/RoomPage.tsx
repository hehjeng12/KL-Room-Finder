import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatPrice } from '../api';
import { RoomCard, StatusBadge } from '../components/Cards';
import { ContactButtons } from '../components/ContactButtons';
import { LinkIcon } from '../components/Icons';
import { Gallery, MediaGrid } from '../components/Media';
import { countMedia, enquiryMessage, unitLabel, useData, useDocumentTitle } from '../data';
import { ROOM_TYPES } from './roomTypes';
import { NotFoundPage } from './NotFoundPage';

export function RoomPage() {
  const { roomId = '' } = useParams();
  const { findRoom, rooms, site } = useData();
  const entry = findRoom(roomId);
  const [copied, setCopied] = useState(false);
  useDocumentTitle(entry ? `${entry.room.name} at ${unitLabel(entry.property, entry.unit)}` : 'Not found');

  if (!entry) return <NotFoundPage />;
  const { room, unit, property } = entry;

  const { photos, videos } = countMedia(room.media);
  const price = formatPrice(room.price, site.currency);
  const typeInfo = ROOM_TYPES.find((t) => t.type === room.type);
  const siblings = unit.rooms.filter((r) => r.id !== room.id).map((r) => ({ room: r, unit, property }));
  const elsewhere = rooms.filter((r) => r.property.id === property.id && r.unit.id !== unit.id).slice(0, 4);

  const share = async () => {
    const url = location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* user cancelled the share sheet */
    }
  };

  return (
    <div className="container page">
      <nav className="breadcrumb dark">
        <Link to="/">Home</Link> / <Link to={`/p/${property.id}`}>{property.name}</Link>
        {unit.name && <> / <span>{unit.name}</span></>}
      </nav>

      <div className="room-layout">
        <div className="room-main">
          <Gallery items={room.media} title={`${room.name}, ${unitLabel(property, unit)}`} />
        </div>

        <aside className="sticky-panel">
          <div className="panel-badges">
            <span className="type-badge static">{room.type}</span>
            <StatusBadge status={room.status} />
          </div>
          <h1 className="room-title">{room.name}</h1>
          <p className="muted">{unitLabel(property, unit)}{property.area ? ` · ${property.area}` : ''}</p>
          <p className="room-price">{price ? <>{price}<small> / month</small></> : 'Contact me for price'}</p>
          {typeInfo && <p className="small muted">{typeInfo.blurb}.</p>}
          {room.notes && <p className="notes">{room.notes}</p>}
          <ul className="facts">
            <li>{photos} photo{photos === 1 ? '' : 's'}</li>
            {videos > 0 && <li>{videos} video tour{videos === 1 ? '' : 's'}</li>}
            {unit.sharedMedia.length > 0 && <li>Shared spaces shown below</li>}
          </ul>
          <ContactButtons message={enquiryMessage(entry, null, location.href)} />
          <button className="btn btn-ghost share" onClick={share}><LinkIcon size={18} /> {copied ? 'Link copied!' : 'Share this room'}</button>
        </aside>
      </div>

      {unit.sharedMedia.length > 0 && (
        <section className="section">
          <h2>Shared spaces{unit.name ? ` in unit ${unit.name}` : ''}</h2>
          <p className="muted">Living room, kitchen, bathrooms and other common areas.</p>
          <MediaGrid items={unit.sharedMedia} title={`${unitLabel(property, unit)} – shared spaces`} />
        </section>
      )}

      {siblings.length > 0 && (
        <section className="section">
          <h2>Other rooms in this unit</h2>
          <div className="grid grid-4">{siblings.map((r) => <RoomCard key={r.room.id} entry={r} showProperty={false} />)}</div>
        </section>
      )}

      {elsewhere.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>More rooms at {property.name}</h2>
            <Link to={`/p/${property.id}`} className="link-more">View all →</Link>
          </div>
          <div className="grid grid-4">{elsewhere.map((r) => <RoomCard key={r.room.id} entry={r} />)}</div>
        </section>
      )}
    </div>
  );
}
