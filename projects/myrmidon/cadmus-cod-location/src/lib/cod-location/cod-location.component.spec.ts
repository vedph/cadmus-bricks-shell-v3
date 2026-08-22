import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { CodLocationComponent } from './cod-location.component';
import { CodLocationRange } from '../cod-location-parser';

/**
 * Wait for the RxJS debounceTime(300) used by the component's text control
 * to elapse. Angular's fakeAsync/tick cannot be used here because this
 * project's vitest setup does not load zone-testing.js, and vitest's own
 * fake timers do not reach the zone-patched setTimeout that RxJS ends up
 * calling; so real timers with a generous margin are used instead.
 */
function advanceDebounce(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('CodLocationComponent', () => {
  let component: CodLocationComponent;
  let fixture: ComponentFixture<CodLocationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodLocationComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(CodLocationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default label to "location"', () => {
    expect(component.label()).toBe('location');
  });

  it('should default required and single to undefined', () => {
    expect(component.required()).toBeUndefined();
    expect(component.single()).toBeUndefined();
  });

  it('should default location to null', () => {
    expect(component.location()).toBeNull();
  });

  it('should initialize the text control to null when location is null', () => {
    expect(component.text.value).toBeNull();
  });

  it('should render the given label', async () => {
    fixture.componentRef.setInput('label', 'custom label');
    fixture.detectChanges();
    await fixture.whenStable();
    const labelEl = fixture.nativeElement.querySelector('mat-label');
    expect(labelEl.textContent).toContain('custom label');
  });

  it('should render a format hint', () => {
    const hintEl = fixture.nativeElement.querySelector('mat-hint');
    expect(hintEl).toBeTruthy();
  });

  it('should bind the text control to the input element', async () => {
    fixture.componentRef.setInput('location', [
      { start: { n: 1, v: false }, end: { n: 1, v: false } },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    const inputEl: HTMLInputElement =
      fixture.nativeElement.querySelector('input');
    expect(inputEl.value).toBe('1r');
  });

  //#region model -> form sync
  describe('model -> form sync', () => {
    it('should populate text when location input is set to a single range', async () => {
      const ranges: CodLocationRange[] = [
        { start: { n: 1, v: false }, end: { n: 3, v: true } },
      ];
      fixture.componentRef.setInput('location', ranges);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.text.value).toBe('1r-3v');
    });

    it('should populate text when location input is set to multiple ranges', async () => {
      const ranges: CodLocationRange[] = [
        { start: { n: 1, v: false }, end: { n: 3, v: true } },
        { start: { n: 4, v: false }, end: { n: 4, v: false } },
      ];
      fixture.componentRef.setInput('location', ranges);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.text.value).toBe('1r-3v 4r');
    });

    it('should reset text when location input is set back to null', async () => {
      fixture.componentRef.setInput('location', [
        { start: { n: 1 }, end: { n: 1 } },
      ]);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.text.value).toBe('1');

      fixture.componentRef.setInput('location', null);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.text.value).toBeNull();
    });
  });
  //#endregion

  //#region validators
  describe('validators', () => {
    it('should add the required validator when required is true', async () => {
      fixture.componentRef.setInput('required', true);
      fixture.detectChanges();
      await fixture.whenStable();

      component.text.setValue('');
      component.text.markAsTouched();
      expect(component.text.hasError('required')).toBe(true);
    });

    it('should not require text when required is false/undefined', async () => {
      component.text.setValue('');
      component.text.markAsTouched();
      expect(component.text.hasError('required')).toBe(false);
    });

    it('should apply the single-location pattern when single is true', async () => {
      fixture.componentRef.setInput('single', true);
      fixture.detectChanges();
      await fixture.whenStable();

      // a multi-range string is not a valid single location
      component.text.setValue('1r-3v 4r');
      expect(component.text.hasError('pattern')).toBe(true);
    });

    it('should accept a single sheet reference under the single pattern', async () => {
      fixture.componentRef.setInput('single', true);
      fixture.detectChanges();
      await fixture.whenStable();

      component.text.setValue('12r');
      expect(component.text.valid).toBe(true);
    });

    it('should apply the ranges pattern when single is false', async () => {
      fixture.componentRef.setInput('single', false);
      fixture.detectChanges();
      await fixture.whenStable();

      component.text.setValue('1r-3v 4r');
      expect(component.text.valid).toBe(true);
    });
  });
  //#endregion

  //#region form -> model sync (single mode)
  describe('form -> model sync (single mode)', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('single', true);
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should update location after debounce when typing a valid single location', async () => {
      component.text.setValue('12r');
      await advanceDebounce();
      expect(component.location()).toEqual([
        { start: { n: 12, v: false }, end: { n: 12, v: false } },
      ]);
    });

    it('should not emit a new location while typing within the debounce window', async () => {
      component.text.setValue('12');
      // still well within the 300ms debounce window: no update yet
      await advanceDebounce(150);
      expect(component.location()).toBeNull();
      component.text.setValue('12r');
      // now let the (reset) debounce elapse
      await advanceDebounce();
      expect(component.location()).toEqual([
        { start: { n: 12, v: false }, end: { n: 12, v: false } },
      ]);
    });

    it('should set location to null when text is cleared and not required', async () => {
      component.text.setValue('12r');
      await advanceDebounce();
      expect(component.location()).toBeTruthy();

      component.text.setValue('');
      await advanceDebounce();
      expect(component.location()).toBeNull();
    });

    it('should leave location unchanged when text becomes invalid and non-empty', async () => {
      component.text.setValue('12r');
      await advanceDebounce();
      const before = component.location();

      // "12x" does not match the single-location pattern (x is not r/v/a-q)
      component.text.setValue('12x');
      await advanceDebounce();
      expect(component.location()).toEqual(before);
    });

    it('should not clear location when required and text is emptied', async () => {
      fixture.componentRef.setInput('required', true);
      fixture.detectChanges();

      component.text.setValue('12r');
      await advanceDebounce();
      const before = component.location();

      component.text.setValue('');
      await advanceDebounce();
      expect(component.location()).toEqual(before);
    });
  });
  //#endregion

  //#region form -> model sync (range mode)
  describe('form -> model sync (range mode)', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('single', false);
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should update location after debounce with a single range', async () => {
      component.text.setValue('1r-3v');
      await advanceDebounce();
      expect(component.location()).toEqual([
        { start: { n: 1, v: false }, end: { n: 3, v: true } },
      ]);
    });

    it('should update location after debounce with multiple ranges', async () => {
      component.text.setValue('1r-3v 4r 7r-11v');
      await advanceDebounce();
      const loc = component.location();
      expect(loc?.length).toBe(3);
      expect(loc![0]).toEqual({
        start: { n: 1, v: false },
        end: { n: 3, v: true },
      });
      expect(loc![1]).toEqual({
        start: { n: 4, v: false },
        end: { n: 4, v: false },
      });
      expect(loc![2]).toEqual({
        start: { n: 7, v: false },
        end: { n: 11, v: true },
      });
    });

    it('should not update location while text ends with a trailing space', async () => {
      component.text.setValue('1r-3v ');
      await advanceDebounce();
      expect(component.location()).toBeNull();
    });

    it('should not update location while text ends with a trailing dash', async () => {
      component.text.setValue('1r-3v 4r-');
      await advanceDebounce();
      expect(component.location()).toBeNull();
    });

    it('should resume updating once a trailing dash is completed into a range', async () => {
      component.text.setValue('1r-3v 4r-');
      await advanceDebounce();
      expect(component.location()).toBeNull();

      component.text.setValue('1r-3v 4r-6v');
      await advanceDebounce();
      const loc = component.location();
      expect(loc?.length).toBe(2);
      expect(loc![1]).toEqual({
        start: { n: 4, v: false },
        end: { n: 6, v: true },
      });
    });

    it('should set location to null when text is cleared and not required', async () => {
      component.text.setValue('1r-3v');
      await advanceDebounce();
      expect(component.location()).toBeTruthy();

      component.text.setValue('');
      await advanceDebounce();
      expect(component.location()).toBeNull();
    });

    it('should mark the control touched with an invalidLocation error when the text cannot be parsed into any range', async () => {
      // a token with two dashes is not blank, does not end with a
      // trailing space/dash, and cannot be split into a valid A-B pair
      component.text.setValue('1r-3v-5r');
      await advanceDebounce();
      expect(component.location()).toBeNull();
      expect(component.text.touched).toBe(true);
      expect(component.text.hasError('invalidLocation')).toBe(true);
    });
  });
  //#endregion

  describe('ngOnDestroy', () => {
    it('should stop reacting to further text changes after destroy', async () => {
      fixture.componentRef.setInput('single', true);
      fixture.detectChanges();

      component.ngOnDestroy();

      component.text.setValue('12r');
      await advanceDebounce();
      // no subscription anymore, so location was never updated
      expect(component.location()).toBeNull();
    });
  });
});
