import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { thumbUrl } from '../api';
import { PropertyCard, RoomCard } from '../components/Cards';
import { ContactButtons } from '../components/ContactButtons';
import { CameraIcon, SearchIcon, VideoIcon, WhatsAppIcon } from '../components/Icons';
import { countMedia, enquiryMessage, useData, useDocumentTitle } from '../data';
import { ROOM_TYPES } from './roomTypes';

export function HomePage() {
  const { site, catalogue, rooms } = useData();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  useDocumentTitle('');

  const byRoomCount = useMemo(
    () => [...catalogue.properties].sort((a, b) => totalRooms(b) - totalRooms(a)),
    [catalogue.properties],
  );
  const collage = byRoomCount.filter((p) => p.coverMediaId).slice(0, 3);
  const withVideo = rooms.filter((r) => r.room.media.some((m) => m.kind === 'video')).slice(0, 8);
  const media = countMedia(
    catalogue.properties.flatMap((p) => p.units.flatMap((u) => [...u.sharedMedia, ...u.rooms.flatMap((r) => r.media)])),
  );
  const typeCounts = new Map<string, number>();
  rooms.forEach((r) => typeCounts.set(r.room.type, (typeCounts.get(r.room.type) ?? 0) + 1));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(query.trim() ? `/rooms?q=${encodeURIComponent(query.trim())}` : '/rooms');
  };

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="pill">Real photos · Real video tours</span>
            <h1>Find a room you'll love coming home to.</h1>
            <p className="lead">{site.tagline}</p>
            <form className="search" onSubmit={submit} role="search">
              <SearchIcon />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a condo, e.g. Vierra, Sunway Belfield…"
                aria-label="Search properties and rooms"
              />
              <button className="btn btn-primary" type="submit">Search</button>
            </form>
            <div className="hero-stats">
              <div><strong>{rooms.length}</strong><span>rooms listed</span></div>
              <div><strong>{catalogue.properties.length}</strong><span>properties</span></div>
              <div><strong>{media.photos + media.videos}</strong><span>photos & videos</span></div>
            </div>
          </div>
          <div className="hero-collage" aria-hidden="true">
            {collage.map((p, i) => (
              <Link to={`/p/${p.id}`} key={p.id} className={`collage-tile t${i}`} tabIndex={-1}>
                <img src={thumbUrl(p.coverMediaId!, 960)} alt="" />
                <span>{p.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <h2>Browse by room type</h2>
          <Link to="/rooms" className="link-more">See all rooms →</Link>
        </div>
        <div className="type-tiles">
          {ROOM_TYPES.filter((t) => typeCounts.has(t.type)).map((t) => (
            <Link key={t.type} to={`/rooms?type=${encodeURIComponent(t.type)}`} className="type-tile">
              <strong>{t.label}</strong>
              <span>{t.blurb}</span>
              <em>{typeCounts.get(t.type)} listed</em>
            </Link>
          ))}
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <h2>Popular properties</h2>
          <Link to="/properties" className="link-more">All {catalogue.properties.length} properties →</Link>
        </div>
        <div className="grid grid-3">
          {byRoomCount.slice(0, 6).map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
      </section>

      {withVideo.length > 0 && (
        <section className="container section">
          <div className="section-head">
            <h2>Rooms with video tours</h2>
            <Link to="/rooms?video=1" className="link-more">More video tours →</Link>
          </div>
          <div className="grid grid-4">
            {withVideo.map((r) => <RoomCard key={r.room.id} entry={r} />)}
          </div>
        </section>
      )}

      <section className="section how">
        <div className="container">
          <h2>How it works</h2>
          <div className="steps">
            <div className="step">
              <span className="step-icon"><CameraIcon /></span>
              <h3>1. Browse real photos</h3>
              <p>Every listing shows the actual room and shared spaces, not stock pictures.</p>
            </div>
            <div className="step">
              <span className="step-icon"><VideoIcon /></span>
              <h3>2. Watch the video tour</h3>
              <p>Many rooms have a walk-through video so you can get a feel for the space first.</p>
            </div>
            <div className="step">
              <span className="step-icon"><WhatsAppIcon /></span>
              <h3>3. Message me</h3>
              <p>Tap WhatsApp, Messenger or Instagram. Your message already says which room you're asking about.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="cta-band">
          <div>
            <h2>Can't find the right room?</h2>
            <p>Tell me your budget, move-in date and preferred area and I'll send you suitable options.</p>
          </div>
          <ContactButtons layout="row" message={enquiryMessage(null, null, location.origin)} />
        </div>
      </section>
    </>
  );
}

const totalRooms = (p: { units: { rooms: unknown[] }[] }) => p.units.reduce((n, u) => n + u.rooms.length, 0);
