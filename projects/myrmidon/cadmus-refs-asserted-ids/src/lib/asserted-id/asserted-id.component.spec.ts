import { render } from '@testing-library/angular';

import { IndexLookupDefinitions } from '@myrmidon/cadmus-core';

import { AssertedId, AssertedIdComponent } from './asserted-id.component';
import { PinRefLookupService } from '../services/pin-ref-lookup.service';

const INDEX_LOOKUP_DEFINITIONS: IndexLookupDefinitions = {
  item_eid: {
    typeId: 'it.vedph.metadata',
    name: 'eid',
  },
};

function getProviders() {
  return [
    {
      provide: PinRefLookupService,
      useValue: {
        lookup: vi.fn(),
        getName: vi.fn().mockReturnValue(''),
      },
    },
    {
      provide: 'indexLookupDefinitions',
      useValue: INDEX_LOOKUP_DEFINITIONS,
    },
  ];
}

describe('AssertedIdComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedIdComponent, {
      providers: getProviders(),
    });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialize the form with default (unset) state', async () => {
    const { fixture } = await render(AssertedIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    expect(component.form.tag().value()).toBe('');
    expect(component.form.value().value()).toBe('');
    expect(component.form.label().value()).toBe('');
    expect(component.form.scope().value()).toBe('');
    expect(component.form.assertion().value()).toBeNull();
    expect(component.lookupExpanded()).toBe(false);
  });

  it('should populate the form when id is set', async () => {
    const { fixture } = await render(AssertedIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;
    const id: AssertedId = { value: 'v1', scope: 's1', tag: 't1', label: 'l1' };

    component.id.set(id);
    fixture.detectChanges();

    expect(component.form.value().value()).toBe('v1');
    expect(component.form.scope().value()).toBe('s1');
    expect(component.form.tag().value()).toBe('t1');
    expect(component.form.label().value()).toBe('l1');
    expect(component.form().dirty()).toBe(false);
  });

  it('should reset the form when id is set to undefined', async () => {
    const { fixture } = await render(AssertedIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    component.id.set({ value: 'v1', scope: 's1' });
    fixture.detectChanges();

    component.id.set(undefined);
    fixture.detectChanges();

    expect(component.form.value().value()).toBe('');
    expect(component.form.scope().value()).toBe('');
  });

  it('cancel should emit editorClose', async () => {
    const { fixture } = await render(AssertedIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.editorClose.subscribe(spy);

    component.cancel();

    expect(spy).toHaveBeenCalled();
  });

  it('save should not set the id when the form is invalid', async () => {
    const { fixture } = await render(AssertedIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    // value is required and left empty
    component.save();

    expect(component.id()).toBeUndefined();
  });

  it('save should set the id when the form is valid', async () => {
    const { fixture } = await render(AssertedIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    component.form.value().value.set('  v1  ');
    component.form.scope().value.set('  s1  ');
    component.save();

    expect(component.id()).toEqual({
      tag: undefined,
      value: 'v1',
      label: undefined,
      scope: 's1',
      assertion: undefined,
    });
  });

  it('onAssertionChange should update the assertion control', async () => {
    const { fixture } = await render(AssertedIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    component.onAssertionChange({ rank: 1 } as any);
    expect(component.form.assertion().value()).toEqual({ rank: 1 });

    component.onAssertionChange(undefined);
    expect(component.form.assertion().value()).toBeNull();
  });

  it('onIdPick should set the value control and collapse the lookup panel', async () => {
    const { fixture } = await render(AssertedIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;
    component.lookupExpanded.set(true);

    component.onIdPick('picked-id');

    expect(component.form.value().value()).toBe('picked-id');
    expect(component.form.value().dirty()).toBe(true);
    expect(component.lookupExpanded()).toBe(false);
  });
});
