import { vi } from 'vitest';
import { render } from '@testing-library/angular';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { of } from 'rxjs';

import { RamStorageService } from '@myrmidon/ngx-tools';
import { ThesaurusService } from '@myrmidon/cadmus-api';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { LOOKUP_CONFIGS_KEY } from '@myrmidon/cadmus-refs-lookup';

import {
  AssertedCompositeIdComponent,
  AssertedCompositeIdTagSettings,
  LOOKUP_TAXOSTORE_CONFIGS_KEY,
  TAXONOMY_GID_PREFIX,
} from './asserted-composite-id.component';
import { PinRefLookupService } from '../services/pin-ref-lookup.service';

function makeLookupConfig(id: string): any {
  return {
    name: id.toUpperCase(),
    service: {
      id,
      lookup: () => of([]),
      getName: () => '',
      getById: () => of(undefined),
    },
  };
}

// configured lookup sources
const EXT_CONFIGS = [makeLookupConfig('viaf'), makeLookupConfig('whg')];
const TAXO_CONFIGS = [
  { treeId: 'animals', treeName: 'animals' },
  { treeId: 'food', treeName: 'food' },
];

// thesauri
const ID_TAG_ENTRIES: ThesaurusEntry[] = [{ id: 'idt1', value: 'id-tag-1' }];
const THESAURI: { [id: string]: ThesaurusEntry[] } = {
  'model-types': [],
  'tags-viaf': [{ id: 'person', value: 'person' }],
  'tags-whg': [{ id: 'place', value: 'place' }],
  'tags-animals': [{ id: 'wild', value: 'wild' }],
  'tags-empty': [],
};

const TAG_SETTINGS: AssertedCompositeIdTagSettings = {
  tagThesaurusMap: {
    viaf: 'tags-viaf',
    whg: 'tags-whg',
    animals: 'tags-animals',
  },
};

/**
 * Get the providers with a storage service providing the configured
 * lookup sources, and a thesaurus service providing THESAURI.
 */
function getSourceProviders(getThesaurus = makeGetThesaurus()) {
  const providers = getProviders().filter(
    (p: any) =>
      p.provide !== RamStorageService && p.provide !== ThesaurusService,
  );
  return [
    ...providers,
    {
      provide: RamStorageService,
      useValue: {
        retrieve: (key: string) =>
          key === LOOKUP_CONFIGS_KEY
            ? EXT_CONFIGS
            : key === LOOKUP_TAXOSTORE_CONFIGS_KEY
              ? TAXO_CONFIGS
              : undefined,
      },
    },
    { provide: ThesaurusService, useValue: { getThesaurus } },
  ];
}

function makeGetThesaurus() {
  return vi.fn((id: string) => of({ id, entries: THESAURI[id] || [] }));
}

function getProviders() {
  return [
    provideHttpClientTesting(),
    {
      provide: ThesaurusService,
      useValue: { getThesaurus: makeGetThesaurus() },
    },
    {
      provide: PinRefLookupService,
      useValue: {
        lookup: vi.fn(),
        getName: vi.fn().mockReturnValue(''),
      },
    },
    {
      provide: 'indexLookupDefinitions',
      useValue: {},
    },
    {
      provide: RamStorageService,
      useValue: {
        retrieve: vi.fn(),
      },
    },
  ];
}

