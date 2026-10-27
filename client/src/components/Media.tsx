import { useCallback, useEffect, useRef, useState } from 'react';
import { mediaUrl, thumbUrl, type MediaItem } from '../api';
import { ChevronIcon, CloseIcon, PlayIcon } from './Icons';

/** Responsive thumbnail. Photos come from the resized cache; videos show a poster-style tile. */
export function MediaThumb({ item, alt, sizes = '(max-width: 640px) 100vw, 33vw', className = '', eager = false }: {
  item: MediaItem | undefined;
  alt: string;
  sizes?: string;
  className?: string;
  eager?: boolean;
}) {
  if (!item) return <div className={`media-thumb empty ${className}`} />;
  if (item.kind === 'video') {
    return (
      <div className={`media-thumb video ${className}`}>
        <span className="play-badge"><PlayIcon size={22} /></span>
        <span className="video-label">Video tour</span>
      </div>
    );
  }
  return (
    <img
      className={`media-thumb ${className}`}
      src={thumbUrl(item.id, 480)}
      srcSet={`${thumbUrl(item.id, 480)} 480w, ${thumbUrl(item.id, 960)} 960w`}
      sizes={sizes}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

/** Grid of photos/videos that opens a full-screen viewer. */
export function MediaGrid({ items, title }: { items: MediaItem[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (items.length === 0) return null;
  return (
    <>
      <div className="media-grid">
        {items.map((m, i) => (
          <button key={m.id} className="media-grid-item" onClick={() => setOpen(i)} aria-label={`Open ${m.kind} ${i + 1} of ${title}`}>
            <MediaThumb item={m} alt={`${title} – ${m.kind} ${i + 1}`} sizes="(max-width: 640px) 50vw, 25vw" />
          </button>
        ))}
      </div>
      {open !== null && <Lightbox items={items} start={open} title={title} onClose={() => setOpen(null)} />}
    </>
  );
}

/** Main gallery for a room: one large viewer with a thumbnail strip underneath. */
export function Gallery({ items, title }: { items: MediaItem[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const current = items[index];

  useEffect(() => {
    setIndex(0);
  }, [items]);

  if (!current) return <div className="gallery-main empty">No photos yet</div>;

  const step = (d: number) => setIndex((i) => (i + d + items.length) % items.length);

  return (
    <div className="gallery">
      <div className="gallery-main">
        {current.kind === 'video' ? (
          <video key={current.id} src={`${mediaUrl(current.id)}#t=0.1`} controls playsInline preload="metadata" />
        ) : (
          <button className="gallery-photo" onClick={() => setFullscreen(true)} aria-label="View full screen">
            <img src={thumbUrl(current.id, 1600)} alt={`${title} – photo ${index + 1}`} />
          </button>
        )}
        {items.length > 1 && (
          <>
            <button className="nav-arrow left" onClick={() => step(-1)} aria-label="Previous"><ChevronIcon dir="left" /></button>
            <button className="nav-arrow right" onClick={() => step(1)} aria-label="Next"><ChevronIcon /></button>
          </>
        )}
        <span className="counter">{index + 1} / {items.length}</span>
      </div>
      {items.length > 1 && (
        <div className="gallery-strip">
          {items.map((m, i) => (
            <button key={m.id} className={i === index ? 'active' : ''} onClick={() => setIndex(i)} aria-label={`Show ${m.kind} ${i + 1}`}>
              <MediaThumb item={m} alt="" sizes="120px" eager />
            </button>
          ))}
        </div>
      )}
      {fullscreen && <Lightbox items={items} start={index} title={title} onClose={() => setFullscreen(false)} onChange={setIndex} />}
    </div>
  );
}

export function Lightbox({ items, start, title, onClose, onChange }: {
  items: MediaItem[];
  start: number;
  title: string;
  onClose: () => void;
  onChange?: (index: number) => void;
}) {
  const [index, setIndex] = useState(start);
  const touchX = useRef<number | null>(null);
  const current = items[index];

  const go = useCallback(
    (d: number) => setIndex((i) => {
      const next = (i + d + items.length) % items.length;
      onChange?.(next);
      return next;
    }),
    [items.length, onChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [go, onClose]);

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="lightbox-top">
        <span>{title} · {index + 1} / {items.length}</span>
        <button onClick={onClose} aria-label="Close"><CloseIcon /></button>
      </div>
      <div className="lightbox-stage" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {current.kind === 'video' ? (
          <video key={current.id} src={mediaUrl(current.id)} controls autoPlay playsInline />
        ) : (
          <img key={current.id} src={thumbUrl(current.id, 1600)} alt={`${title} – ${index + 1}`} />
        )}
      </div>
      {items.length > 1 && (
        <>
          <button className="nav-arrow left" onClick={() => go(-1)} aria-label="Previous"><ChevronIcon dir="left" /></button>
          <button className="nav-arrow right" onClick={() => go(1)} aria-label="Next"><ChevronIcon /></button>
        </>
      )}
    </div>
  );
}
