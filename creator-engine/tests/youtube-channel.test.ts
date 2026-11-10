import { describe, expect, it } from 'vitest';
import { parseChannelInput } from '@/lib/platforms/youtube';

describe('parseChannelInput', () => {
  it('reads handles, channel ids and legacy user links', () => {
    expect(parseChannelInput('https://www.youtube.com/@clipsbyrae')).toEqual({ handle: '@clipsbyrae' });
    expect(parseChannelInput('youtube.com/@clipsbyrae/shorts')).toEqual({ handle: '@clipsbyrae' });
    expect(parseChannelInput('@clipsbyrae')).toEqual({ handle: '@clipsbyrae' });
    expect(parseChannelInput('https://m.youtube.com/channel/UC1234567890123456789012')).toEqual({ id: 'UC1234567890123456789012' });
    expect(parseChannelInput('https://youtube.com/user/oldname')).toEqual({ username: 'oldname' });
  });

  it('rejects other sites and video links', () => {
    expect(parseChannelInput('https://tiktok.com/@clipsbyrae')).toBeNull();
    expect(parseChannelInput('https://youtube.com/shorts/dQw4w9WgXcQ')).toBeNull();
    expect(parseChannelInput('not a link at all')).toBeNull();
  });
});
