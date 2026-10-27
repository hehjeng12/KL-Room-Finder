import { Link, useParams } from 'react-router-dom';
import { formatPrice, thumbUrl } from '../api';
import { RoomCard } from '../components/Cards';
import { ContactButtons } from '../components/ContactButtons';
import { PinIcon } from '../components/Icons';
import { MediaGrid } from '../components/Media';
import { countMedia, enquiryMessage, useData, useDocumentTitle } from '../data';
import { NotFoundPage } from './NotFoundPage';

export function PropertyPage() {
  const { propertyId = '' } = useParams();
  const { findProperty, site } = useData();
  const property = findProperty(propertyId);
  useDocumentTitle(property ? `Rooms for rent at ${property.name}` : 'Not found');

  if (!property) return <NotFoundPage />;

  const rooms = property.units.flatMap((u) => u.rooms);
  const media = countMedia(property.units.flatMap((u) => [...u.sharedMedia, ...u.rooms.flatMap((r) => r.media)]));
  const price = formatPrice(property.priceFrom, site.currency);
  const namedUnits = property.units.filter((u) => u.name);

  return (
    <>
      <section className="property-hero">
        {property.coverMediaId && <img src={thumbUrl(property.coverMediaId, 1600)} alt="" />}
        <div className="container property-hero-inner">
          <nav className="breadcrumb"><Link to="/">Home</Link> / <Link to="/properties">Properties</Link></nav>
          <h1>{property.name}</h1>
          {(property.area || property.address) && (
            <p className="hero-location"><PinIcon size={18} /> {[property.address, property.area].filter(Boolean).join(', ')}</p>
          )}
          <div className="hero-facts">
            <span>{rooms.length} room{rooms.length === 1 ? '' : 's'}</span>
            {namedUnits.length > 1 && <span>{namedUnits.length} units</span>}
            <span>{media.photos} photos</span>
            {media.videos > 0 && <span>{media.videos} video tours</span>}
            <span>{price ? `From ${price}/mo` : 'Contact me for prices'}</span>
          </div>
        </div>
      </section>

      <div className="container page property-layout">
        <div className="property-main">
          {(property.description || property.highlights.length > 0) && (
            <section className="info-card">
              <h2>About {property.name}</h2>
              {property.description && <p>{property.description}</p>}
              {property.highlights.length > 0 && (
                <ul className="highlights">{property.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
              )}
              {property.mapUrl && (
                <a className="btn btn-outline" href={property.mapUrl} target="_blank" rel="noopener noreferrer"><PinIcon size={18} /> Open in Google Maps</a>
              )}
            </section>
          )}

          {property.units.map((unit) => (
            <section key={unit.id} className="unit-section">
              <div className="section-head">
                <h2>{unit.name ? `Unit ${unit.name}` : 'Rooms'}</h2>
                {unit.roomsNote && <span className="pill subtle">{unit.roomsNote}</span>}
              </div>
              <div className="grid grid-3">
                {unit.rooms.map((room) => <RoomCard key={room.id} entry={{ room, unit, property }} showProperty={false} />)}
              </div>
              {unit.sharedMedia.length > 0 && (
                <div className="shared">
                  <h3>Shared spaces{unit.name ? ` in ${unit.name}` : ''}</h3>
                  <MediaGrid items={unit.sharedMedia} title={`${property.name} ${unit.name} – shared spaces`} />
                </div>
              )}
            </section>
          ))}
        </div>

        <aside className="sticky-panel">
          <h3>Interested in {property.name}?</h3>
          <p className="muted small">Message me to check which rooms are available and to arrange a viewing.</p>
          <ContactButtons message={enquiryMessage(null, property, location.href)} />
        </aside>
      </div>
    </>
  );
}
