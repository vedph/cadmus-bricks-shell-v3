import { render } from '@testing-library/angular';
import { of } from 'rxjs';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { RefLookupConfig, RefLookupService } from '@myrmidon/cadmus-refs-lookup';

import { AssertedChronotopeSetComponent } from './asserted-chronotope-set.component';
import { AssertedChronotope } from '../asserted-chronotope/asserted-chronotope.component';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// the signal-forms FieldTree tags each array-of-object item it adopts
// with a hidden identity Symbol (see signal-forms-migration.md); strip it
// via a JSON round-trip before comparing array-field reads with toEqual.
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

describe('AssertedChronotopeSetComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedChronotopeSetComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should start with an empty entries list and no editor open', async () => {
    const { fixture } = await render(AssertedChronotopeSetComponent);
    const component = fixture.componentInstance;

    expect(clean(component.form.entries().value())).toEqual([]);
    expect(component.editedIndex()).toBe(-1);
    expect(component.edited()).toBeUndefined();
  });

  it('should populate entries and mark the form pristine when chronotopes is set', async () => {
    const { fixture } = await render(AssertedChronotopeSetComponent);
    const component = fixture.componentInstance;
    const chronotopes: AssertedChronotope[] = [{ place: { value: 'Rome' } }];

    component.chronotopes.set(chronotopes);
    fixture.detectChanges();

    expect(clean(component.form.entries().value())).toEqual(chronotopes);
    expect(component.form().dirty()).toBe(false);
  });

  it('should reset the form when chronotopes is set to undefined', async () => {
    const { fixture } = await render(AssertedChronotopeSetComponent);
    const component = fixture.componentInstance;

    component.chronotopes.set([{ place: { value: 'Rome' } }]);
    fixture.detectChanges();

    component.chronotopes.set(undefined);
    fixture.detectChanges();

    expect(clean(component.form.entries().value())).toEqual([]);
  });

  describe('editor lifecycle', () => {
    it('addChronotope should open a new, empty editor', async () => {
      const { fixture } = await render(AssertedChronotopeSetComponent);
      const component = fixture.componentInstance;

      component.addChronotope();

      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toEqual({});
    });

    it('editChronotope should open the editor with a deep copy of the entry', async () => {
      const { fixture } = await render(AssertedChronotopeSetComponent);
      const component = fixture.componentInstance;
      const chronotope: AssertedChronotope = { place: { value: 'Rome' } };

      component.editChronotope(chronotope, 3);

      expect(component.editedIndex()).toBe(3);
      expect(component.edited()).toEqual(chronotope);
      expect(component.edited()).not.toBe(chronotope);
    });

    it('closeChronotope should close the editor', async () => {
      const { fixture } = await render(AssertedChronotopeSetComponent);
      const component = fixture.componentInstance;

      component.addChronotope();
      component.closeChronotope();

      expect(component.editedIndex()).toBe(-1);
      expect(component.edited()).toBeUndefined();
    });

    it('onChronotopeChange should update the edited signal', async () => {
      const { fixture } = await render(AssertedChronotopeSetComponent);
      const component = fixture.componentInstance;
      const chronotope: AssertedChronotope = { place: { value: 'Rome' } };

      component.onChronotopeChange(chronotope);

      expect(component.edited()).toEqual(chronotope);
    });
  });

  describe('onChronotopeSave', () => {
    it('should do nothing when there is nothing edited', async () => {
      const { fixture } = await render(AssertedChronotopeSetComponent);
      const component = fixture.componentInstance;

      component.onChronotopeSave();

      expect(clean(component.form.entries().value())).toEqual([]);
    });

    it('should do nothing when edited is an empty object', async () => {
      const { fixture } = await render(AssertedChronotopeSetComponent);
      const component = fixture.componentInstance;

      component.addChronotope();
      component.onChronotopeSave();

      expect(clean(component.form.entries().value())).toEqual([]);
      // editor remains open since the save was rejected
      expect(component.edited()).toEqual({});
    });

    it('should push a new chronotope and close the editor when adding', async () => {
      const { fixture } = await render(AssertedChronotopeSetComponent);
      const component = fixture.componentInstance;
      const chronotope: AssertedChronotope = { place: { value: 'Rome' } };

      component.addChronotope();
      component.onChronotopeChange(chronotope);
      component.onChronotopeSave();

      expect(clean(component.form.entries().value())).toEqual([chronotope]);
      expect(component.chronotopes()).toEqual([chronotope]);
      expect(component.edited()).toBeUndefined();
      expect(component.editedIndex()).toBe(-1);
    });

    it('should replace the chronotope at its index when editing', async () => {
      const { fixture } = await render(AssertedChronotopeSetComponent);
      const component = fixture.componentInstance;
      const first: AssertedChronotope = { place: { value: 'Rome' } };
      const second: AssertedChronotope = { place: { value: 'Athens' } };
      component.chronotopes.set([first]);
      fixture.detectChanges();

      component.editChronotope(first, 0);
      component.onChronotopeChange(second);
      component.onChronotopeSave();

      expect(clean(component.form.entries().value())).toEqual([second]);
      expect(component.chronotopes()).toEqual([second]);
    });
  });

  describe('deleteChronotope', () => {
    it('should remove the entry when the user confirms', async () => {
      const confirm = vi.fn().mockReturnValue(of(true));
      const { fixture } = await render(AssertedChronotopeSetComponent, {
        providers: [{ provide: DialogService, useValue: { confirm } }],
      });
      const component = fixture.componentInstance;
      component.chronotopes.set([
        { place: { value: 'Rome' } },
        { place: { value: 'Athens' } },
      ]);
      fixture.detectChanges();

      component.deleteChronotope(0);

      expect(confirm).toHaveBeenCalled();
      expect(clean(component.form.entries().value())).toEqual([{ place: { value: 'Athens' } }]);
      expect(component.chronotopes()).toEqual([{ place: { value: 'Athens' } }]);
    });

    it('should not remove the entry when the user cancels', async () => {
      const confirm = vi.fn().mockReturnValue(of(false));
      const { fixture } = await render(AssertedChronotopeSetComponent, {
        providers: [{ provide: DialogService, useValue: { confirm } }],
      });
      const component = fixture.componentInstance;
      component.chronotopes.set([{ place: { value: 'Rome' } }]);
      fixture.detectChanges();

      component.deleteChronotope(0);

      expect(clean(component.form.entries().value())).toEqual([{ place: { value: 'Rome' } }]);
    });
  });

  describe('reordering', () => {
    it('moveChronotopeUp should swap with the previous entry', async () => {
      const { fixture } = await render(AssertedChronotopeSetComponent);
      const component = fixture.componentInstance;
      const a: AssertedChronotope = { place: { value: 'A' } };
      const b: AssertedChronotope = { place: { value: 'B' } };
      component.chronotopes.set([a, b]);
      fixture.detectChanges();

      component.moveChronotopeUp(1);

      expect(clean(component.form.entries().value())).toEqual([b, a]);
      expect(component.chronotopes()).toEqual([b, a]);
    });

    it('moveChronotopeUp should be a no-op at index 0', async () => {
      const { fixture } = await render(AssertedChronotopeSetComponent);
      const component = fixture.componentInstance;
      const a: AssertedChronotope = { place: { value: 'A' } };
      const b: AssertedChronotope = { place: { value: 'B' } };
      component.chronotopes.set([a, b]);
      fixture.detectChanges();

      component.moveChronotopeUp(0);

      expect(clean(component.form.entries().value())).toEqual([a, b]);
    });

    it('moveChronotopeDown should swap with the next entry', async () => {
      const { fixture } = await render(AssertedChronotopeSetComponent);
      const component = fixture.componentInstance;
      const a: AssertedChronotope = { place: { value: 'A' } };
      const b: AssertedChronotope = { place: { value: 'B' } };
      component.chronotopes.set([a, b]);
      fixture.detectChanges();

      component.moveChronotopeDown(0);

      expect(clean(component.form.entries().value())).toEqual([b, a]);
      expect(component.chronotopes()).toEqual([b, a]);
    });

    it('moveChronotopeDown should be a no-op at the last index', async () => {
      const { fixture } = await render(AssertedChronotopeSetComponent);
      const component = fixture.componentInstance;
      const a: AssertedChronotope = { place: { value: 'A' } };
      const b: AssertedChronotope = { place: { value: 'B' } };
      component.chronotopes.set([a, b]);
      fixture.detectChanges();

      component.moveChronotopeDown(1);

      expect(clean(component.form.entries().value())).toEqual([a, b]);
    });
  });

  describe('place label resolution', () => {
    it('should reset placeLabels when there is no lookup config', async () => {
      const { fixture } = await render(AssertedChronotopeSetComponent);
      const component = fixture.componentInstance;

      component.chronotopes.set([{ place: { value: 'r1' } }]);
      fixture.detectChanges();

      expect(component.placeLabels()).toEqual({});
    });

    it('should resolve and cache a place label via the lookup config service', async () => {
      const service: Partial<RefLookupService> = {
        id: 'mock',
        getById: vi.fn().mockReturnValue(of({ id: 'r1', name: 'Rome' })),
      };
      const cfg: Partial<RefLookupConfig> = {
        service: service as RefLookupService,
        itemIdGetter: (item: any) => item.id,
        itemIdParser: (id: string) => id,
        itemLabelGetter: (item: any) => item.name,
      };

      const { fixture } = await render(AssertedChronotopeSetComponent, {
        inputs: { placeLookupConfig: cfg as RefLookupConfig },
      });
      const component = fixture.componentInstance;

      component.chronotopes.set([{ place: { value: 'r1' } }]);
      fixture.detectChanges();
      await wait(0);
      fixture.detectChanges();

      expect(service.getById).toHaveBeenCalledWith('r1');
      expect(component.placeLabels()['r1']).toBe('Rome (r1)');
    });
  });
});
