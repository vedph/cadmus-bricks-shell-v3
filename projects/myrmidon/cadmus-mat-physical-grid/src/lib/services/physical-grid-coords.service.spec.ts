import { TestBed } from '@angular/core/testing';

import { PhysicalGridCoordsService } from './physical-grid-coords.service';
import {
  PhysicalGridCoords,
  PhysicalGridLocation,
} from '../components/physical-grid-location/physical-grid-location.component';

describe('PhysicalGridCoordsService', () => {
  let service: PhysicalGridCoordsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PhysicalGridCoordsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should convert physical grid coordinates to string in Excel-like format', () => {
    const coords: PhysicalGridCoords[] = [
      { row: 1, column: 1 },
      { row: 1, column: 2 },
      { row: 2, column: 1 },
    ];
    const expectedString = 'A1 B1 A2';
    const result = service.physicalGridCoordsToString(coords);
    expect(result).toEqual(expectedString);
  });

  it('should parse textual representation of physical grid coordinates (backward compatible)', () => {
    const text = 'A1 B1 A2';
    const expectedCoords: PhysicalGridCoords[] = [
      { row: 1, column: 1 },
      { row: 1, column: 2 },
      { row: 2, column: 1 },
    ];
    const result = service.parsePhysicalGridCoords(text);
    expect(result).toEqual(expectedCoords);
  });

  it('should parse textual representation and return PhysicalGridLocation when includeDimensions is true', () => {
    const text = 'A1 B1 A2';
    const expectedLocation: PhysicalGridLocation = {
      columns: 3,
      rows: 3,
      coords: [
        { row: 1, column: 1 },
        { row: 1, column: 2 },
        { row: 2, column: 1 },
      ],
    };
    const result = service.parsePhysicalGridCoords(text, 3, 3, true);
    expect(result).toEqual(expectedLocation);
  });

  it('should return coordinates array when includeDimensions is false (default)', () => {
    const text = 'A1 B2 C3';
    const expectedCoords: PhysicalGridCoords[] = [
      { row: 1, column: 1 },
      { row: 2, column: 2 },
      { row: 3, column: 3 },
    ];
    const result = service.parsePhysicalGridCoords(text);
    expect(result).toEqual(expectedCoords);
  });

  it('should return coordinates array even with dimension prefix when includeDimensions is false', () => {
    const text = '10x10: A1 B2 C3';
    const expectedCoords: PhysicalGridCoords[] = [
      { row: 1, column: 1 },
      { row: 2, column: 2 },
      { row: 3, column: 3 },
    ];
    const result = service.parsePhysicalGridCoords(text, 3, 3, false);
    expect(result).toEqual(expectedCoords);
  });

  it('should return coordinates array with custom defaults when includeDimensions is false', () => {
    const text = 'A1 B2';
    const expectedCoords: PhysicalGridCoords[] = [
      { row: 1, column: 1 },
      { row: 2, column: 2 },
    ];
    const result = service.parsePhysicalGridCoords(text, 10, 15, false);
    expect(result).toEqual(expectedCoords);
  });

  it('should return undefined when parsing null or undefined text', () => {
    const nullText = null;
    const undefinedText = undefined;
    const result1 = service.parsePhysicalGridCoords(nullText);
    const result2 = service.parsePhysicalGridCoords(undefinedText);
    expect(result1).toBeUndefined();
    expect(result2).toBeUndefined();
  });

  it('should convert PhysicalGridLocation to string with dimensions when includeDimensions is true', () => {
    const location: PhysicalGridLocation = {
      columns: 5,
      rows: 4,
      coords: [
        { row: 1, column: 1 },
        { row: 2, column: 3 },
      ],
    };
    const expectedString = '5x4: A1 C2';
    const result = service.physicalGridCoordsToString(location, true);
    expect(result).toEqual(expectedString);
  });

  it('should convert PhysicalGridLocation to string without dimensions when includeDimensions is false', () => {
    const location: PhysicalGridLocation = {
      columns: 5,
      rows: 4,
      coords: [
        { row: 1, column: 1 },
        { row: 2, column: 3 },
      ],
    };
    const expectedString = 'A1 C2';
    const result = service.physicalGridCoordsToString(location, false);
    expect(result).toEqual(expectedString);
  });

  it('should convert PhysicalGridLocation to string without dimensions by default', () => {
    const location: PhysicalGridLocation = {
      columns: 5,
      rows: 4,
      coords: [{ row: 1, column: 1 }],
    };
    const expectedString = 'A1';
    const result = service.physicalGridCoordsToString(location);
    expect(result).toEqual(expectedString);
  });

  it('should parse text with explicit dimensions prefix', () => {
    const text = '5x4: A1 C2 E4';
    const expectedLocation: PhysicalGridLocation = {
      columns: 5,
      rows: 4,
      coords: [
        { row: 1, column: 1 },
        { row: 2, column: 3 },
        { row: 4, column: 5 },
      ],
    };
    const result = service.parsePhysicalGridCoords(text, 3, 3, true);
    expect(result).toEqual(expectedLocation);
  });

  it('should parse text without dimensions prefix and use defaults', () => {
    const text = 'A1 B2';
    const expectedLocation: PhysicalGridLocation = {
      columns: 3,
      rows: 3,
      coords: [
        { row: 1, column: 1 },
        { row: 2, column: 2 },
      ],
    };
    const result = service.parsePhysicalGridCoords(text, 3, 3, true);
    expect(result).toEqual(expectedLocation);
  });

  it('should parse text without dimensions prefix and expand defaults to fit coordinates', () => {
    const text = 'A1 D5';
    const expectedLocation: PhysicalGridLocation = {
      columns: 4, // expanded from default 3 to fit column D (4)
      rows: 5, // expanded from default 3 to fit row 5
      coords: [
        { row: 1, column: 1 },
        { row: 5, column: 4 },
      ],
    };
    const result = service.parsePhysicalGridCoords(text, 3, 3, true);
    expect(result).toEqual(expectedLocation);
  });

  it('should use custom default dimensions', () => {
    const text = 'A1 B2';
    const expectedLocation: PhysicalGridLocation = {
      columns: 10,
      rows: 15,
      coords: [
        { row: 1, column: 1 },
        { row: 2, column: 2 },
      ],
    };
    const result = service.parsePhysicalGridCoords(text, 10, 15, true);
    expect(result).toEqual(expectedLocation);
  });

  it('should expand custom defaults when coordinates exceed them', () => {
    const text = 'A1 Z26';
    const expectedLocation: PhysicalGridLocation = {
      columns: 26, // expanded from custom default 5 to fit column Z (26)
      rows: 26, // expanded from custom default 5 to fit row 26
      coords: [
        { row: 1, column: 1 },
        { row: 26, column: 26 },
      ],
    };
    const result = service.parsePhysicalGridCoords(text, 5, 5, true);
    expect(result).toEqual(expectedLocation);
  });

  it('should handle multi-letter column coordinates', () => {
    const text = 'AA1 AB2';
    const expectedLocation: PhysicalGridLocation = {
      columns: 28, // expanded to fit column AB (28)
      rows: 3,
      coords: [
        { row: 1, column: 27 }, // AA = 27
        { row: 2, column: 28 }, // AB = 28
      ],
    };
    const result = service.parsePhysicalGridCoords(text, 3, 3, true);
    expect(result).toEqual(expectedLocation);
  });

  it('should handle empty coordinate string after dimensions prefix', () => {
    const text = '5x4: ';
    const expectedLocation: PhysicalGridLocation = {
      columns: 5,
      rows: 4,
      coords: [],
    };
    const result = service.parsePhysicalGridCoords(text, 3, 3, true);
    expect(result).toEqual(expectedLocation);
  });

  it('should ignore invalid coordinate formats', () => {
    const text = 'A1 INVALID B2 123';
    const expectedLocation: PhysicalGridLocation = {
      columns: 3,
      rows: 3,
      coords: [
        { row: 1, column: 1 },
        { row: 2, column: 2 },
      ],
    };
    const result = service.parsePhysicalGridCoords(text, 3, 3, true);
    expect(result).toEqual(expectedLocation);
  });

  it('should handle extra whitespace in input', () => {
    const text = '  5x4:   A1   B2   C3  ';
    const expectedLocation: PhysicalGridLocation = {
      columns: 5,
      rows: 4,
      coords: [
        { row: 1, column: 1 },
        { row: 2, column: 2 },
        { row: 3, column: 3 },
      ],
    };
    const result = service.parsePhysicalGridCoords(text, 3, 3, true);
    expect(result).toEqual(expectedLocation);
  });

  it('should handle empty string', () => {
    const result = service.parsePhysicalGridCoords('');
    expect(result).toBeUndefined();
  });

  it('should handle whitespace-only string', () => {
    const result = service.parsePhysicalGridCoords('   ');
    expect(result).toBeUndefined();
  });

  it('should convert empty coordinates array to empty string', () => {
    const coords: PhysicalGridCoords[] = [];
    const result = service.physicalGridCoordsToString(coords);
    expect(result).toEqual('');
  });

  it('should convert PhysicalGridLocation with empty coords to just dimensions', () => {
    const location: PhysicalGridLocation = {
      columns: 5,
      rows: 4,
      coords: [],
    };
    const result = service.physicalGridCoordsToString(location, true);
    expect(result).toEqual('5x4: ');
  });

  it('should handle invalid coordinates and return empty array when includeDimensions is false', () => {
    const text = 'INVALID 123';
    const expectedCoords: PhysicalGridCoords[] = [];
    const result = service.parsePhysicalGridCoords(text, 3, 3, false);
    expect(result).toEqual(expectedCoords);
  });

  it('should handle invalid coordinates and return empty PhysicalGridLocation when includeDimensions is true', () => {
    const text = 'INVALID 123';
    const expectedLocation: PhysicalGridLocation = {
      columns: 3,
      rows: 3,
      coords: [],
    };
    const result = service.parsePhysicalGridCoords(text, 3, 3, true);
    expect(result).toEqual(expectedLocation);
  });
});
