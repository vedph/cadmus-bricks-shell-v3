import { render } from '@testing-library/angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import {
  PhysicalGridCoords,
  PhysicalGridLocation,
  PhysicalGridLocationComponent,
} from './physical-grid-location.component';

async function setup(inputs?: Record<string, unknown>) {
  const { fixture } = await render(PhysicalGridLocationComponent, {
    providers: [provideNoopAnimations()],
    inputs,
  });
  await fixture.whenStable();
  return { fixture, component: fixture.componentInstance };
}

describe('PhysicalGridLocationComponent', () => {
  it('should render', async () => {
    const { component } = await setup();
    expect(component).toBeTruthy();
  });

  describe('defaults and form controls', () => {
    it('should default mode to contiguous', async () => {
      const { component } = await setup();
      expect(component.mode()).toBe('contiguous');
    });

    it('should default required to false', async () => {
      const { component } = await setup();
      expect(component.required()).toBe(false);
    });

    it('should initialize the form', async () => {
      const { component } = await setup();
      expect(component.form).toBeDefined();
      expect(component.form.preset).toBeDefined();
      expect(component.form.text).toBeDefined();
      expect(component.form.rowCount).toBeDefined();
      expect(component.form.columnCount).toBeDefined();
    });

    it('should default rowCount and columnCount to 1 when no location is set', async () => {
      const { component } = await setup();
      expect(component.form.rowCount().value()).toBe(1);
      expect(component.form.columnCount().value()).toBe(1);
    });

    it('should default text to empty string', async () => {
      const { component } = await setup();
      expect(component.form.text().value()).toBe('');
    });
  });

  describe('text validators', () => {
    it('should accept an empty text when not required', async () => {
      const { component } = await setup();
      component.form.text().value.set('');
      expect(component.form.text().valid()).toBe(true);
    });

    it('should accept a valid cells string', async () => {
      const { component } = await setup();
      component.form.text().value.set('A1 B2 C3');
      expect(component.form.text().valid()).toBe(true);
    });

    it('should reject a text not matching the cell pattern', async () => {
      const { component } = await setup();
      component.form.text().value.set('123');
      expect(component.form.text().invalid()).toBe(true);
      expect(component.form.text().getError('pattern')).toBeDefined();
    });

    it('should reject text with malformed tokens', async () => {
      const { component } = await setup();
      component.form.text().value.set('A1,B2');
      expect(component.form.text().invalid()).toBe(true);
    });

    it('should make text required when required input is true', async () => {
      const { component } = await setup({ required: true });
      component.form.text().value.set('');
      expect(component.form.text().invalid()).toBe(true);
      expect(component.form.text().getError('required')).toBeDefined();
    });

    it('should update validators reactively when required changes', async () => {
      const { fixture, component } = await setup({ required: false });
      component.form.text().value.set('');
      expect(component.form.text().valid()).toBe(true);

      fixture.componentRef.setInput('required', true);
      await fixture.whenStable();

      expect(component.form.text().getError('required')).toBeDefined();
    });
  });

  describe('location -> grid/text sync (effect)', () => {
    it('should update rowCount/columnCount from the location input', async () => {
      const location: PhysicalGridLocation = {
        rows: 4,
        columns: 5,
        coords: [{ row: 1, column: 1 }],
      };
      const { fixture, component } = await setup({ location });
      await fixture.whenStable();

      expect(component.form.rowCount().value()).toBe(4);
      expect(component.form.columnCount().value()).toBe(5);
    });

    it('should build the grid rows/columns to match the location dimensions', async () => {
      const location: PhysicalGridLocation = {
        rows: 2,
        columns: 3,
        coords: [],
      };
      const { fixture, component } = await setup({ location });
      await fixture.whenStable();

      const rows = component.rows();
      expect(rows.length).toBe(2);
      expect(rows[0].length).toBe(3);
      expect(rows[1].length).toBe(3);
    });

    it('should mark selected cells in the grid according to coords', async () => {
      const location: PhysicalGridLocation = {
        rows: 2,
        columns: 2,
        coords: [
          { row: 1, column: 1 },
          { row: 2, column: 2 },
        ],
      };
      const { fixture, component } = await setup({ location });
      await fixture.whenStable();

      const rows = component.rows();
      expect(rows[0][0].selected).toBe(true);
      expect(rows[0][0].ordinal).toBe(1);
      expect(rows[0][1].selected).toBe(false);
      expect(rows[0][1].ordinal).toBe(0);
      expect(rows[1][1].selected).toBe(true);
      expect(rows[1][1].ordinal).toBe(2);
    });

    it('should update the text control to the Excel-like representation', async () => {
      const location: PhysicalGridLocation = {
        rows: 3,
        columns: 3,
        coords: [
          { row: 1, column: 1 },
          { row: 2, column: 2 },
        ],
      };
      const { fixture, component } = await setup({ location });
      await fixture.whenStable();

      expect(component.form.text().value()).toBe('A1 B2');
    });

    it('should set text to empty string when location has no coords', async () => {
      const location: PhysicalGridLocation = {
        rows: 3,
        columns: 3,
        coords: [],
      };
      const { fixture, component } = await setup({ location });
      await fixture.whenStable();

      expect(component.form.text().value()).toBe('');
    });

    it('should reset rowCount/columnCount to 1 when location becomes undefined', async () => {
      const location: PhysicalGridLocation = {
        rows: 4,
        columns: 5,
        coords: [],
      };
      const { fixture, component } = await setup({ location });
      await fixture.whenStable();
      expect(component.form.rowCount().value()).toBe(4);

      component.location.set(undefined);
      await fixture.whenStable();

      expect(component.form.rowCount().value()).toBe(1);
      expect(component.form.columnCount().value()).toBe(1);
    });
  });

  describe('preset selection', () => {
    it('should update rowCount/columnCount when a preset is selected (x separator)', async () => {
      const { fixture, component } = await setup({
        presets: ['small: 3x4', 'large: 10x20'],
      });
      component.form.preset().value.set('small: 3x4');
      await fixture.whenStable();

      expect(component.form.columnCount().value()).toBe(3);
      expect(component.form.rowCount().value()).toBe(4);
    });

    it('should update rowCount/columnCount when a preset uses the × separator', async () => {
      const { fixture, component } = await setup({
        presets: ['small: 3×4'],
      });
      component.form.preset().value.set('small: 3×4');
      await fixture.whenStable();

      expect(component.form.columnCount().value()).toBe(3);
      expect(component.form.rowCount().value()).toBe(4);
    });

    it('should not update sizes when presets is empty', async () => {
      const { fixture, component } = await setup({ presets: [] });
      component.form.rowCount().value.set(1);
      component.form.columnCount().value.set(1);

      component.form.preset().value.set('small: 3x4');
      await fixture.whenStable();

      expect(component.form.rowCount().value()).toBe(1);
      expect(component.form.columnCount().value()).toBe(1);
    });

    it('should not update sizes when the preset value does not match the size pattern', async () => {
      const { fixture, component } = await setup({
        presets: ['no-size-here'],
      });
      component.form.preset().value.set('no-size-here');
      await fixture.whenStable();

      expect(component.form.rowCount().value()).toBe(1);
      expect(component.form.columnCount().value()).toBe(1);
    });
  });

  describe('setGridSize', () => {
    it('should set location from rowCount/columnCount with empty coords', async () => {
      const { component } = await setup();
      component.form.columnCount().value.set(4);
      component.form.rowCount().value.set(3);

      component.setGridSize();

      expect(component.location()).toEqual({
        rows: 3,
        columns: 4,
        coords: [],
      });
      expect(component.rows().length).toBe(3);
      expect(component.rows()[0].length).toBe(4);
    });
  });

  describe('areContiguous', () => {
    it('should consider horizontally adjacent cells contiguous', async () => {
      const { component } = await setup();
      expect(
        component.areContiguous({ row: 1, column: 1 }, { row: 1, column: 2 })
      ).toBe(true);
    });

    it('should consider vertically adjacent cells contiguous', async () => {
      const { component } = await setup();
      expect(
        component.areContiguous({ row: 1, column: 1 }, { row: 2, column: 1 })
      ).toBe(true);
    });

    it('should consider diagonally adjacent cells contiguous', async () => {
      const { component } = await setup();
      expect(
        component.areContiguous({ row: 1, column: 1 }, { row: 2, column: 2 })
      ).toBe(true);
    });

    it('should consider the same cell contiguous to itself', async () => {
      const { component } = await setup();
      expect(
        component.areContiguous({ row: 2, column: 2 }, { row: 2, column: 2 })
      ).toBe(true);
    });

    it('should not consider far apart, unconnected cells contiguous', async () => {
      const { component } = await setup();
      expect(
        component.areContiguous({ row: 1, column: 1 }, { row: 5, column: 5 })
      ).toBe(false);
    });
  });

  describe('toggleCell - single mode', () => {
    async function setupGrid(mode: 'single' | 'multiple' | 'contiguous') {
      const { fixture, component } = await setup({ mode });
      component.form.columnCount().value.set(3);
      component.form.rowCount().value.set(3);
      component.setGridSize();
      await fixture.whenStable();
      return { fixture, component };
    }

    it('should select a single cell', async () => {
      const { component } = await setupGrid('single');
      const cell = component.rows()[0][0];

      component.toggleCell(cell);

      expect(component.location()?.coords).toEqual([{ row: 1, column: 1 }]);
      expect(component.rows()[0][0].selected).toBe(true);
      expect(component.rows()[0][0].ordinal).toBe(1);
    });

    it('should deselect the previous cell when selecting a new one', async () => {
      const { component } = await setupGrid('single');
      component.toggleCell(component.rows()[0][0]); // A1
      component.toggleCell(component.rows()[1][1]); // B2

      const location = component.location();
      expect(location?.coords).toEqual([{ row: 2, column: 2 }]);
      expect(component.rows()[0][0].selected).toBe(false);
      expect(component.rows()[1][1].selected).toBe(true);
    });

    it('should deselect a cell when toggled again', async () => {
      const { component } = await setupGrid('single');
      const cell = component.rows()[0][0];
      component.toggleCell(cell);
      component.toggleCell(component.rows()[0][0]);

      expect(component.location()?.coords).toEqual([]);
      expect(component.rows()[0][0].selected).toBe(false);
      expect(component.rows()[0][0].ordinal).toBe(0);
    });

    it('should update the text control after toggling', async () => {
      const { component } = await setupGrid('single');
      component.toggleCell(component.rows()[0][0]);
      expect(component.form.text().value()).toBe('A1');
    });
  });

  describe('toggleCell - multiple mode', () => {
    async function setupGrid() {
      const { fixture, component } = await setup({ mode: 'multiple' });
      component.form.columnCount().value.set(3);
      component.form.rowCount().value.set(3);
      component.setGridSize();
      await fixture.whenStable();
      return { fixture, component };
    }

    it('should allow selecting several non-adjacent cells', async () => {
      const { component } = await setupGrid();
      component.toggleCell(component.rows()[0][0]); // A1
      component.toggleCell(component.rows()[2][2]); // C3

      const coords = component.location()?.coords;
      expect(coords).toEqual([
        { row: 1, column: 1 },
        { row: 3, column: 3 },
      ]);
    });

    it('should recompute ordinals when a middle cell is deselected', async () => {
      const { component } = await setupGrid();
      component.toggleCell(component.rows()[0][0]); // A1 - ordinal 1
      component.toggleCell(component.rows()[0][1]); // B1 - ordinal 2
      component.toggleCell(component.rows()[0][2]); // C1 - ordinal 3

      // deselect the middle one (B1)
      component.toggleCell(component.rows()[0][1]);

      const coords = component.location()?.coords;
      expect(coords).toEqual([
        { row: 1, column: 1 },
        { row: 1, column: 3 },
      ]);
      expect(component.rows()[0][0].ordinal).toBe(1);
      expect(component.rows()[0][2].ordinal).toBe(2);
    });
  });

  describe('toggleCell - contiguous mode (default)', () => {
    async function setupGrid() {
      const { fixture, component } = await setup({ mode: 'contiguous' });
      component.form.columnCount().value.set(3);
      component.form.rowCount().value.set(3);
      component.setGridSize();
      await fixture.whenStable();
      return { fixture, component };
    }

    it('should keep contiguous cells selected together', async () => {
      const { component } = await setupGrid();
      component.toggleCell(component.rows()[0][0]); // A1
      component.toggleCell(component.rows()[1][0]); // A2 (below A1)

      const coords = component.location()?.coords;
      expect(coords).toEqual([
        { row: 1, column: 1 },
        { row: 2, column: 1 },
      ]);
    });

    it('should deselect previously selected cells that are not contiguous to a newly selected one', async () => {
      const { component } = await setupGrid();
      component.toggleCell(component.rows()[0][0]); // A1
      // C3 is far from A1, so selecting it should prune A1 away
      component.toggleCell(component.rows()[2][2]); // C3

      const coords = component.location()?.coords;
      expect(coords).toEqual([{ row: 3, column: 3 }]);
      expect(component.rows()[0][0].selected).toBe(false);
    });

    it('should deselect a cell and keep the remaining chain valid', async () => {
      const { component } = await setupGrid();
      component.toggleCell(component.rows()[0][0]); // A1
      component.toggleCell(component.rows()[1][0]); // A2
      component.toggleCell(component.rows()[2][0]); // A3

      // deselect A1: A2/A3 remain contiguous to each other
      component.toggleCell(component.rows()[0][0]);

      const coords = component.location()?.coords;
      expect(coords).toEqual([
        { row: 2, column: 1 },
        { row: 3, column: 1 },
      ]);
    });
  });

  describe('setCellsFromText', () => {
    it('should set location from valid text', async () => {
      const { fixture, component } = await setup();
      component.form.columnCount().value.set(3);
      component.form.rowCount().value.set(3);

      component.form.text().value.set('A1 B2');
      component.setCellsFromText();
      await fixture.whenStable();

      expect(component.location()).toEqual({
        rows: 3,
        columns: 3,
        coords: [
          { row: 1, column: 1 },
          { row: 2, column: 2 },
        ],
      });
    });

    it('should set location to undefined when text is empty', async () => {
      const { component } = await setup({
        location: { rows: 3, columns: 3, coords: [{ row: 1, column: 1 }] },
      });
      component.form.text().value.set('');
      component.setCellsFromText();

      expect(component.location()).toBeUndefined();
    });

    it('should filter out coordinates outside the current grid bounds', async () => {
      const { component } = await setup();
      component.form.columnCount().value.set(2);
      component.form.rowCount().value.set(2);

      component.form.text().value.set('A1 C5 B2');
      component.setCellsFromText();

      const coords = component.location()?.coords as PhysicalGridCoords[];
      expect(coords).toEqual([
        { row: 1, column: 1 },
        { row: 2, column: 2 },
      ]);
    });

    it('should do nothing when no valid cell token can be parsed from a non-empty text', async () => {
      const location: PhysicalGridLocation = {
        rows: 3,
        columns: 3,
        coords: [{ row: 1, column: 1 }],
      };
      const { component } = await setup({ location });

      component.form.text().value.set('###');
      component.setCellsFromText();

      // no valid tokens were found, so the previous location is left untouched
      expect(component.location()).toEqual(location);
    });
  });

  describe('resetCells', () => {
    it('should do nothing when there is no location', async () => {
      const { component } = await setup();
      expect(() => component.resetCells()).not.toThrow();
      expect(component.location()).toBeUndefined();
    });

    it('should clear coords, deselect cells, and clear text', async () => {
      const location: PhysicalGridLocation = {
        rows: 2,
        columns: 2,
        coords: [{ row: 1, column: 1 }],
      };
      const { fixture, component } = await setup({ location });
      await fixture.whenStable();

      component.resetCells();

      expect(component.location()?.coords).toEqual([]);
      expect(component.location()?.rows).toBe(2);
      expect(component.location()?.columns).toBe(2);
      expect(component.form.text().value()).toBe('');
      component.rows().forEach((row) =>
        row.forEach((cell) => {
          expect(cell.selected).toBe(false);
          expect(cell.ordinal).toBe(0);
        })
      );
    });
  });

  describe('onExpandedChange', () => {
    it('should emit collapsedGridChange with the inverse of expanded', async () => {
      const { component } = await setup();
      const values: boolean[] = [];
      component.collapsedGridChange.subscribe((v) => values.push(v));

      component.onExpandedChange(true);
      component.onExpandedChange(false);

      expect(values).toEqual([false, true]);
    });
  });

  describe('lifecycle', () => {
    it('should not throw on destroy', async () => {
      const { fixture } = await setup();
      expect(() => fixture.destroy()).not.toThrow();
    });
  });
});
