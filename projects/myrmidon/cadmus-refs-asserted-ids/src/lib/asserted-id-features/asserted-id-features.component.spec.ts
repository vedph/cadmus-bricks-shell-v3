import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { vi } from 'vitest';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { ThesaurusEntriesPickerComponent } from '@myrmidon/cadmus-thesaurus-store';
import { TaxoStoreNode } from '@myrmidon/taxo-store-api';
import { TaxoStorePicker } from '@myrmidon/taxo-store-picker';
import {
  ThesOrTaxoPicker,
  ThesOrTaxoSettings,
  ThesOrTaxoSourceService,
} from '@myrmidon/cadmus-ui-thestaxo';

import { AssertedIdFeaturesComponent } from './asserted-id-features.component';
import {
  ASSERTED_ID_FEATURE_SETTINGS,
  provideAssertedIdFeatureSettings,
  resolveAssertedIdFeatureSettings,
} from './asserted-id-feature-settings';

// stand-in for the TaxoStore picker, which requires the TaxoStore API
@Component({ selector: 'ts-taxo-store-picker', template: '' })
class FakeTaxoStorePicker {
  public readonly treeId = input<string | null>();
  public readonly label = input<string>();
  public readonly hasTopNodeFilter = input(true);
  public readonly hasFeaturesFilter = input(true);
  public readonly canEdit = input(true);
  public readonly canAdd = input(true);
  public readonly canDelete = input(true);
  public readonly nodePick = output<TaxoStoreNode | null>();
}

const ENTRIES: ThesaurusEntry[] = [
  { id: 'buyer', value: 'buyer' },
  { id: 'seller', value: 'seller' },
];
const REMOTE_ENTRIES: ThesaurusEntry[] = [{ id: 'artist', value: 'artist' }];
const NODE_LABELS: { [key: string]: string } = {
  'roles/painter': 'Painter',
  'roles/sculptor': 'Sculptor',
};

function createSourceMock() {
  return {
    getThesaurusEntries: vi.fn((id: string) =>
      of(id === 'roles@en' ? REMOTE_ENTRIES : []),
    ),
    getTaxoNodeLabel: vi.fn(
      (tree: string, key: string): Observable<string | null> =>
        of(NODE_LABELS[`${tree}/${key}`] ?? null),
    ),
    setTaxoNodeLabel: vi.fn(),
  };
}

