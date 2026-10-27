import { Link } from 'react-router-dom';
import { formatPrice, type Property } from '../api';
import { countMedia, roomCover, unitLabel, useData, type RoomEntry } from '../data';
import { CameraIcon, PinIcon, VideoIcon } from './Icons';
import { MediaThumb } from './Media';

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const s = status.toLowerCase();
  const label = s === 'taken' ? 'Taken' : s === 'reserved' ? 'Reserved' : s === 'available' ? 'Available' : status;
  return <span className={`status status-${s}`}>{label}</span>;
}

export function RoomCard({ entry, showProperty = true }: { entry: RoomEntry; showProperty?: boolean }) {
  const { site } = useData();
  const { room, unit, property } = entry;
  const { photos, videos } = countMedia(room.media);
  const price = formatPrice(room.price, site.currency);

  return (
    <Link to={`/r/${room.id}`} className={`card room-card ${room.status?.toLowerCase() === 'taken' ? 'is-taken' : ''}`}>
      <div className="card-media">
        <MediaThumb item={roomCover(room)} alt={room.name} />
        <span className="type-badge">{room.type}</span>
        <StatusBadge status={room.status} />
      </div>
      <div className="card-body">
        {showProperty && <p className="eyebrow">{unitLabel(property, unit)}</p>}
        {!showProperty && unit.name && <p className="eyebrow">Unit {unit.name}</p>}
        <h3>{room.name}</h3>
        <div className="card-meta">
          <span><CameraIcon size={16} /> {photos}</span>
          {videos > 0 && <span className="has-video"><VideoIcon size={16} /> {videos} video</span>}
          <span className="price">{price ? <>{price}<small>/mo</small></> : 'Contact for price'}</span>
        </div>
      </div>
    </Link>
  );
}


export function PropertyCard({ property }: { property: Property }) {
  const { site } = useData();
  const rooms = property.units.reduce((n, u) => n + u.rooms.length, 0);
  const media = property.units.flatMap((u) => [...u.sharedMedia, ...u.rooms.flatMap((r) => r.media)]);
  const { videos } = countMedia(media);
  const price = formatPrice(property.priceFrom, site.currency);
  const units = property.units.filter((u) => u.name).length;
  const cover = media.find((m) => m.id === property.coverMediaId);

  return (
    <Link to={`/p/${property.id}`} className="card property-card">
      <div className="card-media tall">
        <MediaThumb item={cover} alt={property.name} sizes="(max-width: 640px) 100vw, 40vw" />
        <div className="card-overlay">
          <h3>{property.name}</h3>
          {property.area && <p><PinIcon size={15} /> {property.area}</p>}
        </div>
      </div>
      <div className="card-body">
        <div className="card-meta">
          <span>{rooms} room{rooms === 1 ? '' : 's'}{units > 1 ? ` · ${units} units` : ''}</span>
          {videos > 0 && <span className="has-video"><VideoIcon size={16} /> {videos}</span>}
          <span className="price">{price ? <>from {price}</> : 'Contact for price'}</span>
        </div>
      </div>
    </Link>
  );
}
