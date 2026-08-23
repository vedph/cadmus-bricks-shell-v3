import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Observable, of } from 'rxjs';

import {
  RefLookupSetComponent,
  RefLookupConfig,
} from './ref-lookup-set.component';
import { RefLookupService } from '../ref-lookup/ref-lookup.component';

function advanceDebounce(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface FakeItem {
  id: string;
  name: string;
}

class FakeLookupService implements RefLookupService {
  constructor(public readonly id: string) {}
  public lookup(): Observable<FakeItem[]> {
    return of([]);
  }
  public getName(item: FakeItem | undefined): string {
    return item?.name || '';
  }
  public getById(): Observable<FakeItem | undefined> {
    return of(undefined);
  }
}

describe('RefLookupSetComponent', () => {
  let component: RefLookupSetComponent;
  let fixture: ComponentFixture<RefLookupSetComponent>;

  const CONFIG_A: RefLookupConfig = {
    name: 'Service A',
    service: new FakeLookupService('a'),
  };
  const CONFIG_B: RefLookupConfig = {
    name: 'Service B',
    service: new FakeLookupService('b'),
    itemIdGetter: (item: FakeItem) => `id:${item.id}`,
    itemLabelGetter: (item: FakeItem) => `label:${item.name}`,
  };

  async function setup(configs: RefLookupConfig[]) {
    await TestBed.configureTestingModule({
      imports: [RefLookupSetComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(RefLookupSetComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('configs', configs);
    fixture.detectChanges();
  }

  it('should create', async () => {
    await setup([CONFIG_A]);
    expect(component).toBeTruthy();
  });

  it('should default iconSize to 24x24', async () => {
    await setup([CONFIG_A]);
    expect(component.iconSize()).toEqual({ width: 24, height: 24 });
  });

  it('should auto-select the first config on init', async () => {
    await setup([CONFIG_A, CONFIG_B]);
    expect(component.form.config().value()).toBe(CONFIG_A);
  });

  it('should leave the config unset when there are no configs', async () => {
    await setup([]);
    expect(component.form.config().value()).toBeNull();
  });

  it('should emit configChange after debounce when the config selection changes', async () => {
    await setup([CONFIG_A, CONFIG_B]);
    const emitted: RefLookupConfig[] = [];
    component.configChange.subscribe((c) => emitted.push(c));

    component.form.config().value.set(CONFIG_B);
    await advanceDebounce();

    expect(emitted).toEqual([CONFIG_B]);
  });

  it('should not emit configChange for a null selection', async () => {
    await setup([CONFIG_A]);
    const emitted: RefLookupConfig[] = [];
    component.configChange.subscribe((c) => emitted.push(c));

    component.form.config().value.set(null);
    await advanceDebounce();

    expect(emitted).toEqual([]);
  });

  it('getResolvedItemId should return undefined when the config has no itemId', async () => {
    await setup([CONFIG_A]);
    expect(component.getResolvedItemId(CONFIG_A)).toBeUndefined();
  });

  it('getResolvedItemId should return the raw itemId when there is no parser', async () => {
    await setup([{ ...CONFIG_A, itemId: 'raw-id' }]);
    expect(component.getResolvedItemId({ ...CONFIG_A, itemId: 'raw-id' })).toBe(
      'raw-id'
    );
  });

  it('getResolvedItemId should apply itemIdParser when present', async () => {
    const config: RefLookupConfig = {
      ...CONFIG_A,
      itemId: 'prefix:raw-id',
      itemIdParser: (id: string) => id.replace('prefix:', ''),
    };
    await setup([config]);
    expect(component.getResolvedItemId(config)).toBe('raw-id');
  });

  describe('onItemChange', () => {
    it('should do nothing when there is no current config', async () => {
      await setup([]);
      let emitted = false;
      component.itemChange.subscribe(() => (emitted = true));
      component.onItemChange({ id: '1', name: 'Alpha' });
      expect(emitted).toBe(false);
    });

    it('should emit itemChange using itemIdGetter/itemLabelGetter when present', async () => {
      await setup([CONFIG_B]);
      let event: any;
      component.itemChange.subscribe((e) => (event = e));

      const item: FakeItem = { id: '7', name: 'Gamma' };
      component.onItemChange(item);

      expect(event.item).toEqual(item);
      expect(event.itemId).toBe('id:7');
      expect(event.itemLabel).toBe('label:Gamma');
      expect(event.config).toBe(CONFIG_B);
      expect(event.configs).toEqual([CONFIG_B]);
    });

    it('should fall back to the item itself as ID/label when no getters are configured', async () => {
      await setup([CONFIG_A]);
      let event: any;
      component.itemChange.subscribe((e) => (event = e));

      component.onItemChange('plain-item');

      expect(event.itemId).toBe('plain-item');
      expect(event.itemLabel).toBe('plain-item');
    });
  });

  describe('onMoreRequest', () => {
    it('should do nothing when there is no current config', async () => {
      await setup([]);
      let emitted = false;
      component.moreRequest.subscribe(() => (emitted = true));
      component.onMoreRequest({ id: '1', name: 'Alpha' });
      expect(emitted).toBe(false);
    });

    it('should emit moreRequest with the built event', async () => {
      await setup([CONFIG_B]);
      let event: any;
      component.moreRequest.subscribe((e) => (event = e));

      const item: FakeItem = { id: '9', name: 'Delta' };
      component.onMoreRequest(item);

      expect(event.item).toEqual(item);
      expect(event.itemId).toBe('id:9');
    });
  });

  it('should render a provider select with an option per config', async () => {
    await setup([CONFIG_A, CONFIG_B]);
    const options = fixture.nativeElement.querySelectorAll('mat-option');
    // options are rendered lazily by CDK overlay only when opened; instead
    // verify the underlying data drives the select via the component API
    expect(component.configs().length).toBe(2);
    expect(fixture.nativeElement.querySelector('mat-select')).toBeTruthy();
  });

  it('should render the child lookup component once a config is selected', async () => {
    await setup([CONFIG_A]);
    expect(
      fixture.nativeElement.querySelector('cadmus-refs-lookup')
    ).toBeTruthy();
  });

  it('should not render the child lookup component when there are no configs', async () => {
    await setup([]);
    expect(
      fixture.nativeElement.querySelector('cadmus-refs-lookup')
    ).toBeFalsy();
  });

  it('should unsubscribe on destroy without throwing', async () => {
    await setup([CONFIG_A]);
    expect(() => fixture.destroy()).not.toThrow();
  });
});
