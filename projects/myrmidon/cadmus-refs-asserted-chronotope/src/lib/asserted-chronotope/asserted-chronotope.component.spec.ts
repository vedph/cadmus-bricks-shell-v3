import { render } from '@testing-library/angular';

import {
  AssertedChronotope,
  AssertedChronotopeComponent,
} from './asserted-chronotope.component';
import { RefLookupConfig } from '@myrmidon/cadmus-refs-lookup';
import { HistoricalDateModel } from '@myrmidon/cadmus-refs-historical-date';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('AssertedChronotopeComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(AssertedChronotopeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialize form controls with default (unset) state', async () => {
    const { fixture } = await render(AssertedChronotopeComponent);
    const component = fixture.componentInstance;

    expect(component.hasPlace.value).toBe(false);
    expect(component.plTag.value).toBeNull();
    expect(component.plAssertion.value).toBeNull();
    expect(component.place.value).toBeNull();

    expect(component.hasDate.value).toBe(false);
    expect(component.dtTag.value).toBeNull();
    expect(component.dtAssertion.value).toBeNull();
    expect(component.date.value).toBeNull();

    expect(component.placeExpanded()).toBe(false);
    expect(component.dateExpanded()).toBe(false);
  });

  it('should populate the place form when chronotope has a place', async () => {
    const { fixture } = await render(AssertedChronotopeComponent);
    const component = fixture.componentInstance;

    const chronotope: AssertedChronotope = {
      place: { tag: 'tag1', value: 'Rome' },
    };
    component.chronotope.set(chronotope);
    fixture.detectChanges();

    expect(component.hasPlace.value).toBe(true);
    expect(component.plTag.value).toBe('tag1');
    expect(component.place.value).toBe('Rome');
    expect(component.hasDate.value).toBe(false);
    expect(component.plForm.pristine).toBe(true);
  });

  it('should populate the date form when chronotope has a date', async () => {
    const { fixture } = await render(AssertedChronotopeComponent);
    const component = fixture.componentInstance;

    const date: HistoricalDateModel = { a: { value: 1200 } };
    const chronotope: AssertedChronotope = {
      date: { ...date, tag: 'dtag' },
    };
    component.chronotope.set(chronotope);
    fixture.detectChanges();

    expect(component.hasDate.value).toBe(true);
    expect(component.dtTag.value).toBe('dtag');
    expect(component.date.value).toEqual(chronotope.date);
    expect(component.hasPlace.value).toBe(false);
    expect(component.dtForm.pristine).toBe(true);
  });

  it('should reset both forms when chronotope is set to undefined', async () => {
    const { fixture } = await render(AssertedChronotopeComponent);
    const component = fixture.componentInstance;

    component.chronotope.set({ place: { value: 'Rome' } });
    fixture.detectChanges();

    component.chronotope.set(undefined);
    fixture.detectChanges();

    expect(component.hasPlace.value).toBe(false);
    expect(component.place.value).toBeNull();
    expect(component.placeItemId()).toBeUndefined();
    expect(component.placeDisplayLabel()).toBeUndefined();
  });

  it('should collapse both editors whenever chronotope changes', async () => {
    const { fixture } = await render(AssertedChronotopeComponent);
    const component = fixture.componentInstance;

    component.placeExpanded.set(true);
    component.dateExpanded.set(true);

    component.chronotope.set({ place: { value: 'Rome' } });
    fixture.detectChanges();

    expect(component.placeExpanded()).toBe(false);
    expect(component.dateExpanded()).toBe(false);
  });

  describe('place editing', () => {
    it('editPlace should populate place/plAssertion from current chronotope and expand', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;

      component.chronotope.set({
        place: { value: 'Rome', assertion: { rank: 1 } as any },
      });
      fixture.detectChanges();

      component.editPlace();

      expect(component.place.value).toBe('Rome');
      expect(component.plAssertion.value).toEqual({ rank: 1 });
      expect(component.placeExpanded()).toBe(true);
    });

    it('onPlAssertionChange should update plAssertion control', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;

      component.onPlAssertionChange({ rank: 2 } as any);
      expect(component.plAssertion.value).toEqual({ rank: 2 });

      component.onPlAssertionChange(undefined);
      expect(component.plAssertion.value).toBeNull();
    });

    it('closePlace should collapse the place editor', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;

      component.placeExpanded.set(true);
      component.closePlace();

      expect(component.placeExpanded()).toBe(false);
    });

    it('savePlace should save and collapse when the place form is valid', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;

      component.place.setValue('  Rome  ');
      component.plTag.setValue('  t1  ');
      component.placeExpanded.set(true);

      component.savePlace();

      expect(component.hasPlace.value).toBe(true);
      expect(component.placeExpanded()).toBe(false);
      expect(component.chronotope()?.place).toEqual({
        tag: 't1',
        value: 'Rome',
        assertion: undefined,
      });
    });

    it('savePlace should uncheck hasPlace and collapse when the place form is invalid', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;

      // place is required: leaving it empty makes the form invalid
      component.place.setValue(null);
      component.placeExpanded.set(true);

      component.savePlace();

      expect(component.hasPlace.value).toBe(false);
      expect(component.placeExpanded()).toBe(false);
    });

    it('onPlaceLookupChange should set place id and label from a lookup item', async () => {
      const cfg: Partial<RefLookupConfig> = {
        itemIdGetter: (item: any) => item.id,
        itemLabelGetter: (item: any) => item.name,
      };
      const { fixture } = await render(AssertedChronotopeComponent, {
        inputs: { placeLookupConfig: cfg as RefLookupConfig },
      });
      const component = fixture.componentInstance;

      component.onPlaceLookupChange({ id: 'r1', name: 'Rome' });

      expect(component.place.value).toBe('r1');
      expect(component.placeDisplayLabel()).toBe('Rome (r1)');
      expect(component.place.dirty).toBe(true);
    });

    it('onPlaceLookupChange should just use the id as label when label equals id', async () => {
      const cfg: Partial<RefLookupConfig> = {
        itemIdGetter: (item: any) => item.id,
        itemLabelGetter: (item: any) => item.id,
      };
      const { fixture } = await render(AssertedChronotopeComponent, {
        inputs: { placeLookupConfig: cfg as RefLookupConfig },
      });
      const component = fixture.componentInstance;

      component.onPlaceLookupChange({ id: 'r1' });

      expect(component.place.value).toBe('r1');
      expect(component.placeDisplayLabel()).toBe('r1');
    });

    it('onPlaceLookupChange should clear place and label when item is falsy', async () => {
      const cfg: Partial<RefLookupConfig> = {
        itemIdGetter: (item: any) => item.id,
      };
      const { fixture } = await render(AssertedChronotopeComponent, {
        inputs: { placeLookupConfig: cfg as RefLookupConfig },
      });
      const component = fixture.componentInstance;

      component.onPlaceLookupChange(null);

      expect(component.place.value).toBeNull();
      expect(component.placeDisplayLabel()).toBeUndefined();
    });

    it('onPlaceLookupChange should clear place when cfg has no itemIdGetter', async () => {
      const { fixture } = await render(AssertedChronotopeComponent, {
        inputs: { placeLookupConfig: {} as RefLookupConfig },
      });
      const component = fixture.componentInstance;

      component.onPlaceLookupChange({ id: 'x' });

      expect(component.place.value).toBeNull();
      expect(component.placeDisplayLabel()).toBeUndefined();
    });

    it('should resolve placeItemId via itemIdParser when placeLookupConfig is set', async () => {
      const cfg: Partial<RefLookupConfig> = {
        itemIdParser: (id: string) => id.replace('prefix:', ''),
      };
      const { fixture } = await render(AssertedChronotopeComponent, {
        inputs: { placeLookupConfig: cfg as RefLookupConfig },
      });
      const component = fixture.componentInstance;

      component.chronotope.set({ place: { value: 'prefix:r1' } });
      fixture.detectChanges();

      expect(component.placeItemId()).toBe('r1');
    });

    it('should use the raw place value as placeItemId when no itemIdParser is set', async () => {
      const { fixture } = await render(AssertedChronotopeComponent, {
        inputs: { placeLookupConfig: {} as RefLookupConfig },
      });
      const component = fixture.componentInstance;

      component.chronotope.set({ place: { value: 'r1' } });
      fixture.detectChanges();

      expect(component.placeItemId()).toBe('r1');
    });
  });

  describe('date editing', () => {
    it('editDate should populate date/dtAssertion from current chronotope and expand', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;

      const date: HistoricalDateModel = { a: { value: 500 } };
      component.chronotope.set({
        date: { ...date, assertion: { rank: 3 } as any },
      });
      fixture.detectChanges();

      component.editDate();

      expect(component.date.value).toEqual({ ...date, assertion: { rank: 3 } });
      expect(component.dtAssertion.value).toEqual({ rank: 3 });
      expect(component.dateExpanded()).toBe(true);
    });

    it('onDtAssertionChange should update dtAssertion control', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;

      component.onDtAssertionChange({ rank: 4 } as any);
      expect(component.dtAssertion.value).toEqual({ rank: 4 });

      component.onDtAssertionChange(undefined);
      expect(component.dtAssertion.value).toBeNull();
    });

    it('onDateChange should update the date control and mark it dirty', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;
      const date: HistoricalDateModel = { a: { value: 100 } };

      component.onDateChange(date);

      expect(component.date.value).toEqual(date);
      expect(component.date.dirty).toBe(true);
    });

    it('closeDate should collapse the date editor', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;

      component.dateExpanded.set(true);
      component.closeDate();

      expect(component.dateExpanded()).toBe(false);
    });

    it('saveDate should save and collapse when the date form is valid', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;
      const date: HistoricalDateModel = { a: { value: 900 } };

      component.date.setValue(date);
      component.dtTag.setValue('  dtag  ');
      component.dateExpanded.set(true);

      component.saveDate();

      expect(component.hasDate.value).toBe(true);
      expect(component.dateExpanded()).toBe(false);
      expect(component.chronotope()?.date).toEqual({
        ...date,
        tag: 'dtag',
        assertion: undefined,
      });
    });

    it('saveDate should uncheck hasDate and collapse when the date form is invalid', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;

      // date is required: leaving it null makes the form invalid
      component.date.setValue(null);
      component.dateExpanded.set(true);

      component.saveDate();

      expect(component.hasDate.value).toBe(false);
      expect(component.dateExpanded()).toBe(false);
    });
  });

  describe('hasPlace/hasDate checkbox reactivity', () => {
    it('checking hasPlace on an empty chronotope should auto-open the place editor', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;

      component.hasPlace.setValue(true);
      await wait(400);
      fixture.detectChanges();

      expect(component.placeExpanded()).toBe(true);
    });

    it('unchecking hasPlace should reset the place form and update the chronotope', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;

      component.chronotope.set({ place: { value: 'Rome' } });
      fixture.detectChanges();

      component.hasPlace.setValue(false);
      await wait(400);
      fixture.detectChanges();

      expect(component.place.value).toBeNull();
      expect(component.chronotope()?.place).toBeUndefined();
    });

    it('checking hasDate on an empty chronotope should auto-open the date editor', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;

      component.hasDate.setValue(true);
      await wait(400);
      fixture.detectChanges();

      expect(component.dateExpanded()).toBe(true);
    });

    it('unchecking hasDate should reset the date form and update the chronotope', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;
      const date: HistoricalDateModel = { a: { value: 1000 } };

      component.chronotope.set({ date });
      fixture.detectChanges();

      component.hasDate.setValue(false);
      await wait(400);
      fixture.detectChanges();

      // note: unlike the plain place <input>, the nested
      // cadmus-refs-historical-date component echoes back its (falsy) date
      // input via (dateChange), which ends up setting the control to
      // `undefined` rather than the `null` set by date.reset() itself.
      expect(component.date.value).toBeFalsy();
      expect(component.chronotope()?.date).toBeUndefined();
    });
  });
});
