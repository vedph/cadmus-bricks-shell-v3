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
    expect(component.tag.value).toBeNull();
    expect(component.place.value).toBeNull();
    expect(component.date.value).toBeNull();
    expect(component.hasDate.value).toBe(false);
  });

  it('should update the form when the chronotope model changes', () => {
    component.chronotope.set({
      tag: 'birth',
      place: 'Rome',
      date: { a: { value: 45 } },
    });
    fixture.detectChanges();

    expect(component.tag.value).toBe('birth');
    expect(component.place.value).toBe('Rome');
    expect(component.date.value).toEqual({ a: { value: 45 } });
    expect(component.hasDate.value).toBe(true);
    expect(component.form.pristine).toBe(true);
  });

  it('should reset the form when the chronotope model is set to undefined', () => {
    component.chronotope.set({ tag: 'birth', place: 'Rome' });
    fixture.detectChanges();

    component.chronotope.set(undefined);
    fixture.detectChanges();

    expect(component.tag.value).toBeNull();
    expect(component.place.value).toBeNull();
  });

  it('should set hasDate to false when chronotope has no date', () => {
    component.chronotope.set({ place: 'Rome' });
    fixture.detectChanges();

    expect(component.hasDate.value).toBe(false);
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

    component.hasDate.setValue(true);
    fixture.detectChanges();

    dateEl = fixture.debugElement.query(By.css('cadmus-refs-historical-date'));
    expect(dateEl).toBeTruthy();
  });

  it('should update the date control when onDateChange is called', () => {
    component.onDateChange({ a: { value: 100 } });
    expect(component.date.value).toEqual({ a: { value: 100 } });
  });

  it('should set the date control to null when onDateChange is called without a date', () => {
    component.onDateChange({ a: { value: 100 } });
    component.onDateChange(undefined);
    expect(component.date.value).toBeNull();
  });

  it('should mark tag control invalid when exceeding max length', () => {
    component.tag.setValue('x'.repeat(51));
    component.tag.updateValueAndValidity();
    expect(component.tag.valid).toBe(false);
    expect(component.tag.hasError('maxlength')).toBe(true);
  });

  it('should mark place control invalid when exceeding max length', () => {
    component.place.setValue('x'.repeat(51));
    component.place.updateValueAndValidity();
    expect(component.place.valid).toBe(false);
    expect(component.place.hasError('maxlength')).toBe(true);
  });

  describe('save()', () => {
    it('should emit the chronotope model when the form is valid and hasDate is false', () => {
      component.tag.setValue('birth');
      component.place.setValue('Rome');
      component.save();

      expect(component.chronotope()).toEqual({
        tag: 'birth',
        place: 'Rome',
        date: undefined,
      });
    });

    it('should mark the form as pristine after saving by default', () => {
      component.tag.setValue('birth');
      component.form.markAsDirty();
      component.save();
      expect(component.form.pristine).toBe(true);
    });

    it('should not mark the form as pristine when pristine=false is passed', () => {
      component.tag.setValue('birth');
      component.form.markAsDirty();
      component.save(false);
      expect(component.form.pristine).toBe(false);
    });

    it('should not emit and mark all as touched when hasDate is true but no date is set', () => {
      component.hasDate.setValue(true);
      component.save();

      expect(component.chronotope()).toBeUndefined();
      expect(component.date.touched).toBe(true);
    });

    it('should emit including the date when hasDate is true and date is set', () => {
      component.hasDate.setValue(true);
      component.date.setValue({ a: { value: 45 } });
      component.save();

      expect(component.chronotope()).toEqual({
        tag: undefined,
        place: undefined,
        date: { a: { value: 45 } },
      });
    });

    it('should not emit when the form is invalid', () => {
      component.tag.setValue('x'.repeat(51));
      component.save();
      expect(component.chronotope()).toBeUndefined();
    });

    it('should trim tag and place values', () => {
      component.tag.setValue('  birth  ');
      component.place.setValue('  Rome  ');
      component.save();

      expect(component.chronotope()?.tag).toBe('birth');
      expect(component.chronotope()?.place).toBe('Rome');
    });
  });

  describe('autosave on form changes', () => {
    it('should emit chronotopeChange after debounce when a valid change is made', async () => {
      component.tag.setValue('birth');
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
      component.hasDate.setValue(true);
      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(component.chronotope()).toBeUndefined();
    });
  });
});
