import { Injectable } from '@angular/core';

import {
  PhysicalGridCoords,
  PhysicalGridLocation,
} from '../components/physical-grid-location/physical-grid-location.component';
import { ExcelColumnPipe } from '../pipes/excel-column.pipe';

/**
 * The service to convert physical grid coordinates to/from a string
 * in Excel-like format (e.g., "A1 B2 C3"). If requested, the string
 * can also start with the number of columns and rows followed by a colon, e.g.,
 * "3x4: A1 B2 C3" for a grid with 3 columns and 4 rows.
 */
@Injectable({
  providedIn: 'root',
})
export class PhysicalGridCoordsService {
  constructor() {}

  /**
   * Convert a set of physical grid coordinates to a string in Excel-like format,
   * where cells are separated by spaces. If a PhysicalGridLocation is provided,
   * the string will be prefixed with the grid dimensions in CxR: format.
   */
  public physicalGridCoordsToString(
    coords: PhysicalGridCoords[] | PhysicalGridLocation,
    includeDimensions: boolean = false
  ): string {
    const pipe = new ExcelColumnPipe();

    // determine if we have a PhysicalGridLocation or just coordinates
    let actualCoords: PhysicalGridCoords[];
    let dimensions: string = '';

    if (Array.isArray(coords)) {
      actualCoords = coords;
    } else {
      actualCoords = coords.coords;
      if (includeDimensions) {
        dimensions = `${coords.columns}x${coords.rows}: `;
      }
    }

    const coordsString = actualCoords
      .map((c) => {
        return `${pipe.transform(c.column)}${c.row}`;
      })
      .join(' ');

    return dimensions + coordsString;
  }

  /**
   * Parse a textual representation of a set of physical grid coordinates.
   * The text is expected to contain cell coordinates in Excel-like format,
   * separated by spaces. If the text starts with CxR: where C=column count
   * and R=row count, those dimensions will be used. Otherwise, default
   * dimensions will be used, but will be expanded if any parsed coordinates
   * fall outside the default bounds.
   * @param text The text to parse.
   * @param defaultColumns Default number of columns (default: 3).
   * @param defaultRows Default number of rows (default: 3).
   * @param includeDimensions Whether to return a PhysicalGridLocation (true)
   * or just coordinates array (false, default).
   */
  public parsePhysicalGridCoords(
    text: string | null | undefined,
    defaultColumns: number = 3,
    defaultRows: number = 3,
    includeDimensions: boolean = false
  ): PhysicalGridLocation | PhysicalGridCoords[] | undefined {
    if (!text) {
      return undefined;
    }

    let coordsText = text.trim();

    // check if trimmed text is empty (handles whitespace-only strings)
    if (!coordsText) {
      return undefined;
    }

    let columns = defaultColumns;
    let rows = defaultRows;
    let hasDimensionsPrefix = false;

    // check if text starts with CxR: pattern
    const dimensionMatch = coordsText.match(/^(\d+)[x×](\d+):\s*(.*)$/);
    if (dimensionMatch) {
      columns = parseInt(dimensionMatch[1], 10);
      rows = parseInt(dimensionMatch[2], 10);
      coordsText = dimensionMatch[3];
      hasDimensionsPrefix = true;
    }

    const coords = coordsText
      .split(/\s+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0)
      .map((s) => {
        const m = s.match(/^([A-Z]+)([0-9]+)$/);
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

    // if no explicit dimensions were provided, adjust dimensions
    // to fit all coords
    if (!hasDimensionsPrefix && coords.length > 0) {
      const maxColumn = Math.max(...coords.map((c) => c.column));
      const maxRow = Math.max(...coords.map((c) => c.row));

      columns = Math.max(columns, maxColumn);
      rows = Math.max(rows, maxRow);
    }

    // return based on includeDimensions parameter
    if (includeDimensions) {
      return {
        columns,
        rows,
        coords,
      };
    } else {
      return coords;
    }
  }
}
