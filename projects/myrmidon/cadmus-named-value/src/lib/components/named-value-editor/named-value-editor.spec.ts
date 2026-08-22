import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NamedValueEditor } from './named-value-editor';
import { NamedValueMap } from '../../models';

describe('NamedValueEditor', () => {
  let component: NamedValueEditor;
  let fixture: ComponentFixture<NamedValueEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NamedValueEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(NamedValueEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with an empty form model', () => {
    expect(component.form.name().value()).toBe('');
    expect(component.form.text().value()).toBe('');
    expect(component.form.prefix().value()).toBe('');
    expect(component.form.picked().value()).toBe('');
  });

  it('should have falsy computed flags with no data bound', () => {
    expect(component.closedValueItems()).toBeUndefined();
    expect(component.isMulti()).toBe(false);
    expect(component.isConstrained()).toBe(false);
    expect(component.closedNameSelected()).toBe(false);
    expect(component.showPrefix()).toBe(false);
  });

  it('should default multiValuedNames to an empty array and hasPrefix to false', () => {
    expect(component.multiValuedNames()).toEqual([]);
    expect(component.hasPrefix()).toBe(false);
  });

  it('should apply an externally set free-text value', async () => {
    component.value.set({ name: 'color', value: 'red' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.form.name().value()).toBe('color');
    expect(component.form.text().value()).toBe('red');
  });

  it('should treat an undefined external value as an empty name/value', async () => {
    component.value.set({ name: 'color', value: 'red' });
    fixture.detectChanges();
    await fixture.whenStable();

    component.value.set(undefined);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.form.name().value()).toBe('');
    expect(component.form.text().value()).toBe('');
  });

  it('should expose closed values for a name found in the closedValues map', async () => {
    const closedValues: NamedValueMap = {
      color: [
        { name: 'Red', value: 'red' },
        { name: 'Green', value: 'green' },
      ],
    };
    fixture.componentRef.setInput('closedNames', [
      { name: 'Color', value: 'color' },
    ]);
    fixture.componentRef.setInput('closedValues', closedValues);
    component.value.set({ name: 'color', value: 'red' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.closedValueItems()).toEqual(closedValues['color']);
    expect(component.isConstrained()).toBe(true);
    expect(component.closedNameSelected()).toBe(true);
    expect(component.form.picked().value()).toBe('red');
  });

  it('should not consider the name selected from a closed list when closedNames is not set', async () => {
    const closedValues: NamedValueMap = {
      color: [{ name: 'Red', value: 'red' }],
    };
    fixture.componentRef.setInput('closedValues', closedValues);
    component.value.set({ name: 'color', value: 'red' });
    fixture.detectChanges();
    await fixture.whenStable();

    // isConstrained relies only on closedValues, but closedNameSelected
    // additionally requires the closedNames input to be set.
    expect(component.isConstrained()).toBe(true);
    expect(component.closedNameSelected()).toBe(false);
  });

  it('should preserve an external value with no match in the closed values as fallback', async () => {
    const closedValues: NamedValueMap = {
      color: [{ name: 'Red', value: 'red' }],
    };
    fixture.componentRef.setInput('closedNames', [
      { name: 'Color', value: 'color' },
    ]);
    fixture.componentRef.setInput('closedValues', closedValues);
    component.value.set({ name: 'color', value: 'unknown' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.form.picked().value()).toBe('');
    // finalValue falls back to the preserved value when nothing is picked
    expect(component.value()).toEqual({ name: 'color', value: 'unknown' });
  });

  it('should show the prefix field only when closed name selected, hasPrefix and constrained', async () => {
    const closedValues: NamedValueMap = {
      color: [{ name: 'Red', value: 'red' }],
    };
    fixture.componentRef.setInput('closedNames', [
      { name: 'Color', value: 'color' },
    ]);
    fixture.componentRef.setInput('closedValues', closedValues);
    fixture.componentRef.setInput('hasPrefix', true);
    component.value.set({ name: 'color', value: 'red' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.showPrefix()).toBe(true);
  });

  it('should not show the prefix field when hasPrefix is false', async () => {
    const closedValues: NamedValueMap = {
      color: [{ name: 'Red', value: 'red' }],
    };
    fixture.componentRef.setInput('closedNames', [
      { name: 'Color', value: 'color' },
    ]);
    fixture.componentRef.setInput('closedValues', closedValues);
    component.value.set({ name: 'color', value: 'red' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.showPrefix()).toBe(false);
  });

  it('should assemble prefix + picked value for a single closed value', async () => {
    const closedValues: NamedValueMap = {
      color: [{ name: 'Red', value: 'red' }],
    };
    fixture.componentRef.setInput('closedNames', [
      { name: 'Color', value: 'color' },
    ]);
    fixture.componentRef.setInput('closedValues', closedValues);
    fixture.componentRef.setInput('hasPrefix', true);
    component.form.name().value.set('color');
    fixture.detectChanges();
    await fixture.whenStable();

    component.form.prefix().value.set('X-');
    component.form.picked().value.set('red');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.value()).toEqual({ name: 'color', value: 'X-red' });
  });

  it('should detect a multi-valued name', async () => {
    fixture.componentRef.setInput('multiValuedNames', ['color']);
    component.form.name().value.set('color');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isMulti()).toBe(true);
  });

  it('should accumulate picked closed values into text for a multi-valued name', async () => {
    const closedValues: NamedValueMap = {
      color: [
        { name: 'Red', value: 'red' },
        { name: 'Green', value: 'green' },
      ],
    };
    fixture.componentRef.setInput('closedNames', [
      { name: 'Color', value: 'color' },
    ]);
    fixture.componentRef.setInput('closedValues', closedValues);
    fixture.componentRef.setInput('multiValuedNames', ['color']);
    component.form.name().value.set('color');
    fixture.detectChanges();
    await fixture.whenStable();

    component.form.picked().value.set('red');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.form.text().value()).toBe('red');
    // picker resets after being appended
    expect(component.form.picked().value()).toBe('');

    component.form.picked().value.set('green');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.form.text().value()).toBe('red green');
    expect(component.value()).toEqual({ name: 'color', value: 'red green' });
  });

  it('should prefix each accumulated multi-value piece', async () => {
    const closedValues: NamedValueMap = {
      color: [{ name: 'Red', value: 'red' }],
    };
    fixture.componentRef.setInput('closedNames', [
      { name: 'Color', value: 'color' },
    ]);
    fixture.componentRef.setInput('closedValues', closedValues);
    fixture.componentRef.setInput('multiValuedNames', ['color']);
    fixture.componentRef.setInput('hasPrefix', true);
    component.form.name().value.set('color');
    fixture.detectChanges();
    await fixture.whenStable();

    component.form.prefix().value.set('X-');
    component.form.picked().value.set('red');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.form.text().value()).toBe('X-red');
  });

  it('should push local free-text edits back to the bound value', async () => {
    component.form.name().value.set('color');
    component.form.text().value.set('crimson');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.value()).toEqual({ name: 'color', value: 'crimson' });
  });

  it('should reset value-related fields when the name changes', () => {
    component.form.name().value.set('color');
    component.form.text().value.set('red');
    component.form.prefix().value.set('X-');
    component.onNameChanged();

    expect(component.form.text().value()).toBe('');
    expect(component.form.prefix().value()).toBe('');
    expect(component.form.picked().value()).toBe('');
  });

  it('should be a no-op when onNameChanged runs again for the same name', () => {
    component.form.name().value.set('color');
    component.onNameChanged();

    component.form.text().value.set('typed value');
    component.onNameChanged();

    expect(component.form.text().value()).toBe('typed value');
  });

  it('should clear the editor and emit valueCancel on cancel', async () => {
    component.value.set({ name: 'color', value: 'red' });
    fixture.detectChanges();
    await fixture.whenStable();

    let emitted = false;
    component.valueCancel.subscribe(() => (emitted = true));

    component.cancel();

    expect(emitted).toBe(true);
    expect(component.value()).toBeUndefined();
    expect(component.form.name().value()).toBe('');
    expect(component.form.text().value()).toBe('');
  });

  it('should mark name as invalid when required and empty, once touched', () => {
    component.form.name().markAsTouched();
    expect(component.form.name().invalid()).toBe(true);
    expect(component.form.name().errors()[0]?.message).toBe(
      'Name is required.'
    );
  });

  it('should be valid once a name is provided', () => {
    component.form.name().value.set('color');
    expect(component.form.name().invalid()).toBe(false);
  });

  it('should not validate the prefix pattern when the prefix is empty', () => {
    fixture.componentRef.setInput('prefixPattern', '^[A-Z]+$');
    component.form.prefix().value.set('');
    expect(component.form.prefix().invalid()).toBe(false);
  });

  it('should validate the prefix against the given pattern when non-empty', () => {
    fixture.componentRef.setInput('prefixPattern', '^[A-Z]+$');
    component.form.prefix().value.set('lowercase');
    expect(component.form.prefix().invalid()).toBe(true);

    component.form.prefix().value.set('UPPER');
    expect(component.form.prefix().invalid()).toBe(false);
  });

  it('should allow any prefix when no pattern is specified', () => {
    component.form.prefix().value.set('anything123');
    expect(component.form.prefix().invalid()).toBe(false);
  });
});
