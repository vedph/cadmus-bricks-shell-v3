import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { PhysicalMeasurementSetComponent } from './physical-measurement-set.component';
import { PhysicalMeasurement } from './physical-measurement-set.component';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

describe('PhysicalMeasurementSetComponent', () => {
  let component: PhysicalMeasurementSetComponent;
  let fixture: ComponentFixture<PhysicalMeasurementSetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhysicalMeasurementSetComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(PhysicalMeasurementSetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region defaults
  describe('defaults', () => {
    it('should default measurements to an empty array', () => {
      expect(component.measurements()).toEqual([]);
    });

    it('should default editedIndex to -1 and edited to undefined', () => {
      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toBeUndefined();
    });

    it('should default hasCustom to false and name/custom/batch to null', () => {
      expect(component.hasCustom.value).toBe(false);
      expect(component.name.value).toBeNull();
      expect(component.custom.value).toBeNull();
      expect(component.batch.value).toBeNull();
    });

    it('should default unitEntries to an empty array', () => {
      expect(component.unitEntries()).toEqual([]);
    });
  });
  //#endregion

  //#region hasCustom toggling
  describe('hasCustom toggling', () => {
    it('should disable the name control when hasCustom becomes true', () => {
      component.hasCustom.setValue(true);
      expect(component.name.disabled).toBe(true);
    });

    it('should re-enable the name control when hasCustom becomes false', () => {
      component.hasCustom.setValue(true);
      component.hasCustom.setValue(false);
      expect(component.name.disabled).toBe(false);
    });

    it('should focus the custom input once it is rendered and hasCustom becomes true', async () => {
      fixture.componentRef.setInput('nameEntries', [
        { id: 'width', value: 'Width' },
      ] as ThesaurusEntry[]);
      fixture.componentRef.setInput('allowCustomName', true);
      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(component.customCtl).toBeTruthy();
      const focusSpy = vi.spyOn(component.customCtl!.nativeElement, 'focus');

      component.hasCustom.setValue(true);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(focusSpy).toHaveBeenCalled();
    });
  });
  //#endregion

  //#region closeMeasurement / editMeasurement
  describe('closeMeasurement / editMeasurement', () => {
    beforeEach(() => {
      component.measurements.set([
        { name: 'width', value: 10, unit: 'cm' },
        { name: 'height', value: 5, unit: 'cm' },
      ]);
    });

    it('should select a measurement for editing and populate the edited form', () => {
      component.editMeasurement(1);

      expect(component.editedIndex()).toBe(1);
      expect(component.edited()).toEqual({
        name: 'height',
        value: 5,
        unit: 'cm',
      });
      expect(component.value.value).toBe(5);
      expect(component.unit.value).toBe('cm');
    });

    it('should do nothing when editing the already-edited index again', () => {
      component.editMeasurement(0);
      // dirty the edited-form value to detect whether a second call resets it
      component.value.setValue(999);

      component.editMeasurement(0);

      expect(component.value.value).toBe(999);
    });

    it('should close the editor and clear edited state', () => {
      component.editMeasurement(0);
      component.closeMeasurement();

      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toBeUndefined();
    });
  });
  //#endregion

  //#region addMeasurement (free-text name mode)
  describe('addMeasurement (free-text name mode)', () => {
    it('should do nothing when the name is empty', () => {
      component.name.setValue('');
      component.addMeasurement();
      expect(component.edited()).toBeUndefined();
    });

    it('should start editing a new measurement with the given name', () => {
      component.name.setValue('Diagonal');
      component.addMeasurement();

      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toEqual({
        name: 'Diagonal',
        value: 0,
        unit: 'cm',
      });
    });

    it('should reset the name control after adding (free-text mode)', () => {
      component.name.setValue('Diagonal');
      component.addMeasurement();
      expect(component.name.value).toBeNull();
    });

    it('should use defaultUnit when provided', async () => {
      fixture.componentRef.setInput('defaultUnit', 'mm');
      fixture.detectChanges();
      await fixture.whenStable();

      component.name.setValue('Diagonal');
      component.addMeasurement();

      expect(component.edited()?.unit).toBe('mm');
    });

    it('should fall back to the first unitEntries id when defaultUnit is not set', async () => {
      fixture.componentRef.setInput('unitEntries', [
        { id: 'in', value: 'inch' },
      ] as ThesaurusEntry[]);
      fixture.detectChanges();
      await fixture.whenStable();

      component.name.setValue('Diagonal');
      component.addMeasurement();

      expect(component.edited()?.unit).toBe('in');
    });

    it('should call preventDefault/stopPropagation when an event is passed', () => {
      component.name.setValue('Diagonal');
      const event = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as Event;

      component.addMeasurement(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should delegate to addCustomMeasurement when hasCustom is true', () => {
      component.hasCustom.setValue(true);
      component.custom.setValue('Custom name');

      component.addMeasurement();

      expect(component.edited()?.name).toBe('Custom name');
    });
  });
  //#endregion

  //#region addMeasurement (bound name mode)
  describe('addMeasurement (bound name mode)', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('nameEntries', [
        { id: 'width', value: 'Width' },
      ] as ThesaurusEntry[]);
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should not reset the name control after adding when nameEntries is bound', () => {
      component.name.setValue('width');
      component.addMeasurement();

      expect(component.name.value).toBe('width');
    });
  });
  //#endregion

  //#region addCustomMeasurement
  describe('addCustomMeasurement', () => {
    it('should do nothing when custom is empty', () => {
      component.custom.setValue('');
      component.addCustomMeasurement();
      expect(component.edited()).toBeUndefined();
    });

    it('should start editing a new measurement and reset the custom control', () => {
      component.custom.setValue('Custom name');
      component.addCustomMeasurement();

      expect(component.edited()).toEqual({
        name: 'Custom name',
        value: 0,
        unit: 'cm',
      });
      expect(component.custom.value).toBeNull();
    });

    it('should call preventDefault/stopPropagation when an event is passed', () => {
      component.custom.setValue('Custom name');
      const event = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as Event;

      component.addCustomMeasurement(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });
  //#endregion

  //#region addBatchMeasurements
  describe('addBatchMeasurements', () => {
    it('should do nothing when batch is empty', () => {
      component.batch.setValue('');
      component.addBatchMeasurements();
      expect(component.measurements()).toEqual([]);
    });

    it('should do nothing when no entry matches the expected format', () => {
      component.batch.setValue('bogus; also bogus');
      component.addBatchMeasurements();
      expect(component.measurements()).toEqual([]);
    });

    it('should parse a single measurement with explicit unit', () => {
      component.batch.setValue('width=10cm');
      component.addBatchMeasurements();

      expect(component.measurements()).toEqual([
        { name: 'width', value: 10, unit: 'cm', tag: undefined },
      ]);
    });

    it('should parse a measurement with a tag', () => {
      component.batch.setValue('depth=5mm (thickness)');
      component.addBatchMeasurements();

      expect(component.measurements()).toEqual([
        { name: 'depth', value: 5, unit: 'mm', tag: 'thickness' },
      ]);
    });

    it('should inherit the previous unit when omitted', () => {
      component.batch.setValue('width=10cm;height=20');
      component.addBatchMeasurements();

      expect(component.measurements()).toEqual([
        { name: 'width', value: 10, unit: 'cm', tag: undefined },
        { name: 'height', value: 20, unit: 'cm', tag: undefined },
      ]);
    });

    it('should skip an entry with no unit and no previous unit to inherit', () => {
      component.batch.setValue('height=20;width=10cm');
      component.addBatchMeasurements();

      // "height=20" has no unit and no previous unit yet => skipped
      expect(component.measurements()).toEqual([
        { name: 'width', value: 10, unit: 'cm', tag: undefined },
      ]);
    });

    it('should parse multiple entries with mixed units and tags', () => {
      component.batch.setValue(
        'width=10cm;height=20;depth=5mm (thickness)'
      );
      component.addBatchMeasurements();

      expect(component.measurements()).toEqual([
        { name: 'width', value: 10, unit: 'cm', tag: undefined },
        { name: 'height', value: 20, unit: 'cm', tag: undefined },
        { name: 'depth', value: 5, unit: 'mm', tag: 'thickness' },
      ]);
    });

    it('should append to existing measurements', () => {
      component.measurements.set([
        { name: 'existing', value: 1, unit: 'cm' },
      ]);
      component.batch.setValue('width=10cm');
      component.addBatchMeasurements();

      expect(component.measurements().length).toBe(2);
    });

    it('should remove existing measurements with the same name when distinct is true', async () => {
      component.measurements.set([{ name: 'width', value: 1, unit: 'cm' }]);
      fixture.componentRef.setInput('distinct', true);
      fixture.detectChanges();
      await fixture.whenStable();

      component.batch.setValue('width=99cm');
      component.addBatchMeasurements();

      expect(component.measurements()).toEqual([
        { name: 'width', value: 99, unit: 'cm', tag: undefined },
      ]);
    });

    it('should keep duplicate names when distinct is false', () => {
      component.measurements.set([{ name: 'width', value: 1, unit: 'cm' }]);
      component.batch.setValue('width=99cm');
      component.addBatchMeasurements();

      expect(component.measurements().length).toBe(2);
    });
  });
  //#endregion

  //#region saveMeasurement
  describe('saveMeasurement', () => {
    it('should append a new measurement when editedIndex is -1', () => {
      component.name.setValue('Diagonal');
      component.addMeasurement();
      component.value.setValue(15);
      component.unit.setValue('cm');
      component.tag.setValue('note');

      component.saveMeasurement();

      expect(component.measurements()).toEqual([
        { name: 'Diagonal', value: 15, unit: 'cm', tag: 'note' },
      ]);
    });

    it('should map an empty tag to undefined', () => {
      component.name.setValue('Diagonal');
      component.addMeasurement();
      component.value.setValue(15);
      component.unit.setValue('cm');
      component.tag.setValue('');

      component.saveMeasurement();

      expect(component.measurements()[0].tag).toBeUndefined();
    });

    it('should close the editor after saving', () => {
      component.name.setValue('Diagonal');
      component.addMeasurement();
      component.value.setValue(15);
      component.unit.setValue('cm');

      component.saveMeasurement();

      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toBeUndefined();
    });

    it('should replace the measurement at editedIndex when editing an existing one', () => {
      component.measurements.set([
        { name: 'width', value: 10, unit: 'cm' },
        { name: 'height', value: 5, unit: 'cm' },
      ]);
      component.editMeasurement(1);
      component.value.setValue(50);
      component.unit.setValue('mm');

      component.saveMeasurement();

      expect(component.measurements()).toEqual([
        { name: 'width', value: 10, unit: 'cm' },
        { name: 'height', value: 50, unit: 'mm', tag: undefined },
      ]);
    });

    it('should not delete the edited item itself when distinct is true', async () => {
      component.measurements.set([
        { name: 'width', value: 10, unit: 'cm' },
        { name: 'height', value: 5, unit: 'cm' },
      ]);
      fixture.componentRef.setInput('distinct', true);
      fixture.detectChanges();
      await fixture.whenStable();

      component.editMeasurement(0);
      component.value.setValue(20);
      component.unit.setValue('cm');

      component.saveMeasurement();

      expect(component.measurements().length).toBe(2);
      expect(component.measurements()[0]).toEqual({
        name: 'width',
        value: 20,
        unit: 'cm',
        tag: undefined,
      });
    });

    it('should replace an existing same-named measurement when distinct is true and a new one is added with a colliding name', async () => {
      component.measurements.set([
        { name: 'width', value: 10, unit: 'cm' },
        { name: 'height', value: 5, unit: 'cm' },
      ]);
      fixture.componentRef.setInput('distinct', true);
      fixture.detectChanges();
      await fixture.whenStable();

      // add a brand-new measurement (editedIndex stays -1) whose name
      // collides with the existing 'width' entry
      component.name.setValue('width');
      component.addMeasurement();
      component.value.setValue(999);
      component.unit.setValue('in');

      component.saveMeasurement();

      const result = component.measurements();
      // the stale duplicate 'width' entry must be removed, keeping only
      // the freshly-saved one plus the untouched 'height' entry
      expect(result.filter((m) => m.name === 'width').length).toBe(1);
      expect(result).toEqual([
        { name: 'height', value: 5, unit: 'cm' },
        { name: 'width', value: 999, unit: 'in', tag: undefined },
      ]);
    });

    it('should keep duplicate names when distinct is false even on a colliding add', () => {
      component.measurements.set([
        { name: 'width', value: 10, unit: 'cm' },
        { name: 'height', value: 5, unit: 'cm' },
      ]);

      component.name.setValue('width');
      component.addMeasurement();
      component.value.setValue(999);
      component.unit.setValue('in');

      component.saveMeasurement();

      const result = component.measurements();
      expect(result.filter((m) => m.name === 'width').length).toBe(2);
      expect(result.length).toBe(3);
    });
  });
  //#endregion

  //#region onDimensionChange
  describe('onDimensionChange', () => {
    it('should merge dimension changes into the edited measurement, keeping its name', () => {
      component.name.setValue('Diagonal');
      component.addMeasurement();

      component.onDimensionChange({ value: 42, unit: 'mm', tag: 'x' });

      expect(component.edited()).toEqual({
        name: 'Diagonal',
        value: 42,
        unit: 'mm',
        tag: 'x',
      });
    });
  });
  //#endregion

  //#region move / delete
  describe('moveMeasurementUp / moveMeasurementDown / deleteMeasurement', () => {
    beforeEach(() => {
      component.measurements.set([
        { name: 'a', value: 1, unit: 'cm' },
        { name: 'b', value: 2, unit: 'cm' },
        { name: 'c', value: 3, unit: 'cm' },
      ] as PhysicalMeasurement[]);
    });

    it('should not move the first item up', () => {
      component.moveMeasurementUp(0);
      expect(component.measurements().map((m) => m.name)).toEqual([
        'a',
        'b',
        'c',
      ]);
    });

    it('should move an item up', () => {
      component.moveMeasurementUp(1);
      expect(component.measurements().map((m) => m.name)).toEqual([
        'b',
        'a',
        'c',
      ]);
    });

    it('should not move the last item down', () => {
      component.moveMeasurementDown(2);
      expect(component.measurements().map((m) => m.name)).toEqual([
        'a',
        'b',
        'c',
      ]);
    });

    it('should move an item down', () => {
      component.moveMeasurementDown(0);
      expect(component.measurements().map((m) => m.name)).toEqual([
        'b',
        'a',
        'c',
      ]);
    });

    it('should delete an item', () => {
      component.deleteMeasurement(1);
      expect(component.measurements().map((m) => m.name)).toEqual([
        'a',
        'c',
      ]);
    });
  });
  //#endregion

  //#region ngOnDestroy
  describe('ngOnDestroy', () => {
    it('should unsubscribe from hasCustom changes', () => {
      component.ngOnDestroy();
      expect(() => component.hasCustom.setValue(true)).not.toThrow();
    });
  });
  //#endregion

  //#region template
  describe('template', () => {
    it('should render a row per measurement', async () => {
      component.measurements.set([
        { name: 'width', value: 10, unit: 'cm' },
        { name: 'height', value: 5, unit: 'cm' },
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
    });

    it('should not render a table when there are no measurements', () => {
      const table = fixture.nativeElement.querySelector('table');
      expect(table).toBeFalsy();
    });

    it('should disable the add button until a name is provided', () => {
      const addBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[matTooltip="Add measure"]'
      );
      expect(addBtn.disabled).toBe(true);
    });

    it('should disable the batch add button until batch has a value', () => {
      const batchBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[matTooltip="Add batch measurements"]'
      );
      expect(batchBtn.disabled).toBe(true);
    });

    it('should show the editor panel once a measurement is being edited', async () => {
      component.name.setValue('Diagonal');
      component.addMeasurement();
      fixture.detectChanges();
      await fixture.whenStable();

      const panel = fixture.nativeElement.querySelector('mat-expansion-panel');
      expect(panel).toBeTruthy();
    });

    it('should disable move-up on the first row and move-down on the last row', async () => {
      component.measurements.set([
        { name: 'a', value: 1, unit: 'cm' },
        { name: 'b', value: 2, unit: 'cm' },
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      const upButtons: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll(
          'button[matTooltip="Move measure up"]'
        )
      );
      const downButtons: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll(
          'button[matTooltip="Move measure down"]'
        )
      );

      expect(upButtons[0].disabled).toBe(true);
      expect(upButtons[1].disabled).toBe(false);
      expect(downButtons[0].disabled).toBe(false);
      expect(downButtons[1].disabled).toBe(true);
    });

    it('should delete a measurement when the delete button is clicked', async () => {
      component.measurements.set([{ name: 'a', value: 1, unit: 'cm' }]);
      fixture.detectChanges();
      await fixture.whenStable();

      const delBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[matTooltip="Remove measure"]'
      );
      delBtn.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.measurements()).toEqual([]);
    });
  });
  //#endregion
});
