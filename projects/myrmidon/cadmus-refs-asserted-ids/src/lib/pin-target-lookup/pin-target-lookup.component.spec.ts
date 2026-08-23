import { render } from '@testing-library/angular';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { IndexLookupDefinitions } from '@myrmidon/cadmus-core';

import { PinTargetLookupComponent } from './pin-target-lookup.component';
import { ItemRefLookupService } from '../services/item-ref-lookup.service';
import { PinRefLookupService } from '../services/pin-ref-lookup.service';

const INDEX_LOOKUP_DEFINITIONS: IndexLookupDefinitions = {
  item_eid: {
    typeId: 'it.vedph.metadata',
    name: 'eid',
  },
  alias_eid: {
    typeId: 'it.vedph.metadata',
    name: 'eid',
  },
};

function getProviders() {
  return [
    provideHttpClient(withXhr()),
    provideHttpClientTesting(),
    {
      provide: 'indexLookupDefinitions',
      useValue: INDEX_LOOKUP_DEFINITIONS,
    },
    ItemRefLookupService,
    PinRefLookupService,
  ];
}

describe('PinTargetLookupComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(PinTargetLookupComponent, {
      providers: getProviders(),
    });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialize the form with default (unset) state', async () => {
    const { fixture } = await render(PinTargetLookupComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    expect(component.form.item().value()).toBeNull();
    expect(component.form.itemPart().value()).toBeNull();
    expect(component.form.gid().value()).toBe('');
    expect(component.form.label().value()).toBe('');
    expect(component.form.byTypeMode().value()).toBe(false);
    expect(component.form.external().value()).toBe(false);
  });

  it('close should emit editorClose', async () => {
    const { fixture } = await render(PinTargetLookupComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.editorClose.subscribe(spy);

    component.close();

    expect(spy).toHaveBeenCalled();
  });

  it('onExtMoreRequest should re-emit extMoreRequest', async () => {
    const { fixture } = await render(PinTargetLookupComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.extMoreRequest.subscribe(spy);
    const event = { providerId: 'x' } as any;

    component.onExtMoreRequest(event);

    expect(spy).toHaveBeenCalledWith(event);
  });

  it('onExtConfigChange should re-emit extLookupConfigChange', async () => {
    const { fixture } = await render(PinTargetLookupComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.extLookupConfigChange.subscribe(spy);
    const config = { name: 'viaf' } as any;

    component.onExtConfigChange(config);

    expect(spy).toHaveBeenCalledWith(config);
  });

  it('save should mark all as touched and not emit when the form is invalid', async () => {
    const { fixture } = await render(PinTargetLookupComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    // gid is required and left empty
    component.save();

    expect(component.form.gid().touched()).toBe(true);
    expect(component.form.label().touched()).toBe(true);
    expect(component.target()).toBeUndefined();
  });

  it('save should set the target when the form is valid', async () => {
    const { fixture } = await render(PinTargetLookupComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;
    component.form.external().value.set(true);
    component.form.gid().value.set('g1');
    component.form.label().value.set('l1');

    component.save();

    expect(component.target()).toEqual({ gid: 'g1', label: 'l1' });
  });

  it('onItemLookupChange should clear itemPart and itemParts when item is falsy', async () => {
    const { fixture } = await render(PinTargetLookupComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;
    component.itemParts.set([{ id: 'p1' } as any]);

    component.onItemLookupChange(null);

    expect(component.form.itemPart().value()).toBeNull();
    expect(component.itemParts()).toEqual([]);
  });
});
