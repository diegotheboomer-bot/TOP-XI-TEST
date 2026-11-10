// Ad disclosure (FTC: sponsored posts must be clearly marked) and clip codes.

const DISCLOSURE = /(^|[^\w#])#(ad|ads|sponsored|partner|paidpartnership|brandpartner)(?![\w])/i;

/** True when a caption carries a recognised ad disclosure hashtag. */
export function hasDisclosure(caption: string | null | undefined): boolean {
  return !!caption && DISCLOSURE.test(caption);
}

/** True when the caption contains the clipper's code as a whole word (any case). Proves who posted the video. */
export function hasClipCode(caption: string | null | undefined, code: string): boolean {
  if (!caption || !code) return false;
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'i').test(caption);
}
