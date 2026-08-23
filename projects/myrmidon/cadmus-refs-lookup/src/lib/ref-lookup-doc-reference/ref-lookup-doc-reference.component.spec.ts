import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Observable, of } from 'rxjs';

import {
  LookupDocReferenceComponent,
  LOOKUP_CONFIGS_KEY,
} from './ref-lookup-doc-reference.component';
import { RefLookupConfig } from '../ref-lookup-set/ref-lookup-set.component';
import { RefLookupService } from '../ref-lookup/ref-lookup.component';
import { DocReference } from '@myrmidon/cadmus-refs-doc-references';
import {
  CitScheme,
  CitSchemeSet,
  CitSchemeService,
} from '@myrmidon/cadmus-refs-citation';
import { RamStorageService } from '@myrmidon/ngx-tools';

function advanceDebounce(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

//#region Scheme
const OD_SCHEME: CitScheme = {
  id: 'od',
  name: 'Odyssey',
  path: ['book', 'verse'],
  optionalFrom: 'verse',
  textOptions: {
    pathPattern: '^\\s*([αβγδεζηθικλμνξοπρστυφχψω])\\s+(\\d+(?:[a-z])?)\\s*$',
    template: '{book} {verse}',
    hint: 'book (α-ω) verse (1-N[a-z])',
  },
  color: '#4287f5',
  steps: {
    book: {
      type: 'numeric',
      color: '#4287f5',
      domain: { range: { min: 1, max: 24 } },
    },
    verse: {
      type: 'numeric',
      color: '#1ECBE1',
      domain: { range: { min: 1 } },
    },
  },
};
//#endregion

interface FakeItem {
  itemId: string;
  name: string;
}

class FakeLookupService implements RefLookupService {
  public readonly id = 'fake';
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

describe('LookupDocReferenceComponent', () => {
  let component: LookupDocReferenceComponent;
  let fixture: ComponentFixture<LookupDocReferenceComponent>;

  function createSchemeService(withScheme: boolean): CitSchemeService {
    const service = new CitSchemeService(new RamStorageService());
    if (withScheme) {
      service.configure({
        formats: {},
        schemes: { od: OD_SCHEME },
      } as CitSchemeSet);
    }
    return service;
  }

  function createStorage(configs: RefLookupConfig[]): RamStorageService {
    const storage = new RamStorageService();
    storage.store(LOOKUP_CONFIGS_KEY, configs);
    return storage;
  }

  async function setup(opts: {
    configs?: RefLookupConfig[];
    withScheme?: boolean;
    inputs?: Record<string, unknown>;
  }) {
    const configs = opts.configs ?? [{ name: 'Fake', service: new FakeLookupService() }];
    const withScheme = opts.withScheme ?? true;

    await TestBed.configureTestingModule({
      imports: [LookupDocReferenceComponent],
      providers: [
        provideNoopAnimations(),
        { provide: CitSchemeService, useValue: createSchemeService(withScheme) },
        { provide: RamStorageService, useValue: createStorage(configs) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LookupDocReferenceComponent);
    component = fixture.componentInstance;
    for (const [k, v] of Object.entries(opts.inputs || {})) {
      fixture.componentRef.setInput(k, v);
    }
    fixture.detectChanges();
  }

  it('should create', async () => {
    await setup({});
    expect(component).toBeTruthy();
  });

  it('should load lookup configs from storage', async () => {
    const configs: RefLookupConfig[] = [
      { name: 'Fake', service: new FakeLookupService() },
    ];
    await setup({ configs });
    expect(component.lookupConfigs()).toEqual(configs);
  });

  it('should default to an empty lookupConfigs array when storage has none', async () => {
    await setup({ configs: [] });
    expect(component.lookupConfigs()).toEqual([]);
  });

  describe('pickers/pickerEnabled', () => {
    it('should offer both pickers when lookup configs and schemes are available', async () => {
      await setup({});
      expect(component.pickers()).toEqual(['citation', 'lookup']);
      expect(component.pickerEnabled()).toBe(true);
      expect(component.pickerTypeDisabled()).toBe(false);
    });

    it('should offer only citation when there are no lookup configs', async () => {
      await setup({ configs: [] });
      expect(component.pickers()).toEqual(['citation']);
      expect(component.pickerTypeDisabled()).toBe(true);
    });

    it('should offer only lookup when there are no citation schemes', async () => {
      await setup({ withScheme: false });
      expect(component.pickers()).toEqual(['lookup']);
      expect(component.pickerTypeDisabled()).toBe(true);
    });

    it('should offer no pickers when both are disabled', async () => {
      await setup({ configs: [], withScheme: false });
      expect(component.pickers()).toEqual([]);
      expect(component.pickerEnabled()).toBe(false);
    });

    it('should respect the noLookup input', async () => {
      await setup({ inputs: { noLookup: true } });
      expect(component.pickers()).toEqual(['citation']);
    });

    it('should respect the noCitation input', async () => {
      await setup({ inputs: { noCitation: true } });
      expect(component.pickers()).toEqual(['lookup']);
    });
  });

  describe('form updates from reference', () => {
    it('should reset the form when reference is undefined', async () => {
      await setup({});
      expect(component.form.type().value()).toBe('');
      expect(component.form.citation().value()).toBe('');
    });

    it('should populate the form from an input reference', async () => {
      const reference: DocReference = {
        type: 'book',
        tag: 'primary',
        citation: 'α 12',
        note: 'a note',
      };
      await setup({ inputs: { reference } });

      expect(component.form.type().value()).toBe('book');
      expect(component.form.tag().value()).toBe('primary');
      expect(component.form.citation().value()).toBe('α 12');
      expect(component.form.note().value()).toBe('a note');
      expect(component.form().dirty()).toBe(false);
    });
  });

  describe('togglePicker', () => {
    it('should not toggle when there are no pickers available', async () => {
      await setup({ configs: [], withScheme: false });
      component.togglePicker();
      expect(component.pickerExpanded()).toBe(false);
    });

    it('should expand and parse the citation when picker type is citation', async () => {
      await setup({
        inputs: { reference: { citation: 'α 12' } as DocReference },
      });
      expect(component.pickerForm.pickerType().value()).toBe('citation');

      component.togglePicker();

      expect(component.pickerExpanded()).toBe(true);
      expect(component.parsedCitation()?.schemeId).toBe('od');
    });

    it('should collapse when toggled again', async () => {
      await setup({
        inputs: { reference: { citation: 'α 12' } as DocReference },
      });
      component.togglePicker();
      component.togglePicker();
      expect(component.pickerExpanded()).toBe(false);
    });
  });

  describe('onLookupConfigChange', () => {
    it('should update the active lookup config and reset the picked item', async () => {
      const configA: RefLookupConfig = {
        name: 'A',
        service: new FakeLookupService(),
      };
      const configB: RefLookupConfig = {
        name: 'B',
        service: new FakeLookupService(),
      };
      await setup({ configs: [configA, configB] });
      component.pickedItem.set({ itemId: 'x', name: 'X' });

      component.onLookupConfigChange(configB);

      expect(component.pickedItem()).toBeUndefined();
    });
  });

  describe('onLookupItemChange', () => {
    it('should set citation from item.itemId and mark it dirty', async () => {
      await setup({});
      const item: FakeItem = { itemId: 'α 12', name: 'Alpha' };

      component.onLookupItemChange(item);

      expect(component.form.citation().value()).toBe('α 12');
      expect(component.form.citation().dirty()).toBe(true);
      expect(component.pickedItem()).toEqual(item);
    });

    it('should close the picker when autoCloseOnPick is true (default)', async () => {
      await setup({});
      component.pickerExpanded.set(true);

      component.onLookupItemChange({ itemId: 'α 12', name: 'Alpha' });

      expect(component.pickerExpanded()).toBe(false);
    });

    it('should keep the picker open when autoCloseOnPick is false', async () => {
      await setup({ inputs: { autoCloseOnPick: false } });
      component.pickerExpanded.set(true);

      component.onLookupItemChange({ itemId: 'α 12', name: 'Alpha' });

      expect(component.pickerExpanded()).toBe(true);
    });

    it('should do nothing when the item has no itemId', async () => {
      await setup({});
      const before = component.form.citation().value();
      component.onLookupItemChange({ name: 'No id' } as any);
      expect(component.form.citation().value()).toBe(before);
    });
  });

  describe('onCitationChange', () => {
    it('should update citation text when picker is expanded on citation type', async () => {
      await setup({});
      component.pickerExpanded.set(true);
      component.pickerForm.pickerType().value.set('citation');

      component.onCitationChange({
        schemeId: 'od',
        steps: [
          { stepId: 'book', value: 'α', n: 1 },
          { stepId: 'verse', value: '12', n: 12 },
        ],
      });

      // by default CitSchemeService.toString() prefixes the rendered text
      // with the scheme ID (@od:), unless CitSchemeSet.noSchemePrefix is set
      expect(component.form.citation().value()).toBe('@od:α 12');
      expect(component.form.citation().dirty()).toBe(true);
    });

    it('should ignore citation changes when the picker is not expanded', async () => {
      await setup({});
      const before = component.form.citation().value();
      component.onCitationChange({
        schemeId: 'od',
        steps: [{ stepId: 'book', value: 'α', n: 1 }],
      });
      expect(component.form.citation().value()).toBe(before);
    });

    it('should ignore an undefined citation', async () => {
      await setup({});
      component.pickerExpanded.set(true);
      const before = component.form.citation().value();
      component.onCitationChange(undefined);
      expect(component.form.citation().value()).toBe(before);
    });
  });

  describe('save/close', () => {
    it('save should set the reference model with trimmed values', async () => {
      await setup({});
      component.form.type().value.set('  book  ');
      component.form.tag().value.set('  primary  ');
      component.form.citation().value.set('  α 12  ');
      component.form.note().value.set('  hello  ');

      component.save();

      expect(component.reference()).toEqual({
        type: 'book',
        tag: 'primary',
        citation: 'α 12',
        note: 'hello',
      });
    });

    it('close should emit cancel', async () => {
      await setup({});
      let cancelled = false;
      component.cancel.subscribe(() => (cancelled = true));
      component.close();
      expect(cancelled).toBe(true);
    });
  });

  describe('picker type auto-correction', () => {
    it('should switch pickerType away from an unavailable picker', async () => {
      await setup({
        configs: [],
        inputs: { defaultPicker: 'citation' },
      });
      // only 'citation' available since there are no lookup configs
      expect(component.pickers()).toEqual(['citation']);
      expect(component.pickerForm.pickerType().value()).toBe('citation');
    });
  });
});
