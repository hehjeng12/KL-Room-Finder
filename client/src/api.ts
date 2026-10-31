export type MediaKind = 'photo' | 'video';

export interface MediaItem {
  id: string;
  kind: MediaKind;
  fileName: string;
  size: number;
}

export interface Room {
  id: string;
  name: string;
  type: string;
  price: number | null;
  status: string | null;
  notes: string | null;
  media: MediaItem[];
}

export interface Unit {
  id: string;
  name: string;
  roomsNote: string | null;
  sharedMedia: MediaItem[];
  rooms: Room[];
}

export interface Property {
  id: string;
  name: string;
  folderName: string;
  area: string | null;
  address: string | null;
  description: string | null;
  highlights: string[];
  mapUrl: string | null;
  priceFrom: number | null;
  coverMediaId: string | null;
  units: Unit[];
}

export interface Catalogue {
  generatedAt: string;
  properties: Property[];
}

export interface SiteInfo {
  brandName: string;
  tagline: string;
  agentName: string;
  whatsAppNumber: string;
  facebookUrl: string;
  messengerUsername: string;
  instagramUsername: string;
  rednoteId: string;
  rednoteUrl: string;
  rednoteQrImage: string;
  copyrightText: string;
  enquiryTemplate: string;
  currency: string;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json() as Promise<T>;
}

// Static builds (free hosting) read pre-exported files instead of calling the C# API. See .env.static.
const STATIC = import.meta.env.VITE_STATIC === '1';

export const fetchSite = () => getJson<SiteInfo>(STATIC ? '/data/site.json' : '/api/site');
export const fetchCatalogue = () => getJson<Catalogue>(STATIC ? '/data/catalogue.json' : '/api/catalogue');

export const mediaUrl = (id: string) => (STATIC ? `/v/${id}.mp4` : `/api/media/${id}`);
export const thumbUrl = (id: string, width: 480 | 960 | 1600 = 480) =>
  STATIC ? `/m/${id}_${width}.jpg` : `/api/media/${id}/thumb?w=${width}`;

export function formatPrice(price: number | null, currency: string) {
  if (price == null) return null;
  return `${currency} ${price.toLocaleString('en-MY')}`;
}

// ---- Contact links ------------------------------------------------------

/** The enquiry as sent: what the visitor was viewing, then the details form from appsettings (EnquiryTemplate). */
export function fullEnquiry(site: SiteInfo, message: string) {
  const template = site.enquiryTemplate?.trim();
  return template ? `${message}\n\n${template}` : message;
}

export function whatsAppLink(site: SiteInfo, message: string) {
  const number = site.whatsAppNumber.replace(/\D/g, '');
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(fullEnquiry(site, message))}`;
}

export function messengerLink(site: SiteInfo, message: string) {
  const user = site.messengerUsername.trim();
  if (!user) return null;
  return `https://m.me/${encodeURIComponent(user)}?text=${encodeURIComponent(fullEnquiry(site, message))}`;
}

export function instagramLink(site: SiteInfo) {
  const user = site.instagramUsername.replace(/^@/, '').trim();
  return user ? `https://ig.me/m/${encodeURIComponent(user)}` : null;
}

export function instagramProfile(site: SiteInfo) {
  const user = site.instagramUsername.replace(/^@/, '').trim();
  return user ? `https://www.instagram.com/${encodeURIComponent(user)}` : null;
}

export const hasAnyContact = (site: SiteInfo) =>
  Boolean(site.whatsAppNumber || site.messengerUsername || site.facebookUrl || site.instagramUsername || hasRednote(site));

export const hasRednote = (site: SiteInfo) => Boolean(site.rednoteId || site.rednoteUrl || site.rednoteQrImage);
