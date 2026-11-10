// Campaign tags: what kind of videos a streamer wants, and their niche.
export const CONTENT_TYPES = [
  ['clipping', 'Clipping', 'Highlights cut straight from the stream'],
  ['facecam', 'Facecam edits', 'Reactions with the streamer on cam'],
  ['faceless', 'Faceless', 'Gameplay or footage only, no face'],
  ['meme', 'Meme edits', 'Captions, zooms and sound effects'],
  ['slideshow', 'Slideshows', 'Photo carousels and text posts'],
  ['reposting', 'Reposting', 'Repost clips the streamer provides'],
] as const;
export const CONTENT_TYPE_IDS = ['clipping', 'facecam', 'faceless', 'meme', 'slideshow', 'reposting'] as const;
export type ContentType = (typeof CONTENT_TYPE_IDS)[number];
export const contentTypeLabel = (id: string) => CONTENT_TYPES.find((t) => t[0] === id)?.[1] ?? id;

export const CATEGORIES = ['Gaming', 'IRL', 'Just Chatting', 'Esports', 'Music', 'Sports', 'Comedy', 'Education', 'Other'] as const;
export const CATEGORY_IDS = CATEGORIES;
