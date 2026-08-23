import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { PhysicalDimensionComponent } from './physical-dimension.component';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

describe('PhysicalDimensionComponent', () => {
  let component: PhysicalDimensionComponent;
  let fixture: ComponentFixture<PhysicalDimensionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhysicalDimensionComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(PhysicalDimensionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region defaults
  describe('defaults', () => {
    it('should default dimension to undefined', () => {
      expect(component.dimension()).toBeUndefined();
    });

    it('should default unitEntries to cm/mm', () => {
      expect(component.unitEntries()).toEqual([
        { id: 'cm', value: 'cm' },
        { id: 'mm', value: 'mm' },
      ]);
    });

    it('should default unitDisabled to false', () => {
      expect(component.unitDisabled()).toBe(false);
    });

    it('should default disabled, hideTag, tagEntries, label to undefined', () => {
      expect(component.disabled()).toBeUndefined();
      expect(component.hideTag()).toBeUndefined();
      expect(component.tagEntries()).toBeUndefined();
      expect(component.label()).toBeUndefined();
    });

    it('should initialize the form with value=0, unit=null, tag=""', () => {
      expect(component.form.value().value()).toBe(0);
      expect(component.form.unit().value()).toBeNull();
      expect(component.form.tag().value()).toBe('');
    });

    it('should require unit', () => {
      expect(component.form.unit().getError('required')).toBeDefined();
    });

    it('should apply maxLength(50) to tag', () => {
      component.form.tag().value.set('x'.repeat(51));
      expect(component.form.tag().getError('maxLength')).toBeDefined();
      component.form.tag().value.set('x'.repeat(50));
      expect(component.form.tag().getError('maxLength')).toBeUndefined();
    });
  });
  //#endregion

  //#region model -> form sync
  describe('model -> form sync', () => {
    it('should populate the form when dimension is set', async () => {
      fixture.componentRef.setInput('dimension', {
        value: 12.5,
        unit: 'cm',
        tag: 'note',
      });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.form.value().value()).toBe(12.5);
      expect(component.form.unit().value()).toBe('cm');
      expect(component.form.tag().value()).toBe('note');
      expect(component.form().dirty()).toBe(false);
    });

    it('should default tag to empty string when dimension has no tag', async () => {
      fixture.componentRef.setInput('dimension', { value: 5, unit: 'mm' });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.form.tag().value()).toBe('');
    });

    it('should reset the form when dimension is set back to undefined', async () => {
      fixture.componentRef.setInput('dimension', {
        value: 12.5,
        unit: 'cm',
        tag: 'note',
      });
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentRef.setInput('dimension', undefined);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.form.value().value()).toBe(0);
      expect(component.form.unit().value()).toBeNull();
      expect(component.form.tag().value()).toBe('');
    });
  });
  //#endregion

  //#region disabled / unitDisabled logic
  describe('disabled logic', () => {
    it('should disable the whole form when disabled is true', async () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.form.value().disabled()).toBe(true);
      expect(component.form.unit().disabled()).toBe(true);
      expect(component.form.tag().disabled()).toBe(true);
    });

    it('should re-enable the form when disabled becomes false', async () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.form.value().disabled()).toBe(false);
    });
  });

  describe('unitDisabled logic', () => {
    it('should leave unit enabled by default', () => {
      expect(component.form.unit().disabled()).toBe(false);
    });

    it('should disable only the unit control when unitDisabled is true', async () => {
      fixture.componentRef.setInput('unitDisabled', true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.form.unit().disabled()).toBe(true);
      expect(component.form.value().disabled()).toBe(false);
      expect(component.form.tag().disabled()).toBe(false);
    });

    it('should re-enable unit when unitDisabled becomes false', async () => {
      fixture.componentRef.setInput('unitDisabled', true);
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentRef.setInput('unitDisabled', false);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.form.unit().disabled()).toBe(false);
    });
  });
  //#endregion

  //#region save
  describe('save', () => {
    it('should mark all controls touched and not emit when the form is invalid', () => {
      const spy = vi.fn();
      component.dimension.subscribe(spy);

      component.form.value().value.set(10);
      // unit left null => required error
      component.save();

      expect(component.form.unit().touched()).toBe(true);
      expect(spy).not.toHaveBeenCalled();
      expect(component.dimension()).toBeUndefined();
    });

    it('should set the model and emit dimensionChange when the form is valid', () => {
      const spy = vi.fn();
      component.dimension.subscribe(spy);

      component.form.value().value.set(10);
      component.form.unit().value.set('cm');
      component.form.tag().value.set('note');

      component.save();

      expect(component.dimension()).toEqual({
        value: 10,
        unit: 'cm',
        tag: 'note',
      });
      expect(spy).toHaveBeenCalledWith({ value: 10, unit: 'cm', tag: 'note' });
    });

    it('should map an empty tag to undefined', () => {
      component.form.value().value.set(10);
      component.form.unit().value.set('cm');
      component.form.tag().value.set('');

      component.save();

      expect(component.dimension()).toEqual({
        value: 10,
        unit: 'cm',
        tag: undefined,
      });
    });

    it('should default value to 0 when value control is falsy', () => {
      component.form.value().value.set(0);
      component.form.unit().value.set('mm');

      component.save();

      expect(component.dimension()?.value).toBe(0);
    });

    it('should mark the form pristine synchronously when pristine=true (default)', () => {
      component.form.value().value.set(10);
      component.form.unit().value.set('cm');
      // setting the value alone does not dirty a signal form field; that
      // only happens through UI interaction (or an explicit mark call)
      component.form().markAsDirty();
      expect(component.form().dirty()).toBe(true);

      component.save();

      expect(component.form().dirty()).toBe(false);
    });

    it('should leave the form dirty synchronously when pristine=false is passed', () => {
      component.form.value().value.set(10);
      component.form.unit().value.set('cm');
      component.form().markAsDirty();

      component.save(false);

      // synchronously (before the model -> form sync effect flushes),
      // the form should remain dirty since pristine=false was requested.
      expect(component.form().dirty()).toBe(true);
    });
  });
  //#endregion

  //#region cancel
  describe('cancel', () => {
    it('should emit cancelEdit', () => {
      const spy = vi.fn();
      component.cancelEdit.subscribe(spy);

      component.cancel();

      expect(spy).toHaveBeenCalled();
    });
  });
  //#endregion

  //#region template
  describe('template', () => {
    it('should not render a label span when label is not set', () => {
      const span = fixture.nativeElement.querySelector('form > span');
      expect(span).toBeFalsy();
    });

    it('should render the label when set', async () => {
      fixture.componentRef.setInput('label', 'Width');
      fixture.detectChanges();
      await fixture.whenStable();

      const span: HTMLElement = fixture.nativeElement.querySelector(
        'form > span'
      );
      expect(span?.textContent).toBe('Width');
    });

    it('should render unit options from unitEntries once the panel is opened', async () => {
      // mat-select options are portaled into a CDK overlay attached to
      // document.body, and only rendered once the panel is opened
      const trigger: HTMLElement = fixture.nativeElement.querySelector(
        '.unit mat-select'
      );
      trigger.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const options = document.querySelectorAll('mat-option');
      // cm, mm (default unitEntries)
      expect(options.length).toBe(2);
    });

    it('should render a free-text tag input when tagEntries is not set', () => {
      const tagSelect = fixture.nativeElement.querySelector(
        '.tag mat-select'
      );
      const tagInput = fixture.nativeElement.querySelector(
        '.tag input'
      );
      expect(tagSelect).toBeFalsy();
      expect(tagInput).toBeTruthy();
    });

    it('should render a bound tag select when tagEntries is set', async () => {
      const entries: ThesaurusEntry[] = [
        { id: 't1', value: 'Tag 1' },
        { id: 't2', value: 'Tag 2' },
      ];
      fixture.componentRef.setInput('tagEntries', entries);
      fixture.detectChanges();
      await fixture.whenStable();

      const tagSelect = fixture.nativeElement.querySelector(
        '.tag mat-select'
      );
      expect(tagSelect).toBeTruthy();
    });

    it('should hide the tag field entirely when hideTag is true', async () => {
      fixture.componentRef.setInput('hideTag', true);
      fixture.detectChanges();
      await fixture.whenStable();

      const tagField = fixture.nativeElement.querySelector('.tag');
      expect(tagField).toBeFalsy();
    });

    it('should disable the save button while the form is invalid or pristine', () => {
      const saveBtn: HTMLButtonElement =
        fixture.nativeElement.querySelector('button[type="submit"]');
      expect(saveBtn.disabled).toBe(true);
    });

    it('should enable the save button once the form is valid and dirty', async () => {
      component.form.value().value.set(10);
      component.form.unit().value.set('cm');
      component.form().markAsDirty();
      fixture.detectChanges();
      await fixture.whenStable();

      const saveBtn: HTMLButtonElement =
        fixture.nativeElement.querySelector('button[type="submit"]');
      expect(saveBtn.disabled).toBe(false);
    });

    it('should invoke cancel() when the cancel button is clicked', () => {
      const spy = vi.spyOn(component, 'cancel');
      const cancelBtn: HTMLButtonElement =
        fixture.nativeElement.querySelector('button[type="button"]');
      cancelBtn.click();
      expect(spy).toHaveBeenCalled();
    });
  });
  //#endregion
});
