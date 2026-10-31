import { useState } from 'react';
import { fullEnquiry, hasAnyContact, instagramLink, messengerLink, whatsAppLink } from '../api';
import { useData } from '../data';
import { FacebookIcon, InstagramIcon, MessengerIcon, WhatsAppIcon } from './Icons';
import { RednoteButton } from './Rednote';

interface Props {
  message: string;
  layout?: 'stack' | 'row';
}

/** WhatsApp / Messenger / Instagram / rednote buttons, each pre-filled with an enquiry about what the visitor is viewing. */
export function ContactButtons({ message, layout = 'stack' }: Props) {
  const { site } = useData();
  const [copied, setCopied] = useState(false);

  const wa = whatsAppLink(site, message);
  const fbm = messengerLink(site, message);
  const ig = instagramLink(site);

  if (!hasAnyContact(site)) {
    return <p className="muted small">Contact details will be available soon.</p>;
  }

  // Instagram DMs can't be pre-filled, so copy the enquiry for the visitor to paste.
  const openInstagram = async () => {
    try {
      await navigator.clipboard.writeText(fullEnquiry(site, message));
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    } catch {
      /* clipboard unavailable: Instagram still opens */
    }
  };

  return (
    <div className={`contact-buttons ${layout}`}>
      {wa && (
        <a className="btn btn-whatsapp" href={wa} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon /> WhatsApp me
        </a>
      )}
      {fbm && (
        <a className="btn btn-messenger" href={fbm} target="_blank" rel="noopener noreferrer">
          <MessengerIcon /> Messenger
        </a>
      )}
      {!fbm && site.facebookUrl && (
        <a className="btn btn-messenger" href={site.facebookUrl} target="_blank" rel="noopener noreferrer">
          <FacebookIcon /> Facebook
        </a>
      )}
      {ig && (
        <a className="btn btn-instagram" href={ig} target="_blank" rel="noopener noreferrer" onClick={openInstagram}>
          <InstagramIcon /> Instagram DM
        </a>
      )}
      <RednoteButton message={message} />
      {copied && <p className="hint">Message copied – paste it into your Instagram DM.</p>}
    </div>
  );
}
