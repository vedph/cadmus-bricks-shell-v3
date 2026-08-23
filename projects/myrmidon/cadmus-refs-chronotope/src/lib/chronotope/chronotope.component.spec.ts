import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ChronotopeComponent } from './chronotope.component';

describe('ChronotopeComponent', () => {
  let fixture: ComponentFixture<ChronotopeComponent>;
  let component: ChronotopeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChronotopeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChronotopeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a pristine, empty form by default', () => {
    expect(component.form.tag().value()).toBe('');
    expect(component.form.place().value()).toBe('');
    expect(component.form.date().value()).toBeNull();
    expect(component.form.hasDate().value()).toBe(false);
  });

  it('should update the form when the chronotope model changes', () => {
    component.chronotope.set({
      tag: 'birth',
      place: 'Rome',
      date: { a: { value: 45 } },
    });
    fixture.detectChanges();

    expect(component.form.tag().value()).toBe('birth');
    expect(component.form.place().value()).toBe('Rome');
    expect(component.form.date().value()).toEqual({ a: { value: 45 } });
    expect(component.form.hasDate().value()).toBe(true);
    expect(component.form().dirty()).toBe(false);
  });

  it('should reset the form when the chronotope model is set to undefined', () => {
    component.chronotope.set({ tag: 'birth', place: 'Rome' });
    fixture.detectChanges();

    component.chronotope.set(undefined);
    fixture.detectChanges();

    expect(component.form.tag().value()).toBe('');
    expect(component.form.place().value()).toBe('');
  });

  it('should set hasDate to false when chronotope has no date', () => {
    component.chronotope.set({ place: 'Rome' });
    fixture.detectChanges();

    expect(component.form.hasDate().value()).toBe(false);
  });

  it('should show a free-text tag input when no tag entries are provided', () => {
    const select = fixture.debugElement.query(By.css('mat-select'));
    const input = fixture.debugElement.query(By.css('input'));
    expect(select).toBeNull();
    expect(input).toBeTruthy();
  });

  it('should show a bound tag select when tag entries are provided', () => {
    fixture.componentRef.setInput('ctTagEntries', [
      { id: 'a', value: 'A' },
      { id: 'b', value: 'B' },
    ]);
    fixture.detectChanges();

    const select = fixture.debugElement.query(By.css('mat-select'));
    expect(select).toBeTruthy();
  });

  it('should not show the historical date editor when hasDate is false', () => {
    let dateEl = fixture.debugElement.query(
      By.css('cadmus-refs-historical-date')
    );
    expect(dateEl).toBeNull();

    component.form.hasDate().value.set(true);
    fixture.detectChanges();

    dateEl = fixture.debugElement.query(By.css('cadmus-refs-historical-date'));
    expect(dateEl).toBeTruthy();
  });

  it('should update the date control when onDateChange is called', () => {
    component.onDateChange({ a: { value: 100 } });
    expect(component.form.date().value()).toEqual({ a: { value: 100 } });
  });

  it('should set the date control to null when onDateChange is called without a date', () => {
    component.onDateChange({ a: { value: 100 } });
    component.onDateChange(undefined);
    expect(component.form.date().value()).toBeNull();
  });

  it('should mark tag control invalid when exceeding max length', () => {
    component.form.tag().value.set('x'.repeat(51));
    expect(component.form.tag().valid()).toBe(false);
    expect(component.form.tag().getError('maxLength')).toBeTruthy();
  });

  it('should mark place control invalid when exceeding max length', () => {
    component.form.place().value.set('x'.repeat(51));
    expect(component.form.place().valid()).toBe(false);
    expect(component.form.place().getError('maxLength')).toBeTruthy();
  });

  describe('save()', () => {
    it('should emit the chronotope model when the form is valid and hasDate is false', () => {
      component.form.tag().value.set('birth');
      component.form.place().value.set('Rome');
      component.save();

      expect(component.chronotope()).toEqual({
        tag: 'birth',
        place: 'Rome',
        date: undefined,
      });
    });

    it('should mark the form as pristine after saving by default', () => {
      component.form.tag().value.set('birth');
      component.form().markAsDirty();
      component.save();
      expect(component.form().dirty()).toBe(false);
    });

    it('should not mark the form as pristine when pristine=false is passed', () => {
      component.form.tag().value.set('birth');
      component.form().markAsDirty();
      component.save(false);
      expect(component.form().dirty()).toBe(true);
    });

    it('should not emit and mark all as touched when hasDate is true but no date is set', () => {
      component.form.hasDate().value.set(true);
      component.save();

      expect(component.chronotope()).toBeUndefined();
      expect(component.form.date().touched()).toBe(true);
    });

    it('should emit including the date when hasDate is true and date is set', () => {
      component.form.hasDate().value.set(true);
      component.form.date().value.set({ a: { value: 45 } });
      component.save();

      expect(component.chronotope()).toEqual({
        tag: undefined,
        place: undefined,
        date: { a: { value: 45 } },
      });
    });

    it('should not emit when the form is invalid', () => {
      component.form.tag().value.set('x'.repeat(51));
      component.save();
      expect(component.chronotope()).toBeUndefined();
    });

    it('should trim tag and place values', () => {
      component.form.tag().value.set('  birth  ');
      component.form.place().value.set('  Rome  ');
      component.save();

      expect(component.chronotope()?.tag).toBe('birth');
      expect(component.chronotope()?.place).toBe('Rome');
    });
  });

  describe('autosave on form changes', () => {
    it('should emit chronotopeChange after debounce when a valid change is made', async () => {
      component.form.tag().value.set('birth');
      // wait for the debounceTime(500) to elapse
      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(component.chronotope()?.tag).toBe('birth');
    });

    it('should not autosave while updating form from model (no user change)', async () => {
      component.chronotope.set({ tag: 'birth', place: 'Rome' });
      fixture.detectChanges();

      const before = component.chronotope();
      await new Promise((resolve) => setTimeout(resolve, 600));
      // no user edit was made, so nothing else should have triggered a set
      expect(component.chronotope()).toBe(before);
    });

    it('should not autosave when hasDate is true but date is empty', async () => {
      component.form.hasDate().value.set(true);
      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(component.chronotope()).toBeUndefined();
    });
  });
});
