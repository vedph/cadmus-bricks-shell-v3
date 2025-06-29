import { Pipe, PipeTransform, inject } from '@angular/core';

import {
  PhysicalGridCoords,
  PhysicalGridLocation,
} from '../components/physical-grid-location/physical-grid-location.component';
import { PhysicalGridCoordsService } from '../services/physical-grid-coords.service';

/**
 * Pipe to transform physical grid coordinates to a string representation.
 * Uses the PhysicalGridCoordsService to convert coordinates to Excel-like format.
 */
@Pipe({
  name: 'physicalGridCoords',
  standalone: true,
})
export class PhysicalGridCoordsPipe implements PipeTransform {
  private readonly service = inject(PhysicalGridCoordsService);

  /**
   * Transform physical grid coordinates to a string.
   * @param value The coordinates to transform (PhysicalGridLocation
   * or PhysicalGridCoords[])
   * @param includeDimensions Whether to include dimensions in the
   * output (default: false)
   * @returns String representation of the coordinates, or empty
   * string if input is invalid
   */
  transform(
    value: PhysicalGridLocation | PhysicalGridCoords[] | null | undefined,
    includeDimensions: boolean = false
  ): string {
    if (!value) {
      return '';
    }

    try {
      // check if it's an array of coordinates
      if (Array.isArray(value)) {
        return this.service.physicalGridCoordsToString(
          value,
          includeDimensions
        );
      }

      // check if it's a PhysicalGridLocation object
      if (
        typeof value === 'object' &&
        'coords' in value &&
        'columns' in value &&
        'rows' in value
      ) {
        return this.service.physicalGridCoordsToString(
          value,
          includeDimensions
        );
      }

      // invalid input
      return '';
    } catch (error) {
      // return empty string on any error
      return '';
    }
  }
}
