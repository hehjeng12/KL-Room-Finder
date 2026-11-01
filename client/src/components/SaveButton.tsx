import type { MouseEvent } from 'react';
import { SHORTLIST_LIMIT, useShortlist } from '../shortlist';
import { HeartIcon } from './Icons';

/** Adds or removes a room from the visitor's shortlist. `icon` sits on a card photo; `button` is a full-width button. */
export function SaveButton({ roomId, variant = 'icon' }: { roomId: string; variant?: 'icon' | 'button' }) {
  const { has, toggle, isFull } = useShortlist();
  const saved = has(roomId);
  const blocked = !saved && isFull;
  const label = saved ? 'Remove from saved rooms' : blocked ? `You can save up to ${SHORTLIST_LIMIT} rooms` : 'Save this room';

  const onClick = (e: MouseEvent) => {
    // The icon sits inside a card link: save without opening the room.
    e.preventDefault();
    e.stopPropagation();
    if (!blocked) toggle(roomId);
  };

  if (variant === 'button') {
    return (
      <button type="button" className={`btn btn-save ${saved ? 'saved' : ''}`} onClick={onClick} aria-pressed={saved} disabled={blocked} title={label}>
        <HeartIcon size={18} filled={saved} /> {saved ? 'Saved' : blocked ? `Saved list full (${SHORTLIST_LIMIT})` : 'Save to compare & enquire together'}
      </button>
    );
  }
  return (
    <button type="button" className={`save-btn ${saved ? 'saved' : ''}`} onClick={onClick} aria-pressed={saved} aria-label={label} title={label}>
      <HeartIcon size={20} filled={saved} />
    </button>
  );
}
