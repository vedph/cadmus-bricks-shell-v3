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

    expect(component.hasPlace()).toBe(false);
    expect(component.plForm.tag().value()).toBe('');
    expect(component.plForm.assertion().value()).toBeNull();
    expect(component.plForm.place().value()).toBe('');

    expect(component.hasDate()).toBe(false);
    expect(component.dtForm.tag().value()).toBe('');
    expect(component.dtForm.assertion().value()).toBeNull();
    expect(component.dtForm.date().value()).toBeNull();

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

    expect(component.hasPlace()).toBe(true);
    expect(component.plForm.tag().value()).toBe('tag1');
    expect(component.plForm.place().value()).toBe('Rome');
    expect(component.hasDate()).toBe(false);
    expect(component.plForm().dirty()).toBe(false);
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

    expect(component.hasDate()).toBe(true);
    expect(component.dtForm.tag().value()).toBe('dtag');
    expect(component.dtForm.date().value()).toEqual(chronotope.date);
    expect(component.hasPlace()).toBe(false);
    expect(component.dtForm().dirty()).toBe(false);
  });

  it('should reset both forms when chronotope is set to undefined', async () => {
    const { fixture } = await render(AssertedChronotopeComponent);
    const component = fixture.componentInstance;

    component.chronotope.set({ place: { value: 'Rome' } });
    fixture.detectChanges();

    component.chronotope.set(undefined);
    fixture.detectChanges();

    expect(component.hasPlace()).toBe(false);
    expect(component.plForm.place().value()).toBe('');
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

      expect(component.plForm.place().value()).toBe('Rome');
      expect(component.plForm.assertion().value()).toEqual({ rank: 1 });
      expect(component.placeExpanded()).toBe(true);
    });

    it('onPlAssertionChange should update plAssertion control', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;

      component.onPlAssertionChange({ rank: 2 } as any);
      expect(component.plForm.assertion().value()).toEqual({ rank: 2 });

      component.onPlAssertionChange(undefined);
      expect(component.plForm.assertion().value()).toBeNull();
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

      component.plForm.place().value.set('  Rome  ');
      component.plForm.tag().value.set('  t1  ');
      component.placeExpanded.set(true);

      component.savePlace();

      expect(component.hasPlace()).toBe(true);
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
      component.plForm.place().value.set('');
      component.placeExpanded.set(true);

      component.savePlace();

      expect(component.hasPlace()).toBe(false);
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

      expect(component.plForm.place().value()).toBe('r1');
      expect(component.placeDisplayLabel()).toBe('Rome (r1)');
      expect(component.plForm.place().dirty()).toBe(true);
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

      expect(component.plForm.place().value()).toBe('r1');
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

      expect(component.plForm.place().value()).toBe('');
      expect(component.placeDisplayLabel()).toBeUndefined();
    });

    it('onPlaceLookupChange should clear place when cfg has no itemIdGetter', async () => {
      const { fixture } = await render(AssertedChronotopeComponent, {
        inputs: { placeLookupConfig: {} as RefLookupConfig },
      });
      const component = fixture.componentInstance;

      component.onPlaceLookupChange({ id: 'x' });

      expect(component.plForm.place().value()).toBe('');
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

      expect(component.dtForm.date().value()).toEqual({
        ...date,
        assertion: { rank: 3 },
      });
      expect(component.dtForm.assertion().value()).toEqual({ rank: 3 });
      expect(component.dateExpanded()).toBe(true);
    });

    it('onDtAssertionChange should update dtAssertion control', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;

      component.onDtAssertionChange({ rank: 4 } as any);
      expect(component.dtForm.assertion().value()).toEqual({ rank: 4 });

      component.onDtAssertionChange(undefined);
      expect(component.dtForm.assertion().value()).toBeNull();
    });

    it('onDateChange should update the date control and mark it dirty', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;
      const date: HistoricalDateModel = { a: { value: 100 } };

      component.onDateChange(date);

      expect(component.dtForm.date().value()).toEqual(date);
      expect(component.dtForm.date().dirty()).toBe(true);
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

      component.dtForm.date().value.set(date);
      component.dtForm.tag().value.set('  dtag  ');
      component.dateExpanded.set(true);

      component.saveDate();

      expect(component.hasDate()).toBe(true);
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
      component.dtForm.date().value.set(null);
      component.dateExpanded.set(true);

      component.saveDate();

      expect(component.hasDate()).toBe(false);
      expect(component.dateExpanded()).toBe(false);
    });
  });

  describe('hasPlace/hasDate checkbox reactivity', () => {
    it('checking hasPlace on an empty chronotope should auto-open the place editor', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;

      component.onHasPlaceChange(true);
      await wait(50);
      fixture.detectChanges();

      expect(component.placeExpanded()).toBe(true);
    });

    it('unchecking hasPlace should reset the place form and update the chronotope', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;

      component.chronotope.set({ place: { value: 'Rome' } });
      fixture.detectChanges();

      component.onHasPlaceChange(false);
      fixture.detectChanges();

      expect(component.plForm.place().value()).toBe('');
      expect(component.chronotope()?.place).toBeUndefined();
    });

    it('checking hasDate on an empty chronotope should auto-open the date editor', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;

      component.onHasDateChange(true);
      await wait(50);
      fixture.detectChanges();

      expect(component.dateExpanded()).toBe(true);
    });

    it('unchecking hasDate should reset the date form and update the chronotope', async () => {
      const { fixture } = await render(AssertedChronotopeComponent);
      const component = fixture.componentInstance;
      const date: HistoricalDateModel = { a: { value: 1000 } };

      component.chronotope.set({ date });
      fixture.detectChanges();

      component.onHasDateChange(false);
      fixture.detectChanges();

      expect(component.dtForm.date().value()).toBeNull();
      expect(component.chronotope()?.date).toBeUndefined();
    });
  });
});
