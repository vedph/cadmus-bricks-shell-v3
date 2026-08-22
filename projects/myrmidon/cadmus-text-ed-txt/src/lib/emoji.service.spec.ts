import { TestBed } from '@angular/core/testing';

import { EmojiService } from './emoji.service';

describe('EmojiService', () => {
  let service: EmojiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EmojiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getEmoji', () => {
    it('should return the emoji matching an exact full name', () => {
      const emoji = service.getEmoji('dog');
      expect(emoji).toEqual({
        name: 'dog',
        code: '1f436',
        url: 'https://github.githubassets.com/images/icons/emoji/unicode/1f436.png?v8',
      });
    });

    it('should be case-insensitive', () => {
      const emoji = service.getEmoji('DOG');
      expect(emoji?.name).toBe('dog');
    });

    it('should return undefined for a name that does not exist', () => {
      expect(service.getEmoji('not-an-emoji-name')).toBeUndefined();
    });

    it('should return undefined for an empty name', () => {
      expect(service.getEmoji('')).toBeUndefined();
    });

    it('should build the code for multi-codepoint emojis', () => {
      const emoji = service.getEmoji('couple_with_heart_man_man');
      expect(emoji?.code).toBe('1f468-2764-1f468');
    });
  });

  describe('lookupEmoji', () => {
    it('should return emojis whose name includes the given substring', () => {
      const matches = service.lookupEmoji('cat');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.every((m) => m.name.includes('cat'))).toBe(true);
    });

    it('should be case-insensitive', () => {
      const matches = service.lookupEmoji('CAT');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should return an empty array when nothing matches', () => {
      expect(service.lookupEmoji('zzzznotfound')).toEqual([]);
    });

    it('should respect the default limit of 10', () => {
      // 'a' is a very common substring, expect it to be capped at 10
      const matches = service.lookupEmoji('a');
      expect(matches.length).toBeLessThanOrEqual(10);
    });

    it('should respect a custom limit', () => {
      const matches = service.lookupEmoji('a', 3);
      expect(matches.length).toBeLessThanOrEqual(3);
    });

    it('should return an empty array for an empty search string (matches everything up to the limit)', () => {
      const matches = service.lookupEmoji('', 5);
      expect(matches.length).toBe(5);
    });
  });

  describe('getEmojiText', () => {
    it('should return the unicode character(s) for a single-codepoint emoji', () => {
      const emoji = service.getEmoji('dog')!;
      const text = service.getEmojiText(emoji);
      expect(text).toBe(String.fromCodePoint(0x1f436));
    });

    it('should return concatenated unicode characters for a multi-codepoint emoji', () => {
      const emoji = service.getEmoji('couple_with_heart_man_man')!;
      const text = service.getEmojiText(emoji);
      expect(text).toBe(
        String.fromCodePoint(0x1f468, 0x2764, 0x1f468)
      );
    });

    it('should return an empty string when emoji is falsy', () => {
      expect(service.getEmojiText(undefined as any)).toBe('');
    });
  });
});
