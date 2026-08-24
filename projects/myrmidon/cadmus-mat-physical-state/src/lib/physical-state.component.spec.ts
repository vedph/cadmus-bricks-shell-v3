import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideNativeDateAdapter } from '@angular/material/core';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import {
  PhysicalState,
  PhysicalStateComponent,
} from './physical-state.component';

describe('PhysicalStateComponent', () => {
  let component: PhysicalStateComponent;
  let fixture: ComponentFixture<PhysicalStateComponent>;

  const STATE_ENTRIES: ThesaurusEntry[] = [
    { id: 'good', value: 'Good' },
    { id: 'damaged', value: 'Damaged' },
  ];

  const REPORTER_ENTRIES: ThesaurusEntry[] = [
    { id: 'jdoe', value: 'John Doe' },
    { id: 'asmith', value: 'Alice Smith' },
  ];

  const FEAT_ENTRIES: ThesaurusEntry[] = [
    { id: 'torn', value: 'Torn' },
    { id: 'stained', value: 'Stained' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhysicalStateComponent],
      providers: [provideNoopAnimations(), provideNativeDateAdapter()],
    }).compileComponents();

    fixture = TestBed.createComponent(PhysicalStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // helper: compute the same YYYY-MM-DD representation the component's
  // private dateToYmd would produce, using local date parts (avoids
  // hardcoding a value that would be timezone-dependent in CI).
  function toYmd(date: string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region initial form state
  it('should initialize form controls with default values', () => {
    expect(component.form.type().value()).toBe('');
    expect(component.form.features().value()).toEqual([]);
    expect(component.form.hasDate().value()).toBe(false);
    expect(component.form.date().value()).toBeNull();
    expect(component.form.reporter().value()).toBe('');
    expect(component.form.note().value()).toBe('');
  });

  it('should be invalid initially because type and reporter are required', () => {
    expect(component.form().invalid()).toBe(true);
    expect(component.form.type().getError('required')).toBeTruthy();
    expect(component.form.reporter().getError('required')).toBeTruthy();
  });

  it('should have flags computed as empty array when featEntries is not set', () => {
    expect(component.flags()).toEqual([]);
  });
  //#endregion

  //#region state model -> form sync
  it('should reset the form when state is set to undefined', () => {
    // first assign a defined state so the model signal actually changes
    // value when we later set it back to undefined (setting the same
    // undefined value again would not re-trigger the sync effect).
    fixture.componentRef.setInput('state', {
      type: 'good',
      reporter: 'jdoe',
    });
    fixture.detectChanges();
    expect(component.form.type().value()).toBe('good');

    fixture.componentRef.setInput('state', undefined);
    fixture.detectChanges();

    expect(component.form.type().value()).toBe('');
    expect(component.form.features().value()).toEqual([]);
    expect(component.form.hasDate().value()).toBe(false);
    expect(component.form.reporter().value()).toBe('');
    expect(component.form.note().value()).toBe('');
  });

  it('should update the form when state is set with full data', () => {
    const state: PhysicalState = {
      type: 'good',
      features: ['torn', 'stained'],
      date: '2024-03-05',
      reporter: 'jdoe',
      note: 'a note',
    };

    fixture.componentRef.setInput('state', state);
    fixture.detectChanges();

    expect(component.form.type().value()).toBe('good');
    expect(component.form.features().value()).toEqual(['torn', 'stained']);
    expect(component.form.hasDate().value()).toBe(true);
    expect(component.form.date().value()).toBe('2024-03-05');
    expect(component.form.reporter().value()).toBe('jdoe');
    expect(component.form.note().value()).toBe('a note');
    // form should be pristine right after being synced from the model
    expect(component.form().dirty()).toBe(false);
  });

  it('should update the form when state has no date/features/reporter/note', () => {
    const state: PhysicalState = {
      type: 'good',
    };

    fixture.componentRef.setInput('state', state);
    fixture.detectChanges();

    expect(component.form.type().value()).toBe('good');
    expect(component.form.features().value()).toEqual([]);
    expect(component.form.hasDate().value()).toBe(false);
    expect(component.form.date().value()).toBeNull();
    expect(component.form.reporter().value()).toBe('');
    expect(component.form.note().value()).toBe('');
  });
  //#endregion

  //#region noRecognition input
  it('should show recognition fieldset by default', () => {
    const fieldset = fixture.debugElement.query(By.css('fieldset'));
    expect(fieldset).toBeTruthy();
  });

  it('should hide recognition fieldset when noRecognition is true', () => {
    fixture.componentRef.setInput('noRecognition', true);
    fixture.detectChanges();

    const fieldset = fixture.debugElement.query(By.css('fieldset'));
    expect(fieldset).toBeFalsy();
  });
  //#endregion

  //#region stateEntries input / type field rendering
  it('should render a free text input for type when stateEntries is not set', () => {
    const select = fixture.debugElement.query(
      By.css('mat-select[ng-reflect-name], mat-select')
    );
    const input = fixture.debugElement.query(By.css('input[matInput]'));
    expect(select).toBeFalsy();
    expect(input).toBeTruthy();
  });

  it('should render a mat-select for type when stateEntries is set and non-empty', () => {
    fixture.componentRef.setInput('stateEntries', STATE_ENTRIES);
    fixture.detectChanges();

    const select = fixture.debugElement.query(By.css('mat-select'));
    expect(select).toBeTruthy();
  });

  it('should render a free text input for type when stateEntries is an empty array', () => {
    fixture.componentRef.setInput('stateEntries', []);
    fixture.detectChanges();

    const select = fixture.debugElement.query(By.css('mat-select'));
    expect(select).toBeFalsy();
  });
  //#endregion

  //#region featEntries input / flags computed / flag-set rendering
  it('should compute flags from featEntries', () => {
    fixture.componentRef.setInput('featEntries', FEAT_ENTRIES);
    fixture.detectChanges();

    expect(component.flags()).toEqual([
      { id: 'torn', label: 'Torn' },
      { id: 'stained', label: 'Stained' },
    ]);
  });

  it('should not render cadmus-ui-flag-set when featEntries is not set', () => {
    const flagSet = fixture.debugElement.query(
      By.css('cadmus-ui-flag-set')
    );
    expect(flagSet).toBeFalsy();
  });

  it('should render cadmus-ui-flag-set when featEntries is set and non-empty', () => {
    fixture.componentRef.setInput('featEntries', FEAT_ENTRIES);
    fixture.detectChanges();

    const flagSet = fixture.debugElement.query(
      By.css('cadmus-ui-flag-set')
    );
    expect(flagSet).toBeTruthy();
  });

  it('should update features control on onCheckedIdsChange', () => {
    component.onCheckedIdsChange(['torn']);

    expect(component.form.features().value()).toEqual(['torn']);
    expect(component.form.features().dirty()).toBe(true);
  });
  //#endregion

  //#region reporterEntries input / reporter field rendering (inside recognition)
  it('should render a free text input for reporter when reporterEntries is not set', () => {
    const selects = fixture.debugElement.queryAll(By.css('mat-select'));
    expect(selects.length).toBe(0);
    // free reporter input exists among the matInput inputs
    const inputs = fixture.debugElement.queryAll(By.css('input[matInput]'));
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('should render a mat-select for reporter when reporterEntries is set and non-empty', () => {
    fixture.componentRef.setInput('reporterEntries', REPORTER_ENTRIES);
    fixture.detectChanges();

    const selects = fixture.debugElement.queryAll(By.css('mat-select'));
    expect(selects.length).toBe(1);
  });

  it('should not render the reporter select when noRecognition is true, even with reporterEntries set', () => {
    fixture.componentRef.setInput('noRecognition', true);
    fixture.componentRef.setInput('reporterEntries', REPORTER_ENTRIES);
    fixture.detectChanges();

    const selects = fixture.debugElement.queryAll(By.css('mat-select'));
    expect(selects.length).toBe(0);
  });
  //#endregion

  //#region date field visibility
  it('should not render the date field when hasDate is false', () => {
    const dateField = fixture.debugElement.query(By.css('mat-form-field.date'));
    expect(dateField).toBeFalsy();
  });

  it('should render the date field when hasDate is true', () => {
    component.form.hasDate().value.set(true);
    fixture.detectChanges();

    const dateField = fixture.debugElement.query(By.css('mat-form-field.date'));
    expect(dateField).toBeTruthy();
    const toggle = fixture.debugElement.query(By.css('mat-datepicker-toggle'));
    expect(toggle).toBeTruthy();
  });
  //#endregion

  //#region validators
  it('should mark type as invalid when empty (required)', () => {
    component.form.type().value.set('');
    expect(component.form.type().valid()).toBe(false);
    expect(component.form.type().getError('required')).toBeTruthy();
  });

  it('should mark type as invalid when exceeding max length', () => {
    component.form.type().value.set('a'.repeat(101));
    expect(component.form.type().valid()).toBe(false);
    expect(component.form.type().getError('maxLength')).toBeTruthy();
  });

  it('should mark type as valid with a proper value', () => {
    component.form.type().value.set('good');
    expect(component.form.type().valid()).toBe(true);
  });

  it('should mark reporter as invalid when empty (required)', () => {
    expect(component.form.reporter().valid()).toBe(false);
    expect(component.form.reporter().getError('required')).toBeTruthy();
  });

  it('should mark reporter as invalid when exceeding max length', () => {
    component.form.reporter().value.set('a'.repeat(101));
    expect(component.form.reporter().valid()).toBe(false);
    expect(component.form.reporter().getError('maxLength')).toBeTruthy();
  });

  it('should mark reporter as valid with a proper value', () => {
    component.form.reporter().value.set('jdoe');
    expect(component.form.reporter().valid()).toBe(true);
  });

  it('should mark note as valid when empty (optional)', () => {
    expect(component.form.note().valid()).toBe(true);
  });

  it('should mark note as invalid when exceeding max length', () => {
    component.form.note().value.set('a'.repeat(5001));
    expect(component.form.note().valid()).toBe(false);
    expect(component.form.note().getError('maxLength')).toBeTruthy();
  });

  it('should mark note as valid at the max length boundary', () => {
    component.form.note().value.set('a'.repeat(5000));
    expect(component.form.note().valid()).toBe(true);
  });
  //#endregion

  //#region submit button enablement
  it('should keep the submit button disabled while the form is invalid', () => {
    fixture.detectChanges();
    const submitBtn = fixture.debugElement.query(
      By.css('button[matTooltip="Save state"]')
    );
    expect(submitBtn.nativeElement.disabled).toBe(true);
  });

  it('should keep the submit button disabled while the form is pristine even if valid', () => {
    // make it valid without marking dirty
    component.form.type().value.set('good');
    component.form.reporter().value.set('jdoe');
    component.form().reset();
    fixture.detectChanges();

    expect(component.form().dirty()).toBe(false);
    const submitBtn = fixture.debugElement.query(
      By.css('button[matTooltip="Save state"]')
    );
    expect(submitBtn.nativeElement.disabled).toBe(true);
  });

  it('should enable the submit button when the form is valid and dirty', () => {
    // value.set() alone does not mark a field dirty (only real user
    // interaction, or an explicit markAsDirty() call, does); mark it
    // explicitly to simulate that the user has actually edited the form.
    component.form.type().value.set('good');
    component.form.reporter().value.set('jdoe');
    component.form.type().markAsDirty();
    component.form.reporter().markAsDirty();
    fixture.detectChanges();

    expect(component.form().valid()).toBe(true);
    expect(component.form().dirty()).toBe(true);
    const submitBtn = fixture.debugElement.query(
      By.css('button[matTooltip="Save state"]')
    );
    expect(submitBtn.nativeElement.disabled).toBe(false);
  });
  //#endregion

  //#region cancel
  it('should emit stateCancel when cancel is invoked', () => {
    let called = false;
    component.stateCancel.subscribe(() => (called = true));

    component.cancel();

    expect(called).toBe(true);
  });

  it('should emit stateCancel when the cancel button is clicked', () => {
    let called = false;
    component.stateCancel.subscribe(() => (called = true));

    const cancelBtn = fixture.debugElement.query(
      By.css('button[type="button"]')
    );
    cancelBtn.nativeElement.click();

    expect(called).toBe(true);
  });
  //#endregion

  //#region save / getState via the state model
  it('should set state with trimmed type/reporter/note and no features/date when not provided', () => {
    component.form.type().value.set('  good  ');
    component.form.reporter().value.set('  jdoe  ');
    component.form.note().value.set('  a note  ');

    component.save();

    expect(component.state()).toEqual({
      type: 'good',
      features: undefined,
      date: undefined,
      reporter: 'jdoe',
      note: 'a note',
    });
  });

  it('should include features in state when at least one is checked', () => {
    component.form.type().value.set('good');
    component.form.reporter().value.set('jdoe');
    component.onCheckedIdsChange(['torn', 'stained']);

    component.save();

    expect(component.state()?.features).toEqual(['torn', 'stained']);
  });

  it('should not include date in state when hasDate is false, even if date has a value', () => {
    component.form.type().value.set('good');
    component.form.reporter().value.set('jdoe');
    component.form.hasDate().value.set(false);
    component.form.date().value.set('2024-03-05T00:00:00.000Z');

    component.save();

    expect(component.state()?.date).toBeUndefined();
  });

  it('should not include date in state when hasDate is true but date has no value', () => {
    component.form.type().value.set('good');
    component.form.reporter().value.set('jdoe');
    component.form.hasDate().value.set(true);
    component.form.date().value.set(null);

    component.save();

    expect(component.state()?.date).toBeUndefined();
  });

  it('should include a YYYY-MM-DD formatted date in state when hasDate is true and date has a value', () => {
    const raw = '2024-03-05T10:20:30.000Z';
    component.form.type().value.set('good');
    component.form.reporter().value.set('jdoe');
    component.form.hasDate().value.set(true);
    component.form.date().value.set(raw);

    component.save();

    expect(component.state()?.date).toBe(toYmd(raw));
  });

  it('should render no <form> element, so it stays valid at any nesting depth', () => {
    // this widget is embeddable anywhere, so it must never introduce a
    // <form>: signal forms bind through [formField] and need no form
    // element - see signal-forms-migration.md.
    component.form.type().value.set('good');
    component.form.reporter().value.set('jdoe');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('form'))).toBeNull();
  });

  it('should reflect reporter/note as undefined in state when they are empty', () => {
    component.form.type().value.set('good');
    component.form.reporter().value.set('jdoe');
    component.form.note().value.set('');

    component.save();

    expect(component.state()?.note).toBeUndefined();
  });
  //#endregion
});
