import { TestBed } from '@angular/core/testing';

import { PhysicalGridCoordsPipe } from './physical-grid-coords.pipe';
import { PhysicalGridCoordsService } from '../services/physical-grid-coords.service';
import {
  PhysicalGridCoords,
  PhysicalGridLocation,
} from '../components/physical-grid-location/physical-grid-location.component';

describe('PhysicalGridCoordsPipe', () => {
  let pipe: PhysicalGridCoordsPipe;
  let service: PhysicalGridCoordsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PhysicalGridCoordsService, PhysicalGridCoordsPipe],
    });
    service = TestBed.inject(PhysicalGridCoordsService);
    pipe = TestBed.inject(PhysicalGridCoordsPipe);
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should transform PhysicalGridCoords array to string', () => {
    const coords: PhysicalGridCoords[] = [
      { row: 1, column: 1 },
      { row: 2, column: 2 },
      { row: 3, column: 3 },
    ];
    const result = pipe.transform(coords);
    expect(result).toBe('A1 B2 C3');
  });

  it('should transform PhysicalGridCoords array to string with dimensions', () => {
    const coords: PhysicalGridCoords[] = [
      { row: 1, column: 1 },
      { row: 2, column: 2 },
    ];
    const result = pipe.transform(coords, true);
    expect(result).toBe('A1 B2'); // includeDimensions doesn't apply to arrays, only to PhysicalGridLocation
  });

  it('should transform PhysicalGridLocation to string without dimensions', () => {
    const location: PhysicalGridLocation = {
      columns: 5,
      rows: 4,
      coords: [
        { row: 1, column: 1 },
        { row: 2, column: 3 },
      ],
    };
    const result = pipe.transform(location);
    expect(result).toBe('A1 C2');
  });

  it('should transform PhysicalGridLocation to string with dimensions', () => {
    const location: PhysicalGridLocation = {
      columns: 5,
      rows: 4,
      coords: [
        { row: 1, column: 1 },
        { row: 2, column: 3 },
      ],
    };
    const result = pipe.transform(location, true);
    expect(result).toBe('5x4: A1 C2');
  });

  it('should return empty string for null input', () => {
    const result = pipe.transform(null);
    expect(result).toBe('');
  });

  it('should return empty string for undefined input', () => {
    const result = pipe.transform(undefined);
    expect(result).toBe('');
  });

  it('should return empty string for empty array', () => {
    const coords: PhysicalGridCoords[] = [];
    const result = pipe.transform(coords);
    expect(result).toBe('');
  });

  it('should return empty string for PhysicalGridLocation with empty coords', () => {
    const location: PhysicalGridLocation = {
      columns: 5,
      rows: 4,
      coords: [],
    };
    const result = pipe.transform(location);
    expect(result).toBe('');
  });

  it('should return empty string for PhysicalGridLocation with empty coords and dimensions', () => {
    const location: PhysicalGridLocation = {
      columns: 5,
      rows: 4,
      coords: [],
    };
    const result = pipe.transform(location, true);
    expect(result).toBe('5x4: ');
  });

  it('should handle invalid input gracefully', () => {
    const invalidInput = { invalid: 'object' } as any;
    const result = pipe.transform(invalidInput);
    expect(result).toBe('');
  });

  it('should handle service errors gracefully', () => {
    // Mock the service to throw an error
    spyOn(service, 'physicalGridCoordsToString').and.throwError('Test error');

    const coords: PhysicalGridCoords[] = [{ row: 1, column: 1 }];
    const result = pipe.transform(coords);
    expect(result).toBe('');
  });
});
