import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { MatDialog } from '@angular/material/dialog';

import { TxtEmojiCtePlugin } from './txt-emoji.cte-plugin';
import { EmojiService, UnicodeEmoji } from './emoji.service';

describe('TxtEmojiCtePlugin', () => {
  let plugin: TxtEmojiCtePlugin;
  let emojiService: EmojiService;
  let dialogOpenSpy: any;
  let afterClosedResult: any;

  beforeEach(() => {
    afterClosedResult = undefined;
    dialogOpenSpy = vi.fn().mockReturnValue({
      afterClosed: () => of(afterClosedResult),
    });

    TestBed.configureTestingModule({
      providers: [
        TxtEmojiCtePlugin,
        {
          provide: MatDialog,
          useValue: { open: (...args: any[]) => dialogOpenSpy(...args) },
        },
      ],
    });
    plugin = TestBed.inject(TxtEmojiCtePlugin);
    emojiService = TestBed.inject(EmojiService);
  });

  it('should be created with the expected metadata', () => {
    expect(plugin).toBeTruthy();
    expect(plugin.id).toBe('txt.emoji');
    expect(plugin.enabled).toBe(true);
    expect(plugin.name).toBeTruthy();
    expect(plugin.description).toBeTruthy();
    expect(plugin.version).toBeTruthy();
  });

  describe('matches', () => {
    it('should match when selector is undefined', () => {
      expect(plugin.matches({ text: 'x' })).toBe(true);
    });

    it('should match when selector is not "id"', () => {
      expect(plugin.matches({ selector: '$match-first', text: 'x' })).toBe(
        true
      );
    });

    it('should match when selector is "id" and text equals the plugin id', () => {
      expect(plugin.matches({ selector: 'id', text: 'txt.emoji' })).toBe(
        true
      );
    });

    it('should not match when selector is "id" and text differs from the plugin id', () => {
      expect(plugin.matches({ selector: 'id', text: 'other' })).toBe(false);
    });
  });

  describe('edit', () => {
    it('should directly resolve the emoji text when the input is a known emoji name', async () => {
      const result = await plugin.edit({ text: 'dog' });
      const expectedEmoji = emojiService.getEmoji('dog')!;
      expect(result.id).toBe('txt.emoji');
      expect(result.text).toBe(emojiService.getEmojiText(expectedEmoji));
      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should be case-insensitive when matching a known emoji name', async () => {
      const result = await plugin.edit({ text: 'DOG' });
      const expectedEmoji = emojiService.getEmoji('dog')!;
      expect(result.text).toBe(emojiService.getEmojiText(expectedEmoji));
      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should open the picker dialog when the text does not match a known emoji name', async () => {
      const picked: UnicodeEmoji = emojiService.getEmoji('dog')!;
      afterClosedResult = picked;
      const result = await plugin.edit({ text: 'not-an-emoji' });

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      const dialogArgs = dialogOpenSpy.mock.calls[0];
      expect(dialogArgs[1]).toEqual({ data: { name: 'not-an-emoji' } });
      expect(result.text).toBe(emojiService.getEmojiText(picked));
    });

    it('should return the original text unchanged when the picker dialog is cancelled', async () => {
      afterClosedResult = undefined;
      const result = await plugin.edit({ text: 'not-an-emoji' });

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      expect(result.text).toBe('not-an-emoji');
      expect(result.id).toBe('txt.emoji');
    });

    it('should not open the picker and return a pick-emoji payload when noPicker is true and text is unmatched', async () => {
      const result = await plugin.edit({
        text: 'not-an-emoji',
        context: { noPicker: true },
      });

      expect(dialogOpenSpy).not.toHaveBeenCalled();
      expect(result.text).toBe('not-an-emoji');
      expect(result.payload).toEqual({ action: 'pick-emoji' });
    });

    it('should resolve directly from a known emoji name even when noPicker is true', async () => {
      const result = await plugin.edit({
        text: 'dog',
        context: { noPicker: true },
      });
      const expectedEmoji = emojiService.getEmoji('dog')!;
      expect(dialogOpenSpy).not.toHaveBeenCalled();
      expect(result.text).toBe(emojiService.getEmojiText(expectedEmoji));
      expect(result.payload).toBeUndefined();
    });

    it('should always attach the query to the result', async () => {
      const query = { text: 'dog' };
      const result = await plugin.edit(query);
      expect(result.query).toBe(query);
    });
  });
});
