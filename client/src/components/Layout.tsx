import { useEffect, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { hasAnyContact, instagramProfile, whatsAppLink } from '../api';
import { enquiryMessage, useData } from '../data';
import { shortlistMessage, useShortlist } from '../shortlist';
import { FacebookIcon, HeartIcon, HomeIcon, InstagramIcon, WhatsAppIcon } from './Icons';
import { RednoteButton } from './Rednote';

export function Layout({ children }: { children: ReactNode }) {
  const { site } = useData();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <>
      {import.meta.env.DEV && !hasAnyContact(site) && (
        <div className="dev-banner">
          Developer note: no contact details are set yet. Add them under <code>Site</code> in <code>server/RoomRental.Api/appsettings.json</code>.
        </div>
      )}
      <Header />
      <main>{children}</main>
      <Footer />
      <ShortlistBar />
      <FloatingWhatsApp />
    </>
  );
}

/** Reminds visitors with saved rooms that they can ask about them all at once. */
function ShortlistBar() {
  const { entries } = useShortlist();
  const { pathname } = useLocation();
  if (entries.length === 0 || pathname === '/shortlist') return null;
  return (
    <div className="shortlist-bar" role="status">
      <span><HeartIcon size={16} filled /> {entries.length} saved</span>
      <Link to="/shortlist" className="btn btn-whatsapp btn-sm">Enquire together</Link>
    </div>
  );
}

function Header() {
  const { site } = useData();
  const wa = whatsAppLink(site, enquiryMessage(null, null, location.origin));
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand">
          <span className="brand-mark"><HomeIcon size={18} /></span>
          {site.brandName}
        </Link>
        <nav>
          <NavLink to="/rooms">Rooms</NavLink>
          <NavLink to="/properties">Properties</NavLink>
          <SavedLink />
          {wa && (
            <a className="btn btn-whatsapp btn-sm" href={wa} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon size={18} /> <span className="hide-sm">WhatsApp</span>
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  const { site, catalogue } = useData();
  const ig = instagramProfile(site);
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <p className="brand light"><span className="brand-mark"><HomeIcon size={18} /></span>{site.brandName}</p>
          {site.tagline && <p className="muted-light">{site.tagline}</p>}
        </div>
        <div>
          <h4>Properties</h4>
          <ul className="footer-links">
            {catalogue.properties.slice(0, 8).map((p) => (
              <li key={p.id}><Link to={`/p/${p.id}`}>{p.name}</Link></li>
            ))}
            <li><Link to="/properties">View all →</Link></li>
          </ul>
        </div>
        <div>
          <h4>Get in touch</h4>
          {site.agentName && <p className="muted-light">{site.agentName}</p>}
          <div className="social">
            {site.whatsAppNumber && (
              <a href={whatsAppLink(site, enquiryMessage(null, null, location.origin)) ?? '#'} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><WhatsAppIcon /></a>
            )}
            {site.facebookUrl && <a href={site.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FacebookIcon /></a>}
            {ig && <a href={ig} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><InstagramIcon /></a>}
            <RednoteButton className="social-rednote" message={enquiryMessage(null, null, location.origin)} />
          </div>
        </div>
      </div>
      <div className="container footer-bottom">© {new Date().getFullYear()} {site.copyrightText || site.brandName}</div>
    </footer>
  );
}

function SavedLink() {
  const { entries } = useShortlist();
  return (
    <NavLink to="/shortlist" className="nav-saved" aria-label={`Saved rooms (${entries.length})`}>
      <HeartIcon size={18} filled={entries.length > 0} />
      <span className="hide-sm">Saved</span>
      {entries.length > 0 && <span className="count">{entries.length}</span>}
    </NavLink>
  );
}

/** Always-visible chat bubble. On room pages the message names the room; on the saved page, every saved room. */
function FloatingWhatsApp() {
  const { site, findRoom, findProperty } = useData();
  const { entries } = useShortlist();
  const { pathname } = useLocation();
  const [, kind, id] = pathname.split('/');
  const entry = kind === 'r' && id ? findRoom(id) ?? null : null;
  const property = kind === 'p' && id ? findProperty(id) ?? null : null;
  const message = kind === 'shortlist' && entries.length > 0
    ? shortlistMessage(entries, location.origin)
    : enquiryMessage(entry, property, location.href);
  const href = whatsAppLink(site, message);
  if (!href) return null;
  return (
    <a className="floating-wa" href={href} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
      <WhatsAppIcon size={30} />
    </a>
  );
}
