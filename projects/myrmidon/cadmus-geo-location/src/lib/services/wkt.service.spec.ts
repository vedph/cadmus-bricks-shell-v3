import { TestBed } from '@angular/core/testing';

import { WktService } from './wkt.service';
import { GeoLocationGeometryFormat } from '../models';

describe('WktService', () => {
  let service: WktService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WktService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('toGeoJSON', () => {
    it('returns null for undefined input', () => {
      expect(
        service.toGeoJSON(undefined, GeoLocationGeometryFormat.WKT),
      ).toBeNull();
    });

    it('returns null for null input', () => {
      expect(
        service.toGeoJSON(null, GeoLocationGeometryFormat.WKT),
      ).toBeNull();
    });

    it('returns null for an empty string', () => {
      expect(service.toGeoJSON('', GeoLocationGeometryFormat.WKT)).toBeNull();
    });

    it('returns null for a whitespace-only string', () => {
      expect(
        service.toGeoJSON('   \t  ', GeoLocationGeometryFormat.WKT),
      ).toBeNull();
    });

    it('parses a valid WKT POINT', () => {
      const result = service.toGeoJSON(
        'POINT(12 41)',
        GeoLocationGeometryFormat.WKT,
      );
      expect(result).toEqual({ type: 'Point', coordinates: [12, 41] });
    });

    it('parses a valid WKT POLYGON', () => {
      const result = service.toGeoJSON(
        'POLYGON((12.48 41.89, 12.49 41.89, 12.49 41.90, 12.48 41.90, 12.48 41.89))',
        GeoLocationGeometryFormat.WKT,
      );
      expect(result?.type).toBe('Polygon');
      expect((result as GeoJSON.Polygon).coordinates[0]).toHaveLength(5);
    });

    it('returns null for an invalid WKT string', () => {
      const result = service.toGeoJSON(
        'NOT A WKT STRING(((',
        GeoLocationGeometryFormat.WKT,
      );
      expect(result).toBeNull();
    });

    it('parses a valid GeoJSON string', () => {
      const geojson = JSON.stringify({
        type: 'Point',
        coordinates: [12, 41],
      });
      const result = service.toGeoJSON(
        geojson,
        GeoLocationGeometryFormat.GeoJSON,
      );
      expect(result).toEqual({ type: 'Point', coordinates: [12, 41] });
    });

    it('returns null for malformed GeoJSON (invalid JSON)', () => {
      const result = service.toGeoJSON(
        '{ not valid json',
        GeoLocationGeometryFormat.GeoJSON,
      );
      expect(result).toBeNull();
    });
  });

  describe('fromGeoJSON', () => {
    it('serializes to WKT for a Point', () => {
      const result = service.fromGeoJSON(
        { type: 'Point', coordinates: [12, 41] },
        GeoLocationGeometryFormat.WKT,
      );
      expect(result).toBe('POINT (12 41)');
    });

    it('serializes to WKT for a Polygon', () => {
      const result = service.fromGeoJSON(
        {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
        GeoLocationGeometryFormat.WKT,
      );
      expect(result).toContain('POLYGON');
    });

    it('serializes to a pretty-printed GeoJSON string', () => {
      const geom: GeoJSON.Geometry = { type: 'Point', coordinates: [12, 41] };
      const result = service.fromGeoJSON(
        geom,
        GeoLocationGeometryFormat.GeoJSON,
      );
      expect(result).toBe(JSON.stringify(geom, null, 2));
      expect(JSON.parse(result)).toEqual(geom);
    });

    it('round-trips WKT -> GeoJSON -> WKT for a point', () => {
      const original = 'POINT(12.5 41.9)';
      const geojson = service.toGeoJSON(
        original,
        GeoLocationGeometryFormat.WKT,
      );
      expect(geojson).not.toBeNull();
      const back = service.fromGeoJSON(
        geojson as GeoJSON.Geometry,
        GeoLocationGeometryFormat.WKT,
      );
      expect(back).toBe('POINT (12.5 41.9)');
    });
  });
});
