/** Room types as classified by the API from folder names, in the order shown to visitors. */
export const ROOM_TYPES = [
  { type: 'Master', label: 'Master room', blurb: 'Largest room, usually with an attached bathroom' },
  { type: 'Middle', label: 'Middle room', blurb: 'Mid-sized room, a good balance of space and price' },
  { type: 'Single', label: 'Single room', blurb: 'Budget-friendly room for one' },
  { type: 'Balcony', label: 'Balcony room', blurb: 'Room with its own balcony access' },
  { type: 'Partition', label: 'Partition room', blurb: 'Most affordable option' },
  { type: 'Studio', label: 'Studio', blurb: 'Self-contained studio unit' },
  { type: 'Whole unit', label: 'Whole unit', blurb: 'Rent the entire unit' },
  { type: 'Unit tour', label: 'Unit tours', blurb: 'Several rooms shown in one unit tour' },
  { type: 'Room', label: 'Other rooms', blurb: 'Rooms in shared units' },
] as const;
