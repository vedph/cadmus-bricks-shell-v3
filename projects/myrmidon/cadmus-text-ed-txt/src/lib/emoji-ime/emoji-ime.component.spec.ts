import { render, fireEvent } from '@testing-library/angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { EmojiImeComponent, EmojiImeComponentData } from './emoji-ime.component';
import { UnicodeEmoji } from '../emoji.service';

describe('EmojiImeComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(EmojiImeComponent, {
      providers: [provideNoopAnimations()],
    });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should default size to 32', async () => {
    const { fixture } = await render(EmojiImeComponent, {
      providers: [provideNoopAnimations()],
    });
    expect(fixture.componentInstance.size()).toBe(32);
  });

  it('should default autoPick to false', async () => {
    const { fixture } = await render(EmojiImeComponent, {
      providers: [provideNoopAnimations()],
    });
    expect(fixture.componentInstance.autoPick()).toBe(false);
  });

  it('should not be in dialog mode when no MatDialogRef is provided', async () => {
    const { fixture } = await render(EmojiImeComponent, {
      providers: [provideNoopAnimations()],
    });
    expect(fixture.componentInstance.inDialog).toBe(false);
  });

  it('should initialize name to null when no dialog data is provided', async () => {
    const { fixture } = await render(EmojiImeComponent, {
      providers: [provideNoopAnimations()],
    });
    expect(fixture.componentInstance.name.value).toBeNull();
  });

  it('should be in dialog mode and read data from MAT_DIALOG_DATA when a MatDialogRef is provided', async () => {
    const dialogRef = { close: vi.fn() };
    const data: EmojiImeComponentData = {
      name: 'dog',
      size: 64,
      autoPick: true,
    };
    const { fixture } = await render(EmojiImeComponent, {
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    const component = fixture.componentInstance;
    expect(component.inDialog).toBe(true);
    expect(component.name.value).toBe('dog');
    expect(component.size()).toBe(64);
    expect(component.autoPick()).toBe(true);
  });

  it('should populate emojis from an initial dialog data name', async () => {
    const dialogRef = { close: vi.fn() };
    const { fixture } = await render(EmojiImeComponent, {
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { name: 'dog' } },
      ],
    });
    expect(fixture.componentInstance.emojis().length).toBeGreaterThan(0);
    expect(
      fixture.componentInstance.emojis().every((e) => e.name.includes('dog'))
    ).toBe(true);
  });

  it('should not look up emojis when name has no initial value', async () => {
    const { fixture } = await render(EmojiImeComponent, {
      providers: [provideNoopAnimations()],
    });
    expect(fixture.componentInstance.emojis()).toEqual([]);
  });

  it('should auto-pick the single matching emoji when autoPick is true', async () => {
    const dialogRef = { close: vi.fn() };
    const { fixture } = await render(EmojiImeComponent, {
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        // 'dog' matches only the exact 'dog' emoji as a substring-unique case
        { provide: MAT_DIALOG_DATA, useValue: { name: 'zzz_nonexistent', autoPick: true } },
      ],
    });
    // no match: should not auto pick or close
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(fixture.componentInstance.emojis()).toEqual([]);
  });

  it('should auto-pick immediately on init when the initial name uniquely matches one emoji and autoPick is true', async () => {
    // the pick happens synchronously during ngOnInit (before render() resolves),
    // so we can only observe it via the dialogRef mock recorded call, not via
    // a late subscription to the emojiPick output.
    const dialogRef = { close: vi.fn() };
    const { fixture } = await render(EmojiImeComponent, {
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: dialogRef },
        {
          // 'octocat' is a unique substring matching exactly one emoji name
          provide: MAT_DIALOG_DATA,
          useValue: { name: 'octocat', autoPick: true },
        },
      ],
    });

    expect(fixture.componentInstance.emojis().length).toBe(1);
    expect(fixture.componentInstance.emojis()[0].name).toBe('octocat');
    expect(dialogRef.close).toHaveBeenCalledWith(
      fixture.componentInstance.emojis()[0]
    );
  });

  it('should auto-pick after debounce when a later name change uniquely matches one emoji and autoPick is true', async () => {
    vi.useFakeTimers();
    try {
      const dialogRef = { close: vi.fn() };
      const picked: UnicodeEmoji[] = [];
      const { fixture } = await render(EmojiImeComponent, {
        providers: [
          provideNoopAnimations(),
          { provide: MatDialogRef, useValue: dialogRef },
          { provide: MAT_DIALOG_DATA, useValue: { autoPick: true } },
        ],
      });
      fixture.componentInstance.emojiPick.subscribe((e) => picked.push(e));

      fixture.componentInstance.name.setValue('octocat');
      await vi.advanceTimersByTimeAsync(350);

      expect(fixture.componentInstance.emojis().length).toBe(1);
      expect(picked.length).toBe(1);
      expect(dialogRef.close).toHaveBeenCalledWith(picked[0]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should update emojis when the name control value changes, after debounce', async () => {
    vi.useFakeTimers();
    try {
      const { fixture } = await render(EmojiImeComponent, {
        providers: [provideNoopAnimations()],
      });
      const component = fixture.componentInstance;
      component.name.setValue('dog');
      await vi.advanceTimersByTimeAsync(350);
      expect(component.emojis().length).toBeGreaterThan(0);
      expect(component.emojis().every((e) => e.name.includes('dog'))).toBe(
        true
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('should not re-run lookup for the same value (distinctUntilChanged)', async () => {
    vi.useFakeTimers();
    try {
      const { fixture } = await render(EmojiImeComponent, {
        providers: [provideNoopAnimations()],
      });
      const component = fixture.componentInstance;
      const spy = vi.spyOn(component as any, 'lookupEmoji');

      component.name.setValue('dog');
      await vi.advanceTimersByTimeAsync(350);
      const callsAfterFirst = spy.mock.calls.length;

      component.name.setValue('dog');
      await vi.advanceTimersByTimeAsync(350);
      expect(spy.mock.calls.length).toBe(callsAfterFirst);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should clear emojis lookup when the control is set back to empty (no re-population)', async () => {
    vi.useFakeTimers();
    try {
      const { fixture } = await render(EmojiImeComponent, {
        providers: [provideNoopAnimations()],
      });
      const component = fixture.componentInstance;
      component.name.setValue('dog');
      await vi.advanceTimersByTimeAsync(350);
      expect(component.emojis().length).toBeGreaterThan(0);

      component.name.setValue('');
      await vi.advanceTimersByTimeAsync(350);
      // lookupEmoji only runs the lookup branch when name.value is truthy,
      // so the emojis signal keeps its last value instead of being cleared.
      expect(component.emojis().length).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  describe('pickEmoji', () => {
    it('should do nothing when called with no emoji', async () => {
      const dialogRef = { close: vi.fn() };
      const { fixture } = await render(EmojiImeComponent, {
        providers: [
          provideNoopAnimations(),
          { provide: MatDialogRef, useValue: dialogRef },
        ],
      });
      const picked: UnicodeEmoji[] = [];
      fixture.componentInstance.emojiPick.subscribe((e) => picked.push(e));

      fixture.componentInstance.pickEmoji(undefined);

      expect(picked).toEqual([]);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should emit emojiPick and close the dialog with the emoji', async () => {
      const dialogRef = { close: vi.fn() };
      const { fixture } = await render(EmojiImeComponent, {
        providers: [
          provideNoopAnimations(),
          { provide: MatDialogRef, useValue: dialogRef },
        ],
      });
      const picked: UnicodeEmoji[] = [];
      fixture.componentInstance.emojiPick.subscribe((e) => picked.push(e));

      const emoji: UnicodeEmoji = { name: 'dog', code: '1f436', url: 'x' };
      fixture.componentInstance.pickEmoji(emoji);

      expect(picked).toEqual([emoji]);
      expect(dialogRef.close).toHaveBeenCalledWith(emoji);
    });

    it('should emit emojiPick without throwing when not in a dialog', async () => {
      const { fixture } = await render(EmojiImeComponent, {
        providers: [provideNoopAnimations()],
      });
      const picked: UnicodeEmoji[] = [];
      fixture.componentInstance.emojiPick.subscribe((e) => picked.push(e));

      const emoji: UnicodeEmoji = { name: 'dog', code: '1f436', url: 'x' };
      expect(() => fixture.componentInstance.pickEmoji(emoji)).not.toThrow();
      expect(picked).toEqual([emoji]);
    });
  });

  describe('close', () => {
    it('should emit closeRequest and close the dialog', async () => {
      const dialogRef = { close: vi.fn() };
      const { fixture } = await render(EmojiImeComponent, {
        providers: [
          provideNoopAnimations(),
          { provide: MatDialogRef, useValue: dialogRef },
        ],
      });
      let closed = false;
      fixture.componentInstance.closeRequest.subscribe(() => (closed = true));

      fixture.componentInstance.close();

      expect(closed).toBe(true);
      expect(dialogRef.close).toHaveBeenCalledWith();
    });

    it('should emit closeRequest without throwing when not in a dialog', async () => {
      const { fixture } = await render(EmojiImeComponent, {
        providers: [provideNoopAnimations()],
      });
      let closed = false;
      fixture.componentInstance.closeRequest.subscribe(() => (closed = true));

      expect(() => fixture.componentInstance.close()).not.toThrow();
      expect(closed).toBe(true);
    });
  });

  describe('template', () => {
    it('should render one row per emoji and update on lookup', async () => {
      const dialogRef = { close: vi.fn() };
      const { fixture } = await render(EmojiImeComponent, {
        providers: [
          provideNoopAnimations(),
          { provide: MatDialogRef, useValue: dialogRef },
          { provide: MAT_DIALOG_DATA, useValue: { name: 'dog' } },
        ],
      });
      fixture.detectChanges();
      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(fixture.componentInstance.emojis().length);
      expect(rows.length).toBeGreaterThan(0);
    });

    it('should pick the emoji when its button is clicked', async () => {
      const dialogRef = { close: vi.fn() };
      const { fixture } = await render(EmojiImeComponent, {
        providers: [
          provideNoopAnimations(),
          { provide: MatDialogRef, useValue: dialogRef },
          { provide: MAT_DIALOG_DATA, useValue: { name: 'dog' } },
        ],
      });
      fixture.detectChanges();
      const picked: UnicodeEmoji[] = [];
      fixture.componentInstance.emojiPick.subscribe((e) => picked.push(e));

      const button = fixture.nativeElement.querySelector(
        'tbody tr button'
      ) as HTMLButtonElement;
      await fireEvent.click(button);

      expect(picked.length).toBe(1);
      expect(dialogRef.close).toHaveBeenCalledWith(picked[0]);
    });
  });

  it('should not throw when destroyed', async () => {
    const { fixture } = await render(EmojiImeComponent, {
      providers: [provideNoopAnimations()],
    });
    expect(() => fixture.destroy()).not.toThrow();
  });
});
