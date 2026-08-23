import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { DialogService } from '@myrmidon/ngx-mat-tools';

import { NoteSet, NoteSetComponent } from './note-set.component';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('NoteSetComponent', () => {
  let component: NoteSetComponent;
  let fixture: ComponentFixture<NoteSetComponent>;
  let confirmMock: ReturnType<typeof vi.fn>;

  const sampleSet: NoteSet = {
    definitions: [
      {
        key: 'summary',
        label: 'Summary',
        markdown: true,
        required: true,
        maxLength: 20,
      },
      {
        key: 'comments',
        label: 'Comments',
      },
    ],
    notes: {
      summary: 'Hello world',
    },
  };

  beforeEach(async () => {
    confirmMock = vi.fn().mockReturnValue(of(true));

    await TestBed.configureTestingModule({
      imports: [NoteSetComponent],
      providers: [
        provideNoopAnimations(),
        { provide: DialogService, useValue: { confirm: confirmMock } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NoteSetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default set to an empty definitions object', () => {
    expect(component.set()).toEqual({ definitions: [] });
  });

  describe('computed counters', () => {
    it('should compute noteCount, missing and existing for a fresh set', async () => {
      fixture.componentRef.setInput('set', sampleSet);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.noteCount()).toBe(1);
      expect(component.existing()).toEqual(['Summary']);
      expect(component.missing()).toEqual([]);
    });

    it('should report a required note with no value as missing', async () => {
      const setWithMissing: NoteSet = {
        definitions: [
          { key: 'title', label: 'Title', required: true },
          { key: 'body', label: 'Body' },
        ],
        notes: {},
      };
      fixture.componentRef.setInput('set', setWithMissing);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.missing()).toEqual(['Title']);
      expect(component.existing()).toEqual([]);
      expect(component.noteCount()).toBe(0);
    });

    it('should fall back to the key when label is missing', async () => {
      const setNoLabel: NoteSet = {
        definitions: [{ key: 'x', label: '', required: true }],
        notes: {},
      };
      fixture.componentRef.setInput('set', setNoLabel);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.missing()).toEqual(['x']);
    });
  });

  describe('keys and form reset', () => {
    it('should populate keys from set definitions', async () => {
      fixture.componentRef.setInput('set', sampleSet);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.keys()).toEqual([
        { key: 'summary', value: 'Summary' },
        { key: 'comments', value: 'Comments' },
      ]);
    });

    it('should reset the form and clear keys when definitions become empty', async () => {
      fixture.componentRef.setInput('set', sampleSet);
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentRef.setInput('set', { definitions: [] });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.keys()).toEqual([]);
    });
  });

  describe('editing a note', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('set', sampleSet);
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should load the note text and definition when a key is selected', async () => {
      component.form.key().value.set('summary');
      await wait(30);
      fixture.detectChanges();

      expect(component.currentDef()?.key).toBe('summary');
      expect(component.form.text().value()).toBe('Hello world');
    });

    it('should apply required and maxLength validators based on the definition', async () => {
      component.form.key().value.set('summary');
      await wait(30);

      expect(component.form.text().valid()).toBe(true);

      component.form.text().value.set('');
      expect(component.form.text().getError('required')).toBeDefined();

      component.form
        .text()
        .value.set('this text is definitely longer than 20 chars');
      expect(component.form.text().getError('maxLength')).toBeDefined();
    });

    it('should not apply any validators for a note without required/maxLength', async () => {
      component.form.key().value.set('comments');
      await wait(30);

      expect(component.currentDef()?.key).toBe('comments');
      component.form.text().value.set('');
      expect(component.form.text().valid()).toBe(true);
    });

    it('should reset current definition and text when key is cleared', async () => {
      component.form.key().value.set('summary');
      await wait(30);

      component.form.key().value.set(null);
      await wait(30);

      expect(component.currentDef()).toBeUndefined();
      expect(component.form.text().value()).toBe('');
    });

    it('should update currentLen after typing, debounced', async () => {
      component.form.key().value.set('summary');
      await wait(30);

      component.form.text().value.set('12345');
      expect(component.currentLen()).toBe(0); // not yet updated (debounced)
      await wait(80);
      expect(component.currentLen()).toBe(5);
    });

    it('should update the markdown preview from the note text', async () => {
      component.form.key().value.set('summary');
      await wait(30);

      component.form.text().value.set('# Title');
      await wait(80);
      fixture.detectChanges();

      const preview = fixture.debugElement.query(By.css('.preview'));
      expect(preview).toBeTruthy();
      expect(preview.nativeElement.innerHTML).toContain('<h1>Title</h1>');
    });

    it('should not render a markdown preview for non-markdown notes', async () => {
      component.form.key().value.set('comments');
      await wait(30);
      component.form.text().value.set('plain text');
      await wait(80);
      fixture.detectChanges();

      const preview = fixture.debugElement.query(By.css('.preview'));
      expect(preview).toBeFalsy();
    });
  });

  describe('save', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('set', sampleSet);
      fixture.detectChanges();
      await fixture.whenStable();
      component.form.key().value.set('summary');
      await wait(30);
    });

    it('should do nothing when the text is invalid', () => {
      component.form.text().value.set('');
      let noteChanged = false;
      component.noteChange.subscribe(() => (noteChanged = true));

      component.save();

      expect(noteChanged).toBe(false);
    });

    it('should save the trimmed note text and emit noteChange', () => {
      component.form.text().value.set('  updated value  ');

      let changed: { key: string; value: string | null } | undefined;
      component.noteChange.subscribe((n) => (changed = n));

      component.save();

      expect(changed).toEqual({ key: 'summary', value: 'updated value' });
      expect(component.set().notes?.['summary']).toBe('updated value');
    });

    it('should mark the text control as pristine after saving', () => {
      component.form.text().value.set('new content');
      component.form.text().markAsDirty();

      component.save();

      expect(component.form.text().dirty()).toBe(false);
    });

    it('should do nothing when there is no current definition', async () => {
      component.form.key().value.set(null);
      await wait(30);
      let noteChanged = false;
      component.noteChange.subscribe(() => (noteChanged = true));

      expect(() => component.save()).not.toThrow();
      expect(noteChanged).toBe(false);
    });

    it('should emit the updated set via the two-way set model', () => {
      let emittedSet: NoteSet | undefined;
      component.set.subscribe((s) => (emittedSet = s));

      component.form.text().value.set('new content');
      component.save();

      expect(emittedSet?.notes?.['summary']).toBe('new content');
    });
  });

  describe('revertNote', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('set', sampleSet);
      fixture.detectChanges();
      await fixture.whenStable();
      component.form.key().value.set('summary');
      await wait(30);
    });

    it('should discard unsaved edits and restore the stored value', () => {
      component.form.text().value.set('unsaved change');
      expect(component.form.text().value()).toBe('unsaved change');

      component.revertNote();

      expect(component.form.text().value()).toBe('Hello world');
    });

    it('should do nothing when there is no current definition', () => {
      component.form.key().value.set(null);
      expect(() => component.revertNote()).not.toThrow();
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('set', sampleSet);
      fixture.detectChanges();
      await fixture.whenStable();
      component.form.key().value.set('summary');
      await wait(30);
    });

    it('should do nothing when there is no current definition', async () => {
      component.form.key().value.set(null);
      await wait(30);
      expect(() => component.clear()).not.toThrow();
      expect(confirmMock).not.toHaveBeenCalled();
    });

    it('should ask for confirmation with the note label', () => {
      component.clear();
      expect(confirmMock).toHaveBeenCalledWith(
        'Confirmation',
        'Delete note Summary?'
      );
    });

    it('should clear the note when the user confirms', () => {
      let changed: { key: string; value: string | null } | undefined;
      component.noteChange.subscribe((n) => (changed = n));

      component.clear();

      expect(changed).toEqual({ key: 'summary', value: null });
      expect(component.set().notes?.['summary']).toBeNull();
    });

    it('should not clear the note when the user cancels', () => {
      confirmMock.mockReturnValue(of(false));

      let noteChanged = false;
      component.noteChange.subscribe(() => (noteChanged = true));

      component.clear();

      expect(noteChanged).toBe(false);
      expect(component.set().notes?.['summary']).toBe('Hello world');
    });
  });

  describe('merge behaviour', () => {
    it('should preserve notes with matching keys when merge is true', async () => {
      fixture.componentRef.setInput('set', sampleSet);
      fixture.detectChanges();
      await fixture.whenStable();

      const mergedSet: NoteSet = {
        definitions: [
          { key: 'summary', label: 'Summary', markdown: true },
          { key: 'references', label: 'References' },
        ],
        notes: {},
        merge: true,
      };
      fixture.componentRef.setInput('set', mergedSet);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.set().notes?.['summary']).toBe('Hello world');
      expect(component.set().notes?.['references']).toBeUndefined();
    });

    it('should discard notes whose keys are not in the new definitions', async () => {
      const setWithTwoNotes: NoteSet = {
        definitions: [
          { key: 'summary', label: 'Summary' },
          { key: 'comments', label: 'Comments' },
        ],
        notes: { summary: 'S', comments: 'C' },
      };
      fixture.componentRef.setInput('set', setWithTwoNotes);
      fixture.detectChanges();
      await fixture.whenStable();

      const mergedSet: NoteSet = {
        definitions: [{ key: 'summary', label: 'Summary' }],
        notes: {},
        merge: true,
      };
      fixture.componentRef.setInput('set', mergedSet);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.set().notes?.['summary']).toBe('S');
      expect(component.set().notes?.['comments']).toBeUndefined();
    });

    it('should not preserve notes when merge is false', async () => {
      fixture.componentRef.setInput('set', sampleSet);
      fixture.detectChanges();
      await fixture.whenStable();

      const replacedSet: NoteSet = {
        definitions: [{ key: 'summary', label: 'Summary' }],
        notes: {},
      };
      fixture.componentRef.setInput('set', replacedSet);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.set().notes?.['summary']).toBeUndefined();
    });

    it('should reset selection when the currently selected key is dropped by a redefinition', async () => {
      fixture.componentRef.setInput('set', sampleSet);
      fixture.detectChanges();
      await fixture.whenStable();
      component.form.key().value.set('summary');
      await wait(30);
      expect(component.currentDef()?.key).toBe('summary');

      const newDefs: NoteSet = {
        definitions: [{ key: 'other', label: 'Other' }],
        notes: {},
      };
      fixture.componentRef.setInput('set', newDefs);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.form.key().value()).toBeNull();
      expect(component.form.text().value()).toBe('');
      expect(component.currentDef()).toBeUndefined();
    });
  });

  describe('template rendering', () => {
    it('should not show the key selector when there are no definitions', () => {
      const select = fixture.debugElement.query(By.css('mat-select'));
      expect(select).toBeNull();
    });

    it('should show the key selector when there are definitions', async () => {
      fixture.componentRef.setInput('set', sampleSet);
      fixture.detectChanges();
      await fixture.whenStable();

      const select = fixture.debugElement.query(By.css('mat-select'));
      expect(select).toBeTruthy();
    });

    it('should show required and markdown indicators for the current note', async () => {
      fixture.componentRef.setInput('set', sampleSet);
      fixture.detectChanges();
      await fixture.whenStable();
      component.form.key().value.set('summary');
      await wait(30);
      fixture.detectChanges();

      const bars = fixture.debugElement.queryAll(By.css('.bar'));
      expect(bars.length).toBeGreaterThan(0);
    });

    it('should disable save when the text is invalid', async () => {
      fixture.componentRef.setInput('set', sampleSet);
      fixture.detectChanges();
      await fixture.whenStable();
      component.form.key().value.set('summary');
      await wait(30);
      component.form.text().value.set('');
      fixture.detectChanges();
      await fixture.whenStable();

      const saveBtn = fixture.debugElement.query(
        By.css('button[matTooltip="Save this note"]')
      );
      expect(saveBtn.nativeElement.disabled).toBe(true);
    });

    it('should enable save when the text is valid', async () => {
      fixture.componentRef.setInput('set', sampleSet);
      fixture.detectChanges();
      await fixture.whenStable();
      component.form.key().value.set('summary');
      await wait(30);
      fixture.detectChanges();
      await fixture.whenStable();

      const saveBtn = fixture.debugElement.query(
        By.css('button[matTooltip="Save this note"]')
      );
      expect(saveBtn.nativeElement.disabled).toBe(false);
    });

    it('should disable revert when there is no current note', async () => {
      fixture.componentRef.setInput('set', sampleSet);
      fixture.detectChanges();
      await fixture.whenStable();

      const revertBtn = fixture.debugElement.query(
        By.css('button[matTooltip="Revert text"]')
      );
      expect(revertBtn.nativeElement.disabled).toBe(true);
    });

    it('should show the "too long" error message when maxLength is exceeded', async () => {
      fixture.componentRef.setInput('set', sampleSet);
      fixture.detectChanges();
      await fixture.whenStable();
      component.form.key().value.set('summary');
      await wait(30);
      fixture.detectChanges();

      // drive the change through the native textarea, like a real user
      // typing, so mat-form-field's own error-state tracking (which is
      // wired to the control's DOM events, not to direct field API
      // calls) picks it up
      const textarea = fixture.debugElement.query(
        By.css('textarea'),
      ).nativeElement as HTMLTextAreaElement;
      textarea.value = 'this text is definitely longer than 20 chars';
      textarea.dispatchEvent(new Event('input'));
      textarea.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.form.text().getError('maxLength')).toBeDefined();
      const errors = fixture.debugElement.queryAll(By.css('mat-error'));
      const texts = errors.map((e) => e.nativeElement.textContent.trim());
      expect(texts).toContain('too long');
    });
  });
});
