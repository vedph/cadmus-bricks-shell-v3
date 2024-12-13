import { TestBed } from '@angular/core/testing';

import { PhysicalGridCoordsService } from './physical-grid-coords.service';
import { PhysicalGridCoords } from '../components/physical-grid-location/physical-grid-location.component';

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

  it('should parse textual representation of physical grid coordinates', () => {
    const text = 'A1 B1 A2';
    const expectedCoords: PhysicalGridCoords[] = [
      { row: 1, column: 1 },
      { row: 1, column: 2 },
      { row: 2, column: 1 },
    ];
    const result = service.parsePhysicalGridCoords(text);
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
});
