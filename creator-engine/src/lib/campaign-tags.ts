// Campaign tags: what kind of videos a streamer wants, and their niche.
export const CONTENT_TYPES = [
  ['clipping', 'Clipping', 'Highlights cut from long videos or streams'],
  ['ugc_face', 'UGC (with face)', 'Creators on camera talking about it or reacting'],
  ['ugc_faceless', 'UGC (faceless)', 'Voiceover, text or footage only, no face'],
  ['slideshow', 'Slideshows', 'Photo carousels and text posts'],
  ['logo', 'Logo', 'Your logo or watermark placed in videos'],
  ['sound', 'Sound', 'Videos that use your song or audio'],
  ['reposting', 'Reposting', 'Reposting videos you provide'],
  ['youtube_long', 'YouTube long-form', 'Longer edits for regular YouTube videos'],
] as const;
export const CONTENT_TYPE_IDS = ['clipping', 'ugc_face', 'ugc_faceless', 'slideshow', 'logo', 'sound', 'reposting', 'youtube_long'] as const;
export type ContentType = (typeof CONTENT_TYPE_IDS)[number];
/** Older campaigns used these ids. */
const LEGACY: Record<string, string> = { facecam: 'UGC (with face)', faceless: 'UGC (faceless)', meme: 'Meme edits' };
export const contentTypeLabel = (id: string) => CONTENT_TYPES.find((t) => t[0] === id)?.[1] ?? LEGACY[id] ?? id;

export const CATEGORIES = ['Gaming', 'IRL', 'Just Chatting', 'Esports', 'Music', 'Sports', 'Comedy', 'Education', 'Other'] as const;
export const CATEGORY_IDS = CATEGORIES;
