import { render } from '@testing-library/angular';

import { IndexLookupDefinitions } from '@myrmidon/cadmus-core';

import { ScopedPinLookupComponent } from './scoped-pin-lookup.component';

const INDEX_LOOKUP_DEFINITIONS: IndexLookupDefinitions = {
  item_eid: {
    typeId: 'it.vedph.metadata',
    name: 'eid',
  },
};

const SINGLE_INDEX_LOOKUP_DEFINITIONS: IndexLookupDefinitions = {
  item_eid: {
    typeId: 'it.vedph.metadata',
    name: 'eid',
  },
};

function getProviders(defs: IndexLookupDefinitions = INDEX_LOOKUP_DEFINITIONS) {
  return [
    {
      provide: 'indexLookupDefinitions',
      useValue: defs,
    },
  ];
}

describe('ScopedPinLookupComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(ScopedPinLookupComponent, {
      providers: getProviders(),
    });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should collect the lookup definition keys', async () => {
    const { fixture } = await render(ScopedPinLookupComponent, {
      providers: getProviders(),
    });
    expect(fixture.componentInstance.keys()).toEqual(['item_eid']);
  });

  it('should pre-select the key on init when there is only one', async () => {
    const { fixture } = await render(ScopedPinLookupComponent, {
      providers: getProviders(SINGLE_INDEX_LOOKUP_DEFINITIONS),
    });
    const component = fixture.componentInstance;

    component.ngOnInit();

    expect(component.key.value).toBe('item_eid');
    expect(component.key.dirty).toBe(true);
  });

  describe('appendIdComponent', () => {
    it('should append the pin value', async () => {
      const { fixture } = await render(ScopedPinLookupComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;
      component.info.set({
        pin: { value: 'pinval' } as any,
      });

      component.appendIdComponent('pin');

      expect(component.id.value).toBe('pinval');
      expect(component.id.dirty).toBe(true);
    });

    it('should append the item id', async () => {
      const { fixture } = await render(ScopedPinLookupComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;
      component.info.set({
        pin: {} as any,
        item: { id: 'item1' } as any,
      });

      component.appendIdComponent('itemId');

      expect(component.id.value).toBe('item1');
    });

    it('should append the part id, type id and role id', async () => {
      const { fixture } = await render(ScopedPinLookupComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;
      component.info.set({
        pin: {} as any,
        part: { id: 'part1', typeId: 'type1', roleId: 'role1' } as any,
      });

      component.appendIdComponent('partId');
      component.appendIdComponent('partTypeId');
      component.appendIdComponent('partRoleId');

      expect(component.id.value).toBe('part1type1role1');
    });

    it('should append a metadata entry value by index', async () => {
      const { fixture } = await render(ScopedPinLookupComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;
      component.info.set({
        pin: {} as any,
        part: {
          metadata: [{ name: 'eid', value: 'meta-val' }],
        } as any,
      });

      component.appendIdComponent('metadata', 0);

      expect(component.id.value).toBe('meta-val');
    });

    it('should append onto the existing id value', async () => {
      const { fixture } = await render(ScopedPinLookupComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;
      component.id.setValue('prefix-');
      component.info.set({
        pin: {} as any,
        item: { id: 'item1' } as any,
      });

      component.appendIdComponent('itemId');

      expect(component.id.value).toBe('prefix-item1');
    });
  });

  describe('pickId', () => {
    it('should not emit idPick when the id form is invalid', async () => {
      const { fixture } = await render(ScopedPinLookupComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;
      const spy = vi.fn();
      component.idPick.subscribe(spy);

      // id is required and left empty
      component.pickId();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should emit idPick and clear info when the id form is valid', async () => {
      const { fixture } = await render(ScopedPinLookupComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;
      const spy = vi.fn();
      component.idPick.subscribe(spy);
      component.id.setValue('final-id');
      component.info.set({ pin: {} as any });

      component.pickId();

      expect(spy).toHaveBeenCalledWith('final-id');
      expect(component.info()).toBeUndefined();
    });
  });

  describe('resetId', () => {
    it('should reset the id control', async () => {
      const { fixture } = await render(ScopedPinLookupComponent, {
        providers: getProviders(),
      });
      const component = fixture.componentInstance;
      component.id.setValue('some-id');

      component.resetId();

      expect(component.id.value).toBeNull();
      expect(component.id.dirty).toBe(true);
    });
  });
});