describe('AssertedIdFeaturesComponent', () => {
  let source: ReturnType<typeof createSourceMock>;

  async function create(
    inputs: { [key: string]: unknown } = {},
    appSettings?: ThesOrTaxoSettings,
  ): Promise<ComponentFixture<AssertedIdFeaturesComponent>> {
    source = createSourceMock();
    TestBed.configureTestingModule({
      imports: [AssertedIdFeaturesComponent],
      providers: [
        { provide: ThesOrTaxoSourceService, useValue: source },
        ...(appSettings ? [provideAssertedIdFeatureSettings(appSettings)] : []),
      ],
    }).overrideComponent(ThesOrTaxoPicker, {
      remove: { imports: [TaxoStorePicker] },
      add: { imports: [FakeTaxoStorePicker] },
    });
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(AssertedIdFeaturesComponent);
    for (const [k, v] of Object.entries(inputs)) {
      fixture.componentRef.setInput(k, v);
    }
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function query(fixture: ComponentFixture<unknown>, selector: string) {
    return fixture.nativeElement.querySelector(selector);
  }

  describe('settings', () => {
    it('should default to thesaurus mode', () => {
      expect(resolveAssertedIdFeatureSettings()).toEqual({ mode: 'thesaurus' });
    });

    it('should let input settings override app settings', () => {
      expect(
        resolveAssertedIdFeatureSettings(
          { mode: 'taxonomy', source: 'roles', canAddNode: true },
          { source: 'other', canAddNode: undefined },
        ),
      ).toEqual({ mode: 'taxonomy', source: 'other', canAddNode: true });
    });

    it('should use the app settings when provided', async () => {
      const fixture = await create({}, { mode: 'taxonomy', source: 'roles' });

      expect(TestBed.inject(ASSERTED_ID_FEATURE_SETTINGS)).toEqual({
        mode: 'taxonomy',
        source: 'roles',
      });
      expect(fixture.componentInstance.view()).toBe('taxonomy');
    });

    it('should let the settings input override the app settings', async () => {
      const fixture = await create(
        { settings: { mode: 'thesaurus', source: null }, entries: ENTRIES },
        { mode: 'taxonomy', source: 'roles' },
      );

      // null overrides nothing, so source is still 'roles'
      expect(fixture.componentInstance.currentSettings()).toEqual({
        mode: 'thesaurus',
        source: 'roles',
      });
    });
  });

  describe('thesaurus mode', () => {
    it('should render nothing without entries', async () => {
      const fixture = await create({ features: ['buyer'] });

      expect(fixture.componentInstance.view()).toBeNull();
      expect(query(fixture, 'fieldset')).toBeNull();
    });

    it('should render nothing with empty entries', async () => {
      const fixture = await create({ entries: [] });

      expect(query(fixture, 'fieldset')).toBeNull();
    });

    it('should render the entries picker with the provided entries', async () => {
      const fixture = await create({ entries: ENTRIES, features: ['seller'] });

      const picker = fixture.debugElement.query(
        By.directive(ThesaurusEntriesPickerComponent),
      ).componentInstance as ThesaurusEntriesPickerComponent;
      expect(picker.availableEntries()).toEqual(ENTRIES);
      expect(picker.entries()).toEqual([ENTRIES[1]]);
      expect(source.getThesaurusEntries).not.toHaveBeenCalled();
    });

    it('should keep the stored order and unknown features', async () => {
      const fixture = await create({
        entries: ENTRIES,
        features: ['seller', 'legacy', 'buyer'],
      });

      expect(fixture.componentInstance.pickedEntries()).toEqual([
        ENTRIES[1],
        { id: 'legacy', value: 'legacy' },
        ENTRIES[0],
      ]);
    });

    it('should not lose unknown features when picking entries', async () => {
      const fixture = await create({
        entries: ENTRIES,
        features: ['legacy'],
      });
      const component = fixture.componentInstance;
      const picker = fixture.debugElement.query(
        By.directive(ThesaurusEntriesPickerComponent),
      ).componentInstance as ThesaurusEntriesPickerComponent;

      // as the picker does when the user picks an entry
      picker.entries.set([...picker.entries(), ENTRIES[0]]);

      expect(component.features()).toEqual(['legacy', 'buyer']);
    });

    it('should load the thesaurus specified by settings', async () => {
      const fixture = await create({
        entries: ENTRIES,
        settings: { mode: 'thesaurus', source: 'roles@en' },
      });

      expect(source.getThesaurusEntries).toHaveBeenCalledWith('roles@en');
      expect(fixture.componentInstance.thesEntries()).toEqual(REMOTE_ENTRIES);
      expect(fixture.componentInstance.labelEntries()).toBeUndefined();
      expect(fixture.componentInstance.view()).toBe('thesaurus');
    });

    it('should render nothing when the thesaurus specified by settings is empty', async () => {
      const fixture = await create({
        entries: ENTRIES,
        settings: { mode: 'thesaurus', source: 'missing@en' },
      });

      expect(fixture.componentInstance.view()).toBeNull();
    });
  });

  describe('taxonomy mode', () => {
    const TAXO: ThesOrTaxoSettings = { mode: 'taxonomy', source: 'roles' };

    it('should render nothing without a tree ID', async () => {
      const fixture = await create({ settings: { mode: 'taxonomy' } });

      expect(fixture.componentInstance.view()).toBeNull();
      expect(query(fixture, 'fieldset')).toBeNull();
    });

    it('should show the picked features with their labels', async () => {
      const fixture = await create({
        settings: TAXO,
        features: ['painter', 'unknown'],
      });

      const chips = fixture.nativeElement.querySelectorAll('mat-chip');
      expect(chips.length).toBe(2);
      expect(chips[0].textContent).toContain('Painter');
      // a key without label is shown as such
      expect(chips[1].textContent).toContain('unknown');
      expect(source.getTaxoNodeLabel).toHaveBeenCalledWith('roles', 'painter');
    });

    it('should pass the settings to the taxonomy picker', async () => {
      const settings = { ...TAXO, canAddNode: true };
      const fixture = await create({ settings });

      const picker = fixture.debugElement.query(By.directive(ThesOrTaxoPicker))
        .componentInstance as ThesOrTaxoPicker;
      expect(picker.currentMode()).toBe('taxonomy');
      expect(picker.currentSource()).toBe('roles');
      expect(picker.currentCanAddNode()).toBe(true);
      expect(picker.fallbackToUnbound()).toBe(false);
    });

    it('should add a picked node and reset the picker', async () => {
      const fixture = await create({ settings: TAXO, features: ['painter'] });
      const component = fixture.componentInstance;
      const picker = fixture.debugElement.query(By.directive(ThesOrTaxoPicker))
        .componentInstance as ThesOrTaxoPicker;
      const taxoPicker = fixture.debugElement.query(
        By.directive(FakeTaxoStorePicker),
      ).componentInstance as FakeTaxoStorePicker;

      taxoPicker.nodePick.emit({
        key: 'sculptor',
        label: 'Sculptor',
      } as TaxoStoreNode);
      fixture.detectChanges();

      expect(component.features()).toEqual(['painter', 'sculptor']);
      expect(picker.value()).toBe('');

      // the same node can be picked again, with no duplicates
      taxoPicker.nodePick.emit({
        key: 'sculptor',
        label: 'Sculptor',
      } as TaxoStoreNode);
      fixture.detectChanges();
      expect(component.features()).toEqual(['painter', 'sculptor']);
    });

    it('should remove a feature', async () => {
      const fixture = await create({
        settings: TAXO,
        features: ['painter', 'sculptor'],
      });

      const remove = fixture.nativeElement.querySelector(
        'mat-chip button[matChipRemove]',
      ) as HTMLButtonElement;
      remove.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.features()).toEqual(['sculptor']);
    });
  });

  describe('unbound mode', () => {
    it('should add typed features, trimmed and without duplicates', async () => {
      const fixture = await create({
        settings: { mode: 'unbound' },
        features: ['a'],
      });
      const component = fixture.componentInstance;

      component.typedFeature.set('  b ');
      component.addTypedFeature();
      component.typedFeature.set('a');
      component.addTypedFeature();
      component.typedFeature.set('   ');
      component.addTypedFeature();

      expect(component.features()).toEqual(['a', 'b']);
      expect(component.typedFeature()).toBe('');
    });

    it('should show typed features as they are', async () => {
      const fixture = await create({
        settings: { mode: 'unbound' },
        features: ['free'],
      });

      expect(query(fixture, 'mat-chip').textContent).toContain('free');
      expect(source.getTaxoNodeLabel).not.toHaveBeenCalled();
      expect(fixture.debugElement.query(By.directive(ThesOrTaxoPicker))).toBeNull();
    });
  });
});
