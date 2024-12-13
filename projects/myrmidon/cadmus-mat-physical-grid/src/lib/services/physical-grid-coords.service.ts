import { Injectable } from '@angular/core';

import { PhysicalGridCoords } from '../components/physical-grid-location/physical-grid-location.component';
import { ExcelColumnPipe } from '../pipes/excel-column.pipe';

@Injectable({
  providedIn: 'root',
})
export class PhysicalGridCoordsService {
  constructor() {}

  /**
   * Convert a set of physical grid coordinates to a string in Excel-like format,
   * where cells are separated by spaces.
   */
  public physicalGridCoordsToString(coords: PhysicalGridCoords[]): string {
    const pipe = new ExcelColumnPipe();
    return coords
      .map((c) => {
        return `${pipe.transform(c.column)}${c.row}`;
      })
      .join(' ');
  }

  /**
   * Parse a textual representation of a set of physical grid coordinates.
   * The text is expected to contain cell coordinates in Excel-like format,
   * separated by spaces.
   * @param text The text to parse.
   */
  public parsePhysicalGridCoords(
    text: string | null | undefined
  ): PhysicalGridCoords[] | undefined {
    if (!text) {
      return undefined;
    }
    const coords = text
      .split(/\s+/)
      .map((s) => s.trim().toUpperCase())
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

    return coords;
  }
}
