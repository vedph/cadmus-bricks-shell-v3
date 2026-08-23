import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { PhysicalSizeComponent } from './physical-size.component';

describe('PhysicalSizeComponent', () => {
  let component: PhysicalSizeComponent;
  let fixture: ComponentFixture<PhysicalSizeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhysicalSizeComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(PhysicalSizeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region defaults
  describe('defaults', () => {
    it('should default size to undefined', () => {
      expect(component.size()).toBeUndefined();
    });

    it('should default the unit inputs to cm', () => {
      expect(component.defaultWUnit()).toBe('cm');
      expect(component.defaultHUnit()).toBe('cm');
      expect(component.defaultDUnit()).toBe('cm');
    });

    it('should default hBeforeW to false', () => {
      expect(component.hBeforeW()).toBe(false);
    });

    it('should initialize dimension controls with default units', () => {
      expect(component.form.wValue().value()).toBe(0);
      expect(component.form.wUnit().value()).toBe('cm');
      expect(component.form.hValue().value()).toBe(0);
      expect(component.form.hUnit().value()).toBe('cm');
      expect(component.form.dValue().value()).toBe(0);
      expect(component.form.dUnit().value()).toBe('cm');
    });

    it('should be valid initially (no dimension has a value)', () => {
      expect(component.form().valid()).toBe(true);
    });

    it('should compute an empty label initially', () => {
      expect(component.label()).toBe('');
    });
  });
  //#endregion

  //#region model -> form sync
  describe('model -> form sync', () => {
    it('should populate the form when size is set', async () => {
      fixture.componentRef.setInput('size', {
        tag: 'overall',
        w: { value: 20, unit: 'cm', tag: 'w-tag' },
        h: { value: 10, unit: 'cm', tag: 'h-tag' },
        note: 'a note',
      });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.form.tag().value()).toBe('overall');
      expect(component.form.wValue().value()).toBe(20);
      expect(component.form.wUnit().value()).toBe('cm');
      expect(component.form.wTag().value()).toBe('w-tag');
      expect(component.form.hValue().value()).toBe(10);
      expect(component.form.hUnit().value()).toBe('cm');
      expect(component.form.hTag().value()).toBe('h-tag');
      expect(component.form.note().value()).toBe('a note');
      // depth not set => reset to defaults
      expect(component.form.dValue().value()).toBe(0);
      expect(component.form.dUnit().value()).toBe('cm');
      expect(component.form().dirty()).toBe(false);
    });

    it('should fall back to the default unit when a dimension has no unit', async () => {
      fixture.componentRef.setInput('size', {
        w: { value: 20, unit: '' },
        h: { value: 10, unit: 'mm' },
      });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.form.wUnit().value()).toBe('cm');
      expect(component.form.hUnit().value()).toBe('mm');
    });

    it('should reset width fields to defaults when w is absent', async () => {
      fixture.componentRef.setInput('size', {
        h: { value: 10, unit: 'mm' },
      });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.form.wValue().value()).toBe(0);
      expect(component.form.wUnit().value()).toBe('cm');
    });

    it('should reset the whole form when size is set back to undefined', async () => {
      fixture.componentRef.setInput('size', {
        tag: 'overall',
        w: { value: 20, unit: 'mm' },
        h: { value: 10, unit: 'mm' },
        note: 'a note',
      });
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentRef.setInput('size', undefined);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.form.wValue().value()).toBe(0);
      expect(component.form.wUnit().value()).toBe('cm');
      expect(component.form.hValue().value()).toBe(0);
      expect(component.form.hUnit().value()).toBe('cm');
      expect(component.form.dValue().value()).toBe(0);
      expect(component.form.dUnit().value()).toBe('cm');
      expect(component.form.tag().value()).toBe('');
      expect(component.form.note().value()).toBe('');
    });
  });
  //#endregion

  //#region validateUnit
  describe('unit validator', () => {
    it('should require a unit for width when width has a value', () => {
      component.form.wValue().value.set(10);
      component.form.wUnit().value.set('');
      expect(component.form().getError('unit')).toBeDefined();
    });

    it('should require a unit for height when height has a value', () => {
      component.form.hValue().value.set(10);
      component.form.hUnit().value.set('');
      expect(component.form().getError('unit')).toBeDefined();
    });

    it('should require a unit for depth when depth has a value', () => {
      component.form.dValue().value.set(10);
      component.form.dUnit().value.set('');
      expect(component.form().getError('unit')).toBeDefined();
    });

    it('should be valid when every non-zero dimension has a unit', () => {
      component.form.wValue().value.set(10);
      component.form.wUnit().value.set('cm');
      component.form.hValue().value.set(5);
      component.form.hUnit().value.set('cm');
      expect(component.form().getError('unit')).toBeUndefined();
    });
  });
  //#endregion

  //#region parseText
  describe('parseText', () => {
    it('should do nothing when text is empty', () => {
      const before = component.size();
      component.textForm.text().value.set('');
      component.parseText();
      expect(component.size()).toBe(before);
    });

    it('should do nothing when text cannot be parsed', () => {
      const before = component.size();
      component.textForm.text().value.set('not a valid size');
      component.parseText();
      expect(component.size()).toBe(before);
    });

    it('should update the model and form fields from valid text', () => {
      component.textForm.text().value.set('20cm x 10mm');
      component.parseText();

      expect(component.size()).toEqual({
        w: { value: 20, unit: 'cm' },
        h: { value: 10, unit: 'mm' },
      });
      expect(component.form.wValue().value()).toBe(20);
      expect(component.form.wUnit().value()).toBe('cm');
      expect(component.form.hValue().value()).toBe(10);
      expect(component.form.hUnit().value()).toBe('mm');
    });

    it('should respect hBeforeW when parsing', async () => {
      fixture.componentRef.setInput('hBeforeW', true);
      fixture.detectChanges();
      await fixture.whenStable();

      component.textForm.text().value.set('10cm x 20cm');
      component.parseText();

      expect(component.size()!.h).toEqual({ value: 10, unit: 'cm' });
      expect(component.size()!.w).toEqual({ value: 20, unit: 'cm' });
    });

    it('should call preventDefault and stopPropagation when an event is passed', () => {
      component.textForm.text().value.set('20cm x 10cm');
      const event = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as Event;

      component.parseText(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should not throw when no event is passed and text is empty', () => {
      component.textForm.text().value.set('');
      expect(() => component.parseText()).not.toThrow();
    });
  });
  //#endregion

  //#region label
  describe('label', () => {
    it('should show a single dimension with its unit', async () => {
      // signal-form field reads are directly reactive, so the label
      // computed updates immediately on direct field writes (unlike the
      // old FormGroup-based version, which needed the debounced
      // valueChanges pipeline to bump a manual "form changed" signal
      // before the label recomputed)
      component.form.wValue().value.set(20);
      component.form.wUnit().value.set('cm');
      component.form.hValue().value.set(0);

      expect(component.label()).toBe('20.00 cm');
    });

    it('should collapse identical units into a single trailing unit', () => {
      component.textForm.text().value.set('20cm x 10cm');
      component.parseText();
      expect(component.label()).toBe('20.00 × 10.00 cm');
    });

    it('should show per-dimension units when they differ', () => {
      component.textForm.text().value.set('20cm x 10mm');
      component.parseText();
      expect(component.label()).toBe('20.00 cm × 10.00 mm');
    });

    it('should include depth when present', () => {
      component.textForm.text().value.set('20cm x 10cm x 5cm');
      component.parseText();
      expect(component.label()).toBe('20.00 × 10.00 × 5.00 cm');
    });

    it('should respect hBeforeW ordering', async () => {
      fixture.componentRef.setInput('hBeforeW', true);
      fixture.detectChanges();
      await fixture.whenStable();

      component.textForm.text().value.set('10cm x 20cm');
      component.parseText();
      // hBeforeW: first number is h, second is w; label puts h before w
      expect(component.label()).toBe('10.00 × 20.00 cm');
    });
  });
  //#endregion

  //#region form -> model sync (debounced)
  // fakeAsync/tick are not available under this workspace's zoneless
  // vitest test runner, so debounced behavior is exercised with real
  // timers instead.
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  describe('form -> model sync (debounced)', () => {
    it('should update the model after the debounce period', async () => {
      component.form.wValue().value.set(20);
      component.form.wUnit().value.set('cm');
      component.form.hValue().value.set(10);
      component.form.hUnit().value.set('cm');
      await delay(500);

      expect(component.size()?.w).toEqual({ value: 20, unit: 'cm', tag: undefined });
      expect(component.size()?.h).toEqual({ value: 10, unit: 'cm', tag: undefined });
    });

    it('should trim the overall tag and note when building the model', async () => {
      component.form.wValue().value.set(20);
      component.form.wUnit().value.set('cm');
      component.form.hValue().value.set(10);
      component.form.hUnit().value.set('cm');
      component.form.tag().value.set('  overall  ');
      component.form.note().value.set('  a note  ');
      await delay(500);

      expect(component.size()?.tag).toBe('overall');
      expect(component.size()?.note).toBe('a note');
    });

    it('should leave w/h/d undefined in the model when their value is 0', async () => {
      component.form.tag().value.set('just-a-tag');
      await delay(500);

      expect(component.size()?.w).toBeUndefined();
      expect(component.size()?.h).toBeUndefined();
      expect(component.size()?.d).toBeUndefined();
    });

    it('should update the text field once the model becomes valid', async () => {
      component.form.wValue().value.set(20);
      component.form.wUnit().value.set('cm');
      component.form.hValue().value.set(10);
      component.form.hUnit().value.set('cm');
      await delay(500);

      expect(component.textForm.text().value()).toBe('20cm x 10cm');
    });
  });
  //#endregion

  //#region template
  describe('template', () => {
    it('should disable the parse button when text is empty', () => {
      const btn: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[matTooltip="Parse size from text"]'
      );
      expect(btn.disabled).toBe(true);
    });

    it('should enable the parse button when text has a value', async () => {
      component.textForm.text().value.set('20cm x 10cm');
      fixture.detectChanges();
      await fixture.whenStable();

      const btn: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[matTooltip="Parse size from text"]'
      );
      expect(btn.disabled).toBe(false);
    });

    it('should toggle the visual editor panel expansion state', async () => {
      expect(component.visualExpanded()).toBe(false);

      const toggleBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[matTooltip="Toggle visual editor"]'
      );
      toggleBtn.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.visualExpanded()).toBe(true);
    });

    it('should render a free-text tag input when tagEntries is not set', () => {
      const tagSelect = fixture.nativeElement.querySelector(
        '.main-tag mat-select',
      );
      const tagInput = fixture.nativeElement.querySelector('.main-tag input');
      expect(tagSelect).toBeFalsy();
      expect(tagInput).toBeTruthy();
    });

    it('should render a bound tag select when tagEntries is set', async () => {
      fixture.componentRef.setInput('tagEntries', [
        { id: 't1', value: 'Tag 1' },
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      const tagSelect = fixture.nativeElement.querySelector('.tag mat-select');
      expect(tagSelect).toBeTruthy();
    });

    it('should hide the tag field when hideTag is true', async () => {
      fixture.componentRef.setInput('hideTag', true);
      fixture.detectChanges();
      await fixture.whenStable();

      const tagField = fixture.nativeElement.querySelector('.main-tag');
      expect(tagField).toBeFalsy();
    });
  });
  //#endregion

  //#region ngOnDestroy
  describe('ngOnDestroy', () => {
    it('should unsubscribe and stop syncing form changes to the model', async () => {
      component.ngOnDestroy();

      component.form.wValue().value.set(20);
      component.form.wUnit().value.set('cm');
      component.form.hValue().value.set(10);
      component.form.hUnit().value.set('cm');
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(component.size()).toBeUndefined();
    });
  });
  //#endregion
});
