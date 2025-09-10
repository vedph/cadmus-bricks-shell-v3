import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRippleModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ExcelColumnPipe } from '../../pipes/excel-column.pipe';

/**
 * Coordinates of a cell in the physical grid.
 */
export interface PhysicalGridCoords {
  row: number;
  column: number;
}

/**
 * A physical grid location, with the number of rows and columns of the grid,
 * and the coordinates of its selected cells.
 */
export interface PhysicalGridLocation {
  rows: number;
  columns: number;
  coords: PhysicalGridCoords[];
}

/**
 * The mode of selection in the grid: single allows to select a single cell,
 * multiple allows to select multiple cells wherever they are, contiguous allows
 * to select only contiguous cells.
 */
export type PhysicalGridMode = 'single' | 'multiple' | 'contiguous';

/**
 * A viewmodel for the cell in the physical grid.
 */
interface PhysicalGridCell {
  row: number;
  column: number;
  selected?: boolean;
  ordinal: number;
}

/**
 * A component to select a location in a physical grid, with a text box to enter
 * the selected cells in Excel-like format, and an interactive grid to select
 * the cells visually.
 */
@Component({
  selector: 'cadmus-mat-physical-grid-location',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    MatInputModule,
    MatRippleModule,
    MatSelectModule,
    MatTooltipModule,
    ExcelColumnPipe,
  ],
  templateUrl: './physical-grid-location.component.html',
  styleUrl: './physical-grid-location.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhysicalGridLocationComponent implements OnInit, OnDestroy {
  private readonly _excelColumnPipe: ExcelColumnPipe = new ExcelColumnPipe();
  private _sub?: Subscription;

  /**
   * The location of the grid together with the grid's size.
   */
  public readonly location = model<PhysicalGridLocation>();

  /**
   * True if selecting at least 1 cell is required.
   */
  public readonly required = input<boolean>(false);

  /**
   * Presets sizes for the grid. Each preset is a string like 'name: 3x4'
   * where name is the preset's name, 3 is the columns count, and 4 the rows
   * count.
   */
  public readonly presets = input<string[]>();

  /**
   * True to allow resizing the grid.
   */
  public readonly allowResize = input<boolean>();

  /**
   * True to allow custom sizes also when presets is specified.
   */
  public readonly allowCustomSize = input<boolean>();

  /**
   * True to hide the interactive grid.
   */
  public readonly noGrid = input<boolean>();

  /**
   * True to collapse the interactive grid.
   */
  public readonly collapsedGrid = input<boolean>();

  /**
   * The mode of selection in the grid: single allows to select a single cell,
   * multiple allows to select multiple cells wherever they are, contiguous allows
   * to select only contiguous cells.
   */
  public readonly mode = model<PhysicalGridMode>('contiguous');

  /**
   * Emitted when the grid is collapsed.
   */
  public readonly collapsedGridChange = output<boolean>();

  public preset: FormControl<string | null>;
  // text including coordinates of selected cells in Excel-like format,
  // separated by spaces
  public text: FormControl<string>;
  public rowCount: FormControl<number>;
  public columnCount: FormControl<number>;
  public form: FormGroup;

  // the interactive grid viewmodel
  public readonly rows = signal<PhysicalGridCell[][]>([]);

  constructor(formBuilder: FormBuilder) {
    this.preset = formBuilder.control(null);
    this.text = formBuilder.control('', { nonNullable: true });
    this.rowCount = formBuilder.control(1, {
      nonNullable: true,
      validators: [Validators.min(1)],
    });
    this.columnCount = formBuilder.control(1, {
      nonNullable: true,
      validators: [Validators.min(1)],
    });
    this.form = formBuilder.group({
      text: this.text,
    });
    this.setTextValidators(this.required());

    // when location changes, update grid
    effect(() => {
      const location = this.location();
      // update the grid size
      this.rowCount.setValue(location?.rows || 1);
      this.columnCount.setValue(location?.columns || 1);
      // update grid and text
      this.updateGrid();
      this.updateText();
    });

    // when required changes, update validators
    effect(() => {
      if (this.text) {
        this.setTextValidators(this.required());
      }
    });

    // when mode changes, reset cells
    effect(() => {
      console.log('mode', this.mode());
    });
  }

  public ngOnInit(): void {
    this._sub = this.preset.valueChanges.subscribe((value) => {
      if (value && this.presets()?.length) {
        const m = value.match(/(\d+)[x×](\d+)$/);
        if (m) {
          this.rowCount.setValue(parseInt(m[2], 10));
          this.columnCount.setValue(parseInt(m[1], 10));
        }
      }
    });
    setTimeout(() => {
      this.updateGrid();
      this.updateText();
    });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private setTextValidators(required: boolean) {
    if (!this.text) {
      return;
    }
    this.text.clearValidators();
    this.text.addValidators(Validators.pattern(/^(?:\s*[A-Za-z]+[0-9]+\s*)*$/));
    if (required) {
      this.text.addValidators([Validators.required]);
    }
  }

  private updateGrid(): void {
    const location = this.location();
    console.log('updateGrid: location', location);
    const rows: PhysicalGridCell[][] = [];
    for (let y = 1; y <= this.rowCount.value; y++) {
      const row: PhysicalGridCell[] = [];
      for (let x = 1; x <= this.columnCount.value; x++) {
        const selIndex = location
          ? location.coords.findIndex((c) => c.row === y && c.column === x)
          : -1;
        row.push({
          row: y,
          column: x,
          selected: selIndex > -1,
          ordinal: selIndex + 1,
        });
      }
      rows.push(row);
    }
    this.rows.set(rows);
  }

  public setGridSize(): void {
    this.location.set({
      rows: this.rowCount.value,
      columns: this.columnCount.value,
      coords: [],
    });
    this.updateGrid();
  }

  private getNeighbors(
    coords: PhysicalGridCoords,
    selected: boolean | undefined = undefined
  ): PhysicalGridCoords[] {
    const neighbors: PhysicalGridCoords[] = [];
    for (let row = coords.row - 1; row <= coords.row + 1; row++) {
      for (
        let column = coords.column - 1;
        column <= coords.column + 1;
        column++
      ) {
        if (
          row > 0 &&
          column > 0 &&
          row <= this.rowCount.value &&
          column <= this.columnCount.value &&
          (row !== coords.row || column !== coords.column)
        ) {
          // filter by selected if not undefined
          if (selected !== undefined) {
            const cell = this.rows()[row - 1][column - 1];
            if (cell.selected === selected) {
              neighbors.push({ row, column });
            }
          } else {
            neighbors.push({ row, column });
          }
        }
      }
    }
    return neighbors;
  }

  private checkContiguity(
    a: PhysicalGridCoords,
    b: PhysicalGridCoords,
    visited: Set<string>
  ): boolean {
    // corner case: same cell
    if (a === b) {
      return true;
    }

    // start from b
    const stack: PhysicalGridCoords[] = [];
    stack.push(b);

    // visit all cells
    while (stack.length > 0) {
      const current = stack.pop()!;

      // if already visited, skip
      const key = `R${current.row}C${current.column}`;
      if (visited.has(key)) {
        continue;
      }
      // mark as visited
      visited.add(key);

      // if we reached a, we are done
      if (
        current.row >= a.row - 1 &&
        current.row <= a.row + 1 &&
        current.column >= a.column - 1 &&
        current.column <= a.column + 1
      ) {
        return true;
      }

      // add neighbors to the stack
      const neighbors = this.getNeighbors(current, true);
      for (const neighbor of neighbors) {
        stack.push(neighbor);
      }
    }

    return false;
  }

  /**
   * Check whether the specified cells are contiguous, i.e. cell B is adjacent
   * to cell A, in any direction.
   * @param a The first coordinates.
   * @param b The second coordinates.
   * @returns True if the two coordinates are contiguous.
   */
  public areContiguous(a: PhysicalGridCoords, b: PhysicalGridCoords): boolean {
    const visited: Set<string> = new Set();
    return this.checkContiguity(a, b, visited);
  }

  private buildText(): string {
    return (
      this.location()
        ?.coords.map((c) => {
          return this._excelColumnPipe.transform(c.column) + c.row;
        })
        .join(' ') || ''
    );
  }

  public resetCells() {
    if (!this.location()) {
      return;
    }
    // create a new grid with all cells deselected and ordinals reset
    const newRows = this.rows().map((row) =>
      row.map((c) => ({
        ...c,
        selected: false,
        ordinal: 0,
      }))
    );
    this.rows.set(newRows);

    this.text.setValue('');
    this.text.markAsDirty();
    this.text.updateValueAndValidity();
    this.location.set({
      ...this.location(),
      coords: [] as PhysicalGridCoords[],
    } as PhysicalGridLocation);
  }

  private updateText() {
    this.text.setValue(this.buildText());
    this.text.markAsDirty();
    this.text.updateValueAndValidity();
  }

  private getSelectedCells(): PhysicalGridCell[] {
    // get all the selected cells in their ordinal order
    return this.rows()
      .map((row) => row.filter((c) => c.selected))
      .reduce((acc, val) => acc.concat(val), [])
      .sort((a, b) => (a.ordinal || 0) - (b.ordinal || 0));
  }

  private updateSelectedOrdinals(): number {
    let ordinal = 1;
    const selected = this.getSelectedCells();
    // create a new grid with updated ordinals for selected cells
    const newRows = this.rows().map((row) =>
      row.map((c) => {
        if (
          selected.some((sel) => sel.row === c.row && sel.column === c.column)
        ) {
          return { ...c, ordinal: ordinal++ };
        }
        return { ...c, ordinal: 0 };
      })
    );
    this.rows.set(newRows);
    return ordinal;
  }

  /**
   * Deselects all the selected cells which are not contiguous to any
   * of the other selected cells, excluding cell itself.
   * @param cell The reference cell.
   */
  private deselectNonContiguousCells(cell: PhysicalGridCell): void {
    const selected = this.getSelectedCells();
    // create a new grid with non-contiguous cells deselected
    const newRows = this.rows().map((row) =>
      row.map((c) => {
        if (
          c.selected &&
          c !== cell &&
          !this.areContiguous(
            { row: c.row, column: c.column },
            { row: cell.row, column: cell.column }
          )
        ) {
          return { ...c, selected: false, ordinal: 0 };
        }
        return { ...c };
      })
    );
    this.rows.set(newRows);
  }

  private getMaxSelectedOrdinal(): number {
    const selected = this.getSelectedCells();
    return selected.reduce((acc, val) => Math.max(acc, val.ordinal || 0), 0);
  }

  public toggleCell(cell: PhysicalGridCell) {
    const currentRows = this.rows();
    let newRows: PhysicalGridCell[][] = currentRows.map((row) =>
      row.map((c) => ({ ...c }))
    );

    // find the cell in the newRows grid
    const targetCell = newRows[cell.row - 1][cell.column - 1];

    // (a) DESELECT
    if (targetCell.selected) {
      const n = targetCell.ordinal;
      targetCell.selected = false;
      targetCell.ordinal = 0;

      if (this.mode() !== 'contiguous') {
        // update ordinals
        let ordinal = 1;
        newRows = newRows.map((row) =>
          row.map((c) => {
            if (c.selected) {
              return { ...c, ordinal: ordinal++ };
            }
            return { ...c, ordinal: 0 };
          })
        );
        this.rows.set(newRows);
      } else {
        // else find the new reference cell as the one before or after the deselected cell
        let cells = newRows
          .map((row) => row.find((c) => c.ordinal === n - 1))
          .filter((c): c is PhysicalGridCell => !!c);
        if (!cells.length) {
          cells = newRows
            .map((row) => row.find((c) => c.ordinal === n + 1))
            .filter((c): c is PhysicalGridCell => !!c);
        }
        let refCell = cells.length ? cells[0] : targetCell;
        // deselect all non-contiguous cells and update ordinals
        const refCoords = { row: refCell.row, column: refCell.column };
        newRows = newRows.map((row) =>
          row.map((c) => {
            if (
              c.selected &&
              (c.row !== refCoords.row || c.column !== refCoords.column) &&
              !this.areContiguous({ row: c.row, column: c.column }, refCoords)
            ) {
              return { ...c, selected: false, ordinal: 0 };
            }
            return { ...c };
          })
        );
        // update ordinals
        let ordinal = 1;
        newRows = newRows.map((row) =>
          row.map((c) => {
            if (c.selected) {
              return { ...c, ordinal: ordinal++ };
            }
            return { ...c, ordinal: 0 };
          })
        );
        this.rows.set(newRows);
      }
    } else {
      // (b) SELECT
      switch (this.mode()) {
        case 'single':
          // deselect all cells and select the new one
          newRows = newRows.map((row) =>
            row.map((c) =>
              c.row === targetCell.row && c.column === targetCell.column
                ? { ...c, selected: true, ordinal: 1 }
                : { ...c, selected: false, ordinal: 0 }
            )
          );
          break;
        case 'contiguous':
          // deselect all non-contiguous cells
          const refCoords = { row: targetCell.row, column: targetCell.column };
          newRows = newRows.map((row) =>
            row.map((c) => {
              if (
                c.selected &&
                (c.row !== refCoords.row || c.column !== refCoords.column) &&
                !this.areContiguous({ row: c.row, column: c.column }, refCoords)
              ) {
                return { ...c, selected: false, ordinal: 0 };
              }
              return { ...c };
            })
          );
          // select the new cell
          newRows[targetCell.row - 1][targetCell.column - 1].selected = true;
          break;
        case 'multiple':
          newRows[targetCell.row - 1][targetCell.column - 1].selected = true;
          break;
      }
      // update ordinals
      let ordinal = 1;
      newRows = newRows.map((row) =>
        row.map((c) => {
          if (c.selected) {
            return { ...c, ordinal: ordinal++ };
          }
          return { ...c, ordinal: 0 };
        })
      );
      this.rows.set(newRows);
    }

    // update the location
    const selected: PhysicalGridCell[] = [];
    this.rows().forEach((row) =>
      row.forEach((c) => {
        if (c.selected) selected.push(c);
      })
    );
    selected.sort((a, b) => (a.ordinal || 0) - (b.ordinal || 0));
    this.location.set({
      rows: this.rowCount.value,
      columns: this.columnCount.value,
      coords: selected.map((c) => ({ row: c.row, column: c.column })),
    });

    // update the selected cells text
    this.updateText();
  }

  public setCellsFromText() {
    if (!this.text) {
      return;
    }

    const text = this.text.value;
    if (!text) {
      this.location.set(undefined);
    } else {
      const coords = text
        .split(/\s+/)
        .map((s) => s.trim().toUpperCase())
        .map((s) => {
          const m = s.match(/^([A-Za-z]+)([0-9]+)$/);
          if (!m) {
            return null;
          }
          // calculate col from m[1] being an Excel coordinate like AB,
          // and row from m[2] being a 1-based number
          const col = m[1].split('').reduce((acc, val) => {
            return acc * 26 + val.charCodeAt(0) - 64;
          }, 0);
          const row = parseInt(m[2], 10);

          return { row, column: col };
        })
        .filter((c): c is PhysicalGridCoords => c !== null);

      if (coords.length) {
        const filteredCoords = coords.filter(
          (c) =>
            c.row >= 1 &&
            c.row <= this.rowCount.value &&
            c.column >= 1 &&
            c.column <= this.columnCount.value
        );
        this.updateGrid();
        this.location.set({
          rows: this.rowCount.value,
          columns: this.columnCount.value,
          coords: filteredCoords,
        });
      }
    }
  }

  public onExpandedChange(expanded: boolean) {
    this.collapsedGridChange.emit(!expanded);
  }
}
