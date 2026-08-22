import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { ProperNameComponent, AssertedProperName } from './proper-name.component';
import { ProperNamePiece } from '../models';

describe('ProperNameComponent', () => {
  let component: ProperNameComponent;
  let fixture: ComponentFixture<ProperNameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProperNameComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProperNameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with an empty, invalid form', () => {
    expect(component.language.value).toBeNull();
    expect(component.tag.value).toBeNull();
    expect(component.pieces.value).toEqual([]);
    expect(component.form.invalid).toBe(true);
  });

  describe('name -> form sync', () => {
    it('populates the form when name is set', async () => {
      const name: AssertedProperName = {
        language: 'lat',
        tag: 'classic',
        pieces: [{ type: 'p', value: 'Publius' }],
      };
      fixture.componentRef.setInput('name', name);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.language.value).toBe('lat');
      expect(component.tag.value).toBe('classic');
      expect(component.pieces.value).toEqual(name.pieces);
      expect(component.form.pristine).toBe(true);
    });

    it('resets the form when name is cleared', async () => {
      fixture.componentRef.setInput('name', {
        language: 'lat',
        pieces: [{ type: 'p', value: 'Publius' }],
      });
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentRef.setInput('name', undefined);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.pieces.value).toEqual([]);
      expect(component.language.value).toBeNull();
    });

    it('closes any open piece/assertion editor when name changes', async () => {
      component.editPiece({ type: 'p', value: 'x' }, 0);
      component.assEdOpen.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentRef.setInput('name', {
        language: 'lat',
        pieces: [{ type: 'p', value: 'x' }],
      });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.editedPieceIndex()).toBe(-1);
      expect(component.editedPiece()).toBeUndefined();
      expect(component.assEdOpen()).toBe(false);
    });
  });

  describe('type entries handling', () => {
    it('parses typeEntries into pieceTypes via the name service', async () => {
      const entries: ThesaurusEntry[] = [
        { id: 'p', value: 'praenomen' },
        { id: 'n', value: 'nomen' },
      ];
      fixture.componentRef.setInput('typeEntries', entries);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.pieceTypes().map((t) => t.id)).toEqual(['p', 'n']);
    });

    it('strips a trailing * from purgedTypeEntries ids', async () => {
      const entries: ThesaurusEntry[] = [
        { id: 'continent*', value: 'continent' },
        { id: 'country', value: 'country' },
      ];
      fixture.componentRef.setInput('typeEntries', entries);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.purgedTypeEntries()).toEqual([
        { id: 'continent', value: 'continent' },
        { id: 'country', value: 'country' },
      ]);
    });

    it('sets purgedTypeEntries to undefined when typeEntries is undefined', () => {
      expect(component.purgedTypeEntries()).toBeUndefined();
    });

    it('computes ordered as true only when a piece type carries an ordinal', async () => {
      expect(component.ordered()).toBe(false);

      const entries: ThesaurusEntry[] = [
        { id: 'continent*', value: 'continent' },
        { id: 'country*', value: 'country' },
        { id: '_order', value: 'continent country' },
      ];
      fixture.componentRef.setInput('typeEntries', entries);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.ordered()).toBe(true);
    });

    it('computes valueEntries from the parsed piece types', async () => {
      const entries: ThesaurusEntry[] = [
        { id: 'continent*', value: 'continent' },
        { id: 'continent.europe', value: 'Europe' },
      ];
      fixture.componentRef.setInput('typeEntries', entries);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.valueEntries()).toEqual([
        { id: 'continent.europe', value: 'Europe' },
      ]);
    });
  });

  describe('piece editing lifecycle', () => {
    it('opens a new piece editor defaulting to the first piece type id when types are set', async () => {
      const entries: ThesaurusEntry[] = [{ id: 'p', value: 'praenomen' }];
      fixture.componentRef.setInput('typeEntries', entries);
      fixture.detectChanges();
      await fixture.whenStable();

      component.addPiece();

      expect(component.editedPieceIndex()).toBe(-1);
      expect(component.editedPiece()).toEqual({ type: 'p', value: '' });
    });

    it('opens a new piece editor with an empty type when there are no piece types', () => {
      component.addPiece();

      expect(component.editedPiece()).toEqual({ type: '', value: '' });
    });

    it('edits an existing piece by index', () => {
      const piece: ProperNamePiece = { type: 'p', value: 'Publius' };
      component.editPiece(piece, 2);

      expect(component.editedPieceIndex()).toBe(2);
      expect(component.editedPiece()).toEqual(piece);
    });

    it('closes the piece editor', () => {
      component.editPiece({ type: 'p', value: 'x' }, 0);
      component.closePiece();

      expect(component.editedPieceIndex()).toBe(-1);
      expect(component.editedPiece()).toBeUndefined();
    });
  });

  describe('savePiece', () => {
    it('appends a new piece when unordered and no matching singleton type', async () => {
      fixture.componentRef.setInput('name', {
        language: 'lat',
        pieces: [{ type: 'p', value: 'Publius' }],
      });
      fixture.detectChanges();
      await fixture.whenStable();

      component.addPiece();
      component.savePiece({ type: 'n', value: 'Vergilius' });

      expect(component.pieces.value).toEqual([
        { type: 'p', value: 'Publius' },
        { type: 'n', value: 'Vergilius' },
      ]);
      expect(component.editedPieceIndex()).toBe(-1);
      expect(component.name()?.pieces).toEqual(component.pieces.value);
    });

    it('replaces the piece at editedPieceIndex when editing an existing piece', async () => {
      fixture.componentRef.setInput('name', {
        language: 'lat',
        pieces: [
          { type: 'p', value: 'Publius' },
          { type: 'n', value: 'Vergilius' },
        ],
      });
      fixture.detectChanges();
      await fixture.whenStable();

      component.editPiece(component.pieces.value[1], 1);
      component.savePiece({ type: 'n', value: 'Naso' });

      expect(component.pieces.value).toEqual([
        { type: 'p', value: 'Publius' },
        { type: 'n', value: 'Naso' },
      ]);
    });

    it('replaces an existing piece of a singleton type instead of appending a duplicate', async () => {
      const entries: ThesaurusEntry[] = [{ id: 'continent*', value: 'continent' }];
      fixture.componentRef.setInput('typeEntries', entries);
      fixture.componentRef.setInput('name', {
        language: 'lat',
        pieces: [{ type: 'continent', value: 'Europe' }],
      });
      fixture.detectChanges();
      await fixture.whenStable();

      component.addPiece();
      component.savePiece({ type: 'continent', value: 'Asia' });

      expect(component.pieces.value).toEqual([
        { type: 'continent', value: 'Asia' },
      ]);
    });

    it('inserts a new piece at the position dictated by ordinal when ordered', async () => {
      const entries: ThesaurusEntry[] = [
        { id: 'continent*', value: 'continent' },
        { id: 'country*', value: 'country' },
        { id: 'region*', value: 'region' },
        { id: '_order', value: 'continent country region' },
      ];
      fixture.componentRef.setInput('typeEntries', entries);
      fixture.componentRef.setInput('name', {
        language: 'lat',
        pieces: [
          { type: 'continent', value: 'Europe' },
          { type: 'region', value: 'Veneto' },
        ],
      });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.ordered()).toBe(true);

      component.addPiece();
      component.savePiece({ type: 'country', value: 'Italy' });

      // country (ordinal 2) must be inserted between continent (1) and
      // region (3)
      expect(component.pieces.value).toEqual([
        { type: 'continent', value: 'Europe' },
        { type: 'country', value: 'Italy' },
        { type: 'region', value: 'Veneto' },
      ]);
    });

    it('appends at the end when ordered but the new type has the highest ordinal', async () => {
      const entries: ThesaurusEntry[] = [
        { id: 'continent*', value: 'continent' },
        { id: 'country*', value: 'country' },
        { id: '_order', value: 'continent country' },
      ];
      fixture.componentRef.setInput('typeEntries', entries);
      fixture.componentRef.setInput('name', {
        language: 'lat',
        pieces: [{ type: 'continent', value: 'Europe' }],
      });
      fixture.detectChanges();
      await fixture.whenStable();

      component.addPiece();
      component.savePiece({ type: 'country', value: 'Italy' });

      expect(component.pieces.value).toEqual([
        { type: 'continent', value: 'Europe' },
        { type: 'country', value: 'Italy' },
      ]);
    });
  });

  describe('removePiece', () => {
    it('removes the piece at the given index and updates name', async () => {
      fixture.componentRef.setInput('name', {
        language: 'lat',
        pieces: [
          { type: 'p', value: 'Publius' },
          { type: 'n', value: 'Vergilius' },
        ],
      });
      fixture.detectChanges();
      await fixture.whenStable();

      component.removePiece(0);

      expect(component.pieces.value).toEqual([
        { type: 'n', value: 'Vergilius' },
      ]);
      expect(component.name()?.pieces).toEqual([
        { type: 'n', value: 'Vergilius' },
      ]);
    });

    it('closes the piece editor when the removed piece was being edited', async () => {
      fixture.componentRef.setInput('name', {
        language: 'lat',
        pieces: [{ type: 'p', value: 'Publius' }],
      });
      fixture.detectChanges();
      await fixture.whenStable();

      component.editPiece(component.pieces.value[0], 0);
      component.removePiece(0);

      expect(component.editedPieceIndex()).toBe(-1);
      expect(component.editedPiece()).toBeUndefined();
    });

    it('sets name to undefined once all pieces are removed', async () => {
      fixture.componentRef.setInput('name', {
        language: 'lat',
        pieces: [{ type: 'p', value: 'Publius' }],
      });
      fixture.detectChanges();
      await fixture.whenStable();

      component.removePiece(0);

      expect(component.name()).toBeUndefined();
    });
  });

  describe('reordering pieces', () => {
    const pieces: ProperNamePiece[] = [
      { type: 'p', value: 'A' },
      { type: 'p', value: 'B' },
      { type: 'p', value: 'C' },
    ];

    beforeEach(async () => {
      fixture.componentRef.setInput('name', {
        language: 'lat',
        pieces: pieces.map((p) => ({ ...p })),
      });
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('moves a piece up', () => {
      component.movePieceUp(1);
      expect(component.pieces.value.map((p) => p.value)).toEqual([
        'B',
        'A',
        'C',
      ]);
    });

    it('does nothing when moving the first piece up', () => {
      component.movePieceUp(0);
      expect(component.pieces.value.map((p) => p.value)).toEqual([
        'A',
        'B',
        'C',
      ]);
    });

    it('moves a piece down', () => {
      component.movePieceDown(0);
      expect(component.pieces.value.map((p) => p.value)).toEqual([
        'B',
        'A',
        'C',
      ]);
    });

    it('does nothing when moving the last piece down', () => {
      component.movePieceDown(2);
      expect(component.pieces.value.map((p) => p.value)).toEqual([
        'A',
        'B',
        'C',
      ]);
    });

    it('clears all pieces and unsets name', () => {
      component.clearPieces();
      expect(component.pieces.value).toEqual([]);
      expect(component.name()).toBeUndefined();
    });
  });

  describe('assertion handling', () => {
    it('sets and dirties the assertion control on onAssertionChange', () => {
      component.onAssertionChange({ rank: 1, note: 'sure' });

      expect(component.assertion.value).toEqual({ rank: 1, note: 'sure' });
      expect(component.assertion.dirty).toBe(true);
    });

    it('clears the assertion control when passed undefined', () => {
      component.onAssertionChange({ rank: 1 });
      component.onAssertionChange(undefined);

      expect(component.assertion.value).toBeNull();
    });

    it('saves the assertion into name and closes the editor', async () => {
      fixture.componentRef.setInput('name', {
        language: 'lat',
        pieces: [{ type: 'p', value: 'Publius' }],
      });
      fixture.detectChanges();
      await fixture.whenStable();

      component.assEdOpen.set(true);
      component.onAssertionChange({ rank: 2, note: 'assured' });
      component.saveAssertion();

      expect(component.assEdOpen()).toBe(false);
      expect(component.name()?.assertion).toEqual({ rank: 2, note: 'assured' });
    });
  });

  describe('language/tag autosave', () => {
    it('emits an updated name once the language field settles (debounced)', async () => {
      fixture.componentRef.setInput('name', {
        language: 'lat',
        pieces: [{ type: 'p', value: 'Publius' }],
      });
      fixture.detectChanges();
      await fixture.whenStable();

      component.language.setValue('grc');
      await new Promise((resolve) => setTimeout(resolve, 350));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.name()?.language).toBe('grc');
    });

    it('emits an updated name once the tag field settles (debounced)', async () => {
      fixture.componentRef.setInput('name', {
        language: 'lat',
        pieces: [{ type: 'p', value: 'Publius' }],
      });
      fixture.detectChanges();
      await fixture.whenStable();

      component.tag.setValue('modern');
      await new Promise((resolve) => setTimeout(resolve, 350));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.name()?.tag).toBe('modern');
    });
  });

  describe('hideAssertion input', () => {
    it('hides the assertion fieldset when hideAssertion is true', () => {
      fixture.componentRef.setInput('hideAssertion', true);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('fieldset')).toBeNull();
    });

    it('shows the assertion fieldset by default', () => {
      expect(fixture.nativeElement.querySelector('fieldset')).toBeTruthy();
    });
  });
});