describe('AssertedCompositeIdComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialize the form with default (unset) state', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    expect(component.form.target().value()).toBeNull();
    expect(component.form.scope().value()).toBe('');
    expect(component.form.tag().value()).toBe('');
    expect(component.form.features().value()).toEqual([]);
    expect(component.form.note().value()).toBe('');
    expect(component.form.assertion().value()).toBeNull();
    expect(component.targetMode()).toBe('internal');
  });

  it('cancel should emit editorClose', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;
    const spy = vi.fn();
    component.editorClose.subscribe(spy);

    component.cancel();

    expect(spy).toHaveBeenCalled();
  });

  it('save should not set the id when the form is invalid', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    // target is required and left empty
    component.save();

    expect(component.id()).toBeUndefined();
  });

  it('save should set the id when the form is valid', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    component.form.target().value.set({ gid: 'g1', label: 'l1' });
    component.save();

    expect(component.id()).toEqual({
      target: { gid: 'g1', label: 'l1' },
      scope: '',
      tag: undefined,
      features: undefined,
      note: undefined,
      assertion: undefined,
    });
  });

  it('onAssertionChange should update the assertion control', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    component.onAssertionChange({ rank: 2 } as any);
    expect(component.form.assertion().value()).toEqual({ rank: 2 });

    component.onAssertionChange(undefined);
    expect(component.form.assertion().value()).toBeNull();
  });

  it('onEntriesChange should update the features control with entry ids', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    component.onEntriesChange([
      { id: 'f1', value: 'Feature 1' } as any,
      { id: 'f2', value: 'Feature 2' } as any,
    ]);

    expect(component.form.features().value()).toEqual(['f1', 'f2']);
    expect(component.form.features().dirty()).toBe(true);
  });

  it('onTargetChange should update the target control and collapse the panel when valid', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;
    component.targetExpanded.set(true);

    component.onTargetChange({ gid: 'g1', label: 'l1' });

    expect(component.form.target().value()).toEqual({ gid: 'g1', label: 'l1' });
    expect(component.targetExpanded()).toBe(false);
  });

  it('should detect a taxonomy target from its gid prefix when the id model is set', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;

    component.id.set({
      target: { gid: `${TAXONOMY_GID_PREFIX}animals/dog`, label: 'Dog' },
    });
    fixture.detectChanges();

    expect(component.targetMode()).toBe('taxonomy');
  });

  it('onTargetModeChange should be a no-op when the mode is unchanged', async () => {
    const { fixture } = await render(AssertedCompositeIdComponent, {
      providers: getProviders(),
    });
    const component = fixture.componentInstance;
    // default mode is 'internal'
    component.onTargetModeChange('internal');

    expect(component.targetMode()).toBe('internal');
  });

  describe('tag settings', () => {
    async function setup(
      inputs: { [key: string]: unknown } = {},
      getThesaurus = makeGetThesaurus(),
    ) {
      const { fixture } = await render(AssertedCompositeIdComponent, {
        providers: getSourceProviders(getThesaurus),
        inputs: { idTagEntries: ID_TAG_ENTRIES, ...inputs },
      });
      fixture.detectChanges();
      return { fixture, component: fixture.componentInstance, getThesaurus };
    }

    it('should show all the lookup sources when there are no settings', async () => {
      const { component } = await setup();

      expect(component.visibleExtLookupConfigs()).toEqual(EXT_CONFIGS);
      expect(component.visibleTaxoLookupConfigs()).toEqual(TAXO_CONFIGS);
      expect(component.hasTaxonomy()).toBe(true);
    });

    it('should hide the lookup providers in hiddenLookupProviderIds', async () => {
      const { component } = await setup({
        tagSettings: { hiddenLookupProviderIds: ['viaf'] },
      });

      expect(component.visibleExtLookupConfigs()).toEqual([EXT_CONFIGS[1]]);
      // all the providers are still configured
      expect(component.extLookupConfigs()).toEqual(EXT_CONFIGS);
    });

    it('should hide the taxonomy trees in hiddenTaxoTreeIds', async () => {
      const { component } = await setup({
        tagSettings: { hiddenTaxoTreeIds: ['food'] },
      });

      expect(component.visibleTaxoLookupConfigs()).toEqual([TAXO_CONFIGS[0]]);
      expect(component.hasTaxonomy()).toBe(true);
    });

    it('should not offer taxonomy when all its trees are hidden', async () => {
      const { component } = await setup({
        tagSettings: { hiddenTaxoTreeIds: ['animals', 'food'] },
      });

      expect(component.hasTaxonomy()).toBe(false);
    });

    it('should still use a hidden tree for an existing target from it', async () => {
      const { component } = await setup({
        tagSettings: { hiddenTaxoTreeIds: ['food'] },
        id: { target: { gid: `${TAXONOMY_GID_PREFIX}food/bread`, label: 'x' } },
      });

      expect(component.selectedTaxoConfig()).toBe(TAXO_CONFIGS[1]);
    });

    it('should use idTagEntries when there is no tag thesaurus map', async () => {
      const { component, getThesaurus } = await setup({
        id: { target: { gid: 'http://x.org/1', label: 'x' }, scope: 'viaf' },
      });

      expect(component.tagSourceId()).toBe('viaf');
      expect(component.tagThesaurusId()).toBeUndefined();
      expect(component.tagEntries()).toEqual(ID_TAG_ENTRIES);
      expect(getThesaurus).not.toHaveBeenCalledWith('tags-viaf', true);
    });

    it('should use idTagEntries for an internal target', async () => {
      const { component } = await setup({
        tagSettings: TAG_SETTINGS,
        id: { target: { gid: 'g1', label: 'x', name: 'eid', value: 'x' } },
      });

      expect(component.targetMode()).toBe('internal');
      expect(component.tagSourceId()).toBeUndefined();
      expect(component.tagEntries()).toEqual(ID_TAG_ENTRIES);
    });

    it('should use the thesaurus mapped to the tree of a taxonomy target', async () => {
      const { component, getThesaurus } = await setup({
        tagSettings: TAG_SETTINGS,
        id: {
          target: { gid: `${TAXONOMY_GID_PREFIX}animals/dog`, label: 'Dog' },
        },
      });

      expect(component.tagSourceId()).toBe('animals');
      expect(getThesaurus).toHaveBeenCalledWith('tags-animals', true);
      expect(component.tagEntries()).toEqual(THESAURI['tags-animals']);
    });

    it('should use idTagEntries for a tree which is not mapped', async () => {
      const { component } = await setup({
        tagSettings: TAG_SETTINGS,
        id: {
          target: { gid: `${TAXONOMY_GID_PREFIX}food/bread`, label: 'Bread' },
        },
      });

      expect(component.tagSourceId()).toBe('food');
      expect(component.tagEntries()).toEqual(ID_TAG_ENTRIES);
    });

    it('should use idTagEntries when the mapped thesaurus is empty', async () => {
      const { component } = await setup({
        tagSettings: { tagThesaurusMap: { animals: 'tags-empty' } },
        id: {
          target: { gid: `${TAXONOMY_GID_PREFIX}animals/dog`, label: 'Dog' },
        },
      });

      expect(component.tagThesaurusId()).toBe('tags-empty');
      expect(component.tagEntries()).toEqual(ID_TAG_ENTRIES);
    });

    it('should use the provider named by scope for an external target', async () => {
      const { component } = await setup({
        tagSettings: TAG_SETTINGS,
        id: { target: { gid: 'http://x.org/1', label: 'x' }, scope: 'whg' },
      });

      expect(component.targetMode()).toBe('external');
      expect(component.extProviderId()).toBe('whg');
      expect(component.tagEntries()).toEqual(THESAURI['tags-whg']);
    });

    it('should use the first visible provider when scope names none', async () => {
      const { component } = await setup({
        tagSettings: { ...TAG_SETTINGS, hiddenLookupProviderIds: ['viaf'] },
        id: { target: { gid: 'http://x.org/1', label: 'x' }, scope: 'other' },
      });

      expect(component.extProviderId()).toBe('whg');
      expect(component.tagEntries()).toEqual(THESAURI['tags-whg']);
    });

    it('should switch tags and drop a foreign tag when the provider changes', async () => {
      const { fixture, component } = await setup({
        tagSettings: TAG_SETTINGS,
        id: {
          target: { gid: 'http://x.org/1', label: 'x' },
          scope: 'viaf',
          tag: 'person',
        },
      });
      expect(component.tagEntries()).toEqual(THESAURI['tags-viaf']);
      expect(component.form.tag().value()).toBe('person');

      component.onExtLookupConfigChange(EXT_CONFIGS[1]);
      fixture.detectChanges();

      expect(component.tagEntries()).toEqual(THESAURI['tags-whg']);
      expect(component.form.tag().value()).toBe('');
      // scope was a provider ID, so it follows the provider
      expect(component.form.scope().value()).toBe('whg');
    });

    it('should keep a tag missing from the tags when just loaded', async () => {
      const { component } = await setup({
        tagSettings: TAG_SETTINGS,
        id: {
          target: { gid: 'http://x.org/1', label: 'x' },
          scope: 'viaf',
          tag: 'legacy',
        },
      });

      expect(component.tagEntries()).toEqual(THESAURI['tags-viaf']);
      expect(component.form.tag().value()).toBe('legacy');
    });
  });

  describe('scope from lookup source', () => {
    async function setup(inputs: { [key: string]: unknown } = {}) {
      const { fixture } = await render(AssertedCompositeIdComponent, {
        providers: getSourceProviders(),
        inputs,
      });
      fixture.detectChanges();
      return { fixture, component: fixture.componentInstance };
    }

    it('should set scope to the tree ID when picking a taxonomy node', async () => {
      const { component } = await setup({
        id: { target: { gid: 'http://x.org/1', label: 'x' }, scope: 'other' },
      });
      component.onTargetModeChange('taxonomy');

      component.onTaxoNodePick({ key: 'dog', label: 'Dog' } as any);

      expect(component.form.target().value()).toEqual({
        gid: `${TAXONOMY_GID_PREFIX}animals/dog`,
        label: 'Dog',
      });
      expect(component.form.scope().value()).toBe('animals');
    });

    it('should set scope to the provider ID when confirming a lookup pick', async () => {
      const { component } = await setup({
        id: { target: { gid: 'http://x.org/1', label: 'x' }, scope: 'other' },
      });

      component.onExtItemPick({
        configs: EXT_CONFIGS,
        config: EXT_CONFIGS[1],
        item: {},
        itemId: 'whg:1',
        itemLabel: 'Rome',
      });
      // the pick alone does not change anything
      expect(component.form.scope().value()).toBe('other');

      component.onTargetChange({ gid: 'whg:1', label: 'Rome' });

      expect(component.form.scope().value()).toBe('whg');
    });

    it('should not change scope for a manually entered target', async () => {
      const { component } = await setup({
        id: { target: { gid: 'http://x.org/1', label: 'x' }, scope: 'other' },
      });
      component.onExtItemPick({
        configs: EXT_CONFIGS,
        config: EXT_CONFIGS[1],
        item: {},
        itemId: 'whg:1',
        itemLabel: 'Rome',
      });

      component.onTargetChange({ gid: 'http://manual.org/2', label: 'y' });

      expect(component.form.scope().value()).toBe('other');
    });

    it('should set scope from the first change of provider when empty', async () => {
      const { component } = await setup({
        id: { target: { gid: 'http://x.org/1', label: 'x' } },
      });

      component.onExtLookupConfigChange(EXT_CONFIGS[1]);

      expect(component.selectedExtProviderId()).toBe('whg');
      expect(component.form.scope().value()).toBe('whg');
    });
  });
});
