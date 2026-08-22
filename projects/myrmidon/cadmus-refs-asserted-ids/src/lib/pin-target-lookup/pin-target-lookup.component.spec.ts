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

    expect(component.item.value).toBeNull();
    expect(component.itemPart.value).toBeNull();
    expect(component.gid.value).toBeNull();
    expect(component.label.value).toBeNull();
    expect(component.byTypeMode.value).toBe(false);
    expect(component.external.value).toBe(false);
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

    // gid/label are required and left empty
    component.save();

    expect(component.gid.touched).toBe(true);
    expect(component.label.touched).toBe(true);
    expect(component.target()).toBeUndefined();
  });

  it('save should set the target when the form is valid', async () => {
    const { fixture } = await render(PinTargetLookupComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;
    component.external.setValue(true);
    component.gid.setValue('g1');
    component.label.setValue('l1');

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

    expect(component.itemPart.value).toBeNull();
    expect(component.itemParts()).toEqual([]);
  });
});
