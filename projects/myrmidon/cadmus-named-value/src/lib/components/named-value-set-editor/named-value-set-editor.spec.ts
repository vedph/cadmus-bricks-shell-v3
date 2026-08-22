import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NamedValueSetEditor } from './named-value-set-editor';
import { NamedValue } from '../../models';

describe('NamedValueSetEditor', () => {
  let component: NamedValueSetEditor;
  let fixture: ComponentFixture<NamedValueSetEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NamedValueSetEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(NamedValueSetEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default valueFilterThreshold to 10 and batchMode to false', () => {
    expect(component.valueFilterThreshold()).toBe(10);
    expect(component.batchMode()).toBe(false);
    expect(component.hasPrefix()).toBe(false);
    expect(component.multiValuedNames()).toEqual([]);
  });

  it('should start with an empty filtered list', () => {
    expect(component.filteredValues()).toEqual([]);
    expect(component.showFilter()).toBe(false);
    expect(component.editedValue()).toBeUndefined();
    expect(component.editedIndex()).toBe(-1);
  });

  it('should sync the working list with the bound values', async () => {
    const values: NamedValue[] = [
      { name: 'a', value: '1' },
      { name: 'b', value: '2' },
    ];
    component.values.set(values);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.filteredValues()).toEqual(values);
  });

  it('should treat an undefined values input as an empty list', async () => {
    component.values.set([{ name: 'a', value: '1' }]);
    fixture.detectChanges();
    await fixture.whenStable();

    component.values.set(undefined);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.filteredValues()).toEqual([]);
  });

  it('should open the editor on a new empty value via addValue', () => {
    component.addValue();

    expect(component.editedValue()).toEqual({ name: '', value: '' });
    expect(component.editedIndex()).toBe(-1);
  });

  it('should open the editor on an existing value via editValue', async () => {
    const values: NamedValue[] = [
      { name: 'a', value: '1' },
      { name: 'b', value: '2' },
    ];
    component.values.set(values);
    fixture.detectChanges();
    await fixture.whenStable();

    const item = component.filteredValues()[1];
    component.editValue(item);

    expect(component.editedValue()).toEqual({ name: 'b', value: '2' });
    // it's a copy, not the same reference
    expect(component.editedValue()).not.toBe(item);
    expect(component.editedIndex()).toBe(1);
  });

  it('should append a new value and commit it via onValueChange when adding', async () => {
    component.values.set([{ name: 'a', value: '1' }]);
    fixture.detectChanges();
    await fixture.whenStable();

    component.addValue();
    component.onValueChange({ name: 'b', value: '2' });

    expect(component.filteredValues()).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: '2' },
    ]);
    expect(component.values()).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: '2' },
    ]);
    expect(component.editedIndex()).toBe(1);
  });

  it('should update an existing value at its index via onValueChange when editing', async () => {
    const values: NamedValue[] = [
      { name: 'a', value: '1' },
      { name: 'b', value: '2' },
    ];
    component.values.set(values);
    fixture.detectChanges();
    await fixture.whenStable();

    const item = component.filteredValues()[0];
    component.editValue(item);
    component.onValueChange({ name: 'a', value: 'updated' });

    expect(component.filteredValues()).toEqual([
      { name: 'a', value: 'updated' },
      { name: 'b', value: '2' },
    ]);
    expect(component.values()).toEqual([
      { name: 'a', value: 'updated' },
      { name: 'b', value: '2' },
    ]);
  });

  it('should do nothing when onValueChange receives undefined', async () => {
    component.values.set([{ name: 'a', value: '1' }]);
    fixture.detectChanges();
    await fixture.whenStable();

    component.onValueChange(undefined);

    expect(component.filteredValues()).toEqual([{ name: 'a', value: '1' }]);
    expect(component.editedValue()).toBeUndefined();
  });

  it('should remove an item and commit via deleteValue', async () => {
    const values: NamedValue[] = [
      { name: 'a', value: '1' },
      { name: 'b', value: '2' },
    ];
    component.values.set(values);
    fixture.detectChanges();
    await fixture.whenStable();

    const item = component.filteredValues()[0];
    component.deleteValue(item);

    expect(component.filteredValues()).toEqual([{ name: 'b', value: '2' }]);
    expect(component.values()).toEqual([{ name: 'b', value: '2' }]);
  });

  it('should do nothing when deleting an item not in the list', async () => {
    component.values.set([{ name: 'a', value: '1' }]);
    fixture.detectChanges();
    await fixture.whenStable();

    component.deleteValue({ name: 'x', value: 'y' });

    expect(component.filteredValues()).toEqual([{ name: 'a', value: '1' }]);
  });

  it('should close the editor when deleting the item currently being edited', async () => {
    const values: NamedValue[] = [
      { name: 'a', value: '1' },
      { name: 'b', value: '2' },
    ];
    component.values.set(values);
    fixture.detectChanges();
    await fixture.whenStable();

    const item = component.filteredValues()[1];
    component.editValue(item);
    component.deleteValue(item);

    expect(component.editedValue()).toBeUndefined();
    expect(component.editedIndex()).toBe(-1);
  });

  it('should shift the edited index down when deleting an earlier item', async () => {
    const values: NamedValue[] = [
      { name: 'a', value: '1' },
      { name: 'b', value: '2' },
      { name: 'c', value: '3' },
    ];
    component.values.set(values);
    fixture.detectChanges();
    await fixture.whenStable();

    component.editValue(component.filteredValues()[2]); // editing 'c' at index 2
    component.deleteValue(component.filteredValues()[0]); // delete 'a' at index 0

    // 'c' is now at index 1
    expect(component.editedValue()?.name).toBe('c');
    expect(component.editedIndex()).toBe(1);
  });

  it('should close the editor via closeValueEditor without touching the list', async () => {
    component.values.set([{ name: 'a', value: '1' }]);
    fixture.detectChanges();
    await fixture.whenStable();

    component.addValue();
    component.closeValueEditor();

    expect(component.editedValue()).toBeUndefined();
    expect(component.editedIndex()).toBe(-1);
    expect(component.filteredValues()).toEqual([{ name: 'a', value: '1' }]);
  });

  describe('batch mode', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('batchMode', true);
    });

    it('should not commit to values until save is called', async () => {
      component.values.set([{ name: 'a', value: '1' }]);
      fixture.detectChanges();
      await fixture.whenStable();

      component.addValue();
      component.onValueChange({ name: 'b', value: '2' });
      fixture.detectChanges();
      await fixture.whenStable();

      // working list reflects the edit locally...
      expect(component.filteredValues()).toEqual([
        { name: 'a', value: '1' },
        { name: 'b', value: '2' },
      ]);
      // ...but the bound values are untouched until save()
      expect(component.values()).toEqual([{ name: 'a', value: '1' }]);
    });

    it('should commit the working list to values and close the editor on save', async () => {
      component.values.set([{ name: 'a', value: '1' }]);
      fixture.detectChanges();
      await fixture.whenStable();

      component.addValue();
      component.onValueChange({ name: 'b', value: '2' });
      component.save();

      expect(component.values()).toEqual([
        { name: 'a', value: '1' },
        { name: 'b', value: '2' },
      ]);
      expect(component.editedValue()).toBeUndefined();
    });

    it('should discard unsaved edits, revert to bound values, close and emit close on closeBatch', async () => {
      component.values.set([{ name: 'a', value: '1' }]);
      fixture.detectChanges();
      await fixture.whenStable();

      let closed = false;
      component.close.subscribe(() => (closed = true));

      component.addValue();
      component.onValueChange({ name: 'b', value: '2' });
      component.closeBatch();

      expect(component.filteredValues()).toEqual([{ name: 'a', value: '1' }]);
      expect(component.values()).toEqual([{ name: 'a', value: '1' }]);
      expect(component.editedValue()).toBeUndefined();
      expect(closed).toBe(true);
    });

    it('should not clobber unsaved dirty edits when the bound values signal is merely re-read', async () => {
      component.values.set([{ name: 'a', value: '1' }]);
      fixture.detectChanges();
      await fixture.whenStable();

      component.addValue();
      component.onValueChange({ name: 'b', value: '2' });
      fixture.detectChanges();
      await fixture.whenStable();

      // working list still has the dirty local addition
      expect(component.filteredValues()).toEqual([
        { name: 'a', value: '1' },
        { name: 'b', value: '2' },
      ]);
    });
  });

  describe('filter', () => {
    it('should not show the filter when under the threshold', async () => {
      fixture.componentRef.setInput('valueFilterThreshold', 2);
      component.values.set([{ name: 'a', value: '1' }]);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.showFilter()).toBe(false);
    });

    it('should show the filter when the list exceeds the threshold', async () => {
      fixture.componentRef.setInput('valueFilterThreshold', 1);
      component.values.set([
        { name: 'apple', value: '1' },
        { name: 'banana', value: '2' },
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.showFilter()).toBe(true);
    });

    it('should filter values by name case-insensitively when the filter is active', async () => {
      fixture.componentRef.setInput('valueFilterThreshold', 1);
      component.values.set([
        { name: 'Apple', value: '1' },
        { name: 'Banana', value: '2' },
        { name: 'Apricot', value: '3' },
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      component.filter.set('ap');

      expect(component.filteredValues()).toEqual([
        { name: 'Apple', value: '1' },
        { name: 'Apricot', value: '3' },
      ]);
    });

    it('should ignore filter text when the filter is not shown', async () => {
      component.values.set([{ name: 'apple', value: '1' }]);
      fixture.detectChanges();
      await fixture.whenStable();

      component.filter.set('zzz-no-match');

      expect(component.filteredValues()).toEqual([
        { name: 'apple', value: '1' },
      ]);
    });

    it('should reflect the edited index within the filtered results', async () => {
      fixture.componentRef.setInput('valueFilterThreshold', 1);
      component.values.set([
        { name: 'apple', value: '1' },
        { name: 'banana', value: '2' },
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      const banana = component.filteredValues()[1];
      component.editValue(banana);
      component.filter.set('ban');

      expect(component.filteredValues()).toEqual([
        { name: 'banana', value: '2' },
      ]);
      expect(component.editedIndex()).toBe(0);
    });

    it('should report editedIndex -1 when the edited item is filtered out', async () => {
      fixture.componentRef.setInput('valueFilterThreshold', 1);
      component.values.set([
        { name: 'apple', value: '1' },
        { name: 'banana', value: '2' },
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      const apple = component.filteredValues()[0];
      component.editValue(apple);
      component.filter.set('ban');

      expect(component.editedIndex()).toBe(-1);
    });
  });
});
