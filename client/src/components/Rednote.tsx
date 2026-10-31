import { useEffect, useState } from 'react';
import { fullEnquiry, hasRednote } from '../api';
import { useData } from '../data';
import { CloseIcon } from './Icons';

/** rednote's wordmark-style badge, drawn as text so no third-party logo file is needed. */
export const RednoteBadge = () => <span className="rednote-badge" aria-hidden="true">小红书</span>;

/**
 * rednote (小红书) has no public link for pre-filled messages, so the button opens a card with
 * the QR code and ID for visitors to scan or search in the app.
 */
export function RednoteButton({ message, className = 'btn btn-rednote' }: { message: string; className?: string }) {
  const { site } = useData();
  const [open, setOpen] = useState(false);
  if (!hasRednote(site)) return null;
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-label="rednote (小红书)">
        <RednoteBadge /> {className.includes('btn') && 'rednote'}
      </button>
      {open && <RednoteDialog message={message} onClose={() => setOpen(false)} />}
    </>
  );
}

function RednoteDialog({ message, onClose }: { message: string; onClose: () => void }) {
  const { site } = useData();
  const [copied, setCopied] = useState<'id' | 'message' | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async (text: string, what: 'id' | 'message') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Contact on rednote" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal rednote-modal">
        <button className="modal-close" onClick={onClose} aria-label="Close"><CloseIcon size={18} /></button>
        <RednoteBadge />
        <h3>Find me on rednote</h3>
        {site.rednoteQrImage && <img className="rednote-qr" src={site.rednoteQrImage} alt="rednote profile QR code" />}
        <p className="small muted">Scan with the rednote (小红书) app{site.rednoteId ? ', or search my ID:' : '.'}</p>
        {site.rednoteId && (
          <button className="rednote-id" onClick={() => copy(site.rednoteId, 'id')}>
            {site.rednoteId} <span>{copied === 'id' ? 'Copied!' : 'Copy'}</span>
          </button>
        )}
        <div className="modal-actions">
          {site.rednoteUrl && (
            <a className="btn btn-rednote" href={site.rednoteUrl} target="_blank" rel="noopener noreferrer">Open my profile</a>
          )}
          <button className="btn btn-outline" onClick={() => copy(fullEnquiry(site, message), 'message')}>
            {copied === 'message' ? 'Message copied!' : 'Copy enquiry message'}
          </button>
        </div>
      </div>
    </div>
  );
}
