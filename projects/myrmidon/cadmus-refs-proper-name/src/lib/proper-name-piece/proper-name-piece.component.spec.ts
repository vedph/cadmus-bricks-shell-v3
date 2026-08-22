import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

import { ProperNamePieceComponent } from './proper-name-piece.component';
import { ProperNamePiece, TypeThesaurusEntry } from '../models';

describe('ProperNamePieceComponent', () => {
  let component: ProperNamePieceComponent;
  let fixture: ComponentFixture<ProperNamePieceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProperNamePieceComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProperNamePieceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with an empty, invalid form when no piece is bound', () => {
    expect(component.type.value).toBeNull();
    expect(component.value.value).toBeNull();
    expect(component.form.invalid).toBe(true);
  });

  it('does not render the form when no piece is set', () => {
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('renders the form once a piece is bound', async () => {
    fixture.componentRef.setInput('piece', { type: 'p', value: 'Publius' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
  });

  it('populates the type/value controls with literal strings when no types are provided', async () => {
    fixture.componentRef.setInput('piece', { type: 'p', value: 'Publius' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.type.value).toBe('p');
    expect(component.value.value).toBe('Publius');
    expect(component.typeValues()).toEqual([]);
  });

  it('resolves the type control to the matching TypeThesaurusEntry object when types are provided', async () => {
    const types: TypeThesaurusEntry[] = [
      {
        id: 'continent',
        value: 'continent',
        values: [
          { id: 'continent.europe', value: 'Europe' },
          { id: 'continent.asia', value: 'Asia' },
        ],
      },
      { id: 'country', value: 'country' },
    ];
    fixture.componentRef.setInput('types', types);
    fixture.componentRef.setInput('piece', {
      type: 'continent',
      value: 'continent.europe',
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.type.value).toEqual(types[0]);
    expect(component.typeValues()).toEqual(types[0].values);
    expect(component.value.value).toEqual(types[0].values![0]);
  });

  it('falls back to a literal type/value when there is no matching thesaurus entry', async () => {
    const types: TypeThesaurusEntry[] = [{ id: 'country', value: 'country' }];
    fixture.componentRef.setInput('types', types);
    fixture.componentRef.setInput('piece', { type: 'unknown', value: 'Italy' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.type.value).toBe('unknown');
    expect(component.value.value).toBe('Italy');
  });

  it('resets the form when the piece is cleared', async () => {
    fixture.componentRef.setInput('piece', { type: 'p', value: 'Publius' });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentRef.setInput('piece', undefined);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.type.value).toBeNull();
    expect(component.value.value).toBeNull();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('updates typeValues (debounced) when the user changes the type control', async () => {
    const types: TypeThesaurusEntry[] = [
      {
        id: 'continent',
        value: 'continent',
        values: [{ id: 'continent.europe', value: 'Europe' }],
      },
      { id: 'country', value: 'country' },
    ];
    fixture.componentRef.setInput('types', types);
    fixture.componentRef.setInput('piece', { type: 'country', value: 'Italy' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.typeValues()).toEqual([]);

    // let the debounced valueChanges triggered by updateForm's own
    // type.setValue() settle first (and be swallowed by the
    // "_noNextValuesUpdate" guard), so it doesn't collapse with the
    // user-driven change below
    await new Promise((resolve) => setTimeout(resolve, 350));

    // simulate the user picking a different type from the select
    component.type.setValue(types[0]);
    // wait past the 300ms debounce
    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(component.typeValues()).toEqual(types[0].values);
    // the previous literal value ('Italy') is not among the new preset
    // values, so it must be reset
    expect(component.value.value).toBeNull();
  });

  it('keeps the current value when it is still valid for the newly selected type', async () => {
    const types: TypeThesaurusEntry[] = [
      {
        id: 'continent',
        value: 'continent',
        values: [
          { id: 'continent.europe', value: 'Europe' },
          { id: 'continent.asia', value: 'Asia' },
        ],
      },
    ];
    fixture.componentRef.setInput('types', types);
    fixture.componentRef.setInput('piece', {
      type: 'continent',
      value: 'continent.europe',
    });
    fixture.detectChanges();
    await fixture.whenStable();

    // let the debounced valueChanges triggered by updateForm's own
    // type.setValue() settle first, so it doesn't collapse with the
    // user-driven change below
    await new Promise((resolve) => setTimeout(resolve, 350));

    const previousValue = component.value.value;

    // re-set the same type: distinctUntilChanged means the debounced
    // callback should not even fire, and the value must be untouched
    component.type.setValue(types[0]);
    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(component.value.value).toEqual(previousValue);
  });

  it('emits editorClose when cancel is invoked', () => {
    const handler = vi.fn();
    component.editorClose.subscribe(handler);

    component.cancel();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not update the piece model when the form is invalid', async () => {
    const setSpy = vi.spyOn(component.piece, 'set');

    component.save();

    expect(setSpy).not.toHaveBeenCalled();
  });

  it('saves a literal piece built from the raw string controls', async () => {
    fixture.componentRef.setInput('piece', { type: 'p', value: 'Publius' });
    fixture.detectChanges();
    await fixture.whenStable();

    component.type.setValue('n');
    component.value.setValue('Vergilius');

    component.save();

    expect(component.piece()).toEqual({ type: 'n', value: 'Vergilius' });
  });

  it('saves a piece resolving thesaurus-bound controls to their ids', async () => {
    const types: TypeThesaurusEntry[] = [
      {
        id: 'continent',
        value: 'continent',
        values: [{ id: 'continent.europe', value: 'Europe' }],
      },
    ];
    fixture.componentRef.setInput('types', types);
    fixture.componentRef.setInput('piece', {
      type: 'continent',
      value: 'continent.europe',
    });
    fixture.detectChanges();
    await fixture.whenStable();

    component.save();

    const saved: ProperNamePiece = component.piece()!;
    expect(saved).toEqual({ type: 'continent', value: 'continent.europe' });
  });
});
