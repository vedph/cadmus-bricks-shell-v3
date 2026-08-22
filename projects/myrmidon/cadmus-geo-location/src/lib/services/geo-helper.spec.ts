import {
  computeCentroid,
  createCirclePolygon,
  createRectanglePolygon,
  haversineDistance,
} from './geo-helper';

describe('geo-helper', () => {
  describe('createCirclePolygon', () => {
    it('creates a polygon with the default number of steps', () => {
      const polygon = createCirclePolygon([12, 41], 1000);
      expect(polygon.type).toBe('Polygon');
      // default steps=64 => 65 vertices (closed ring, i from 0 to steps inclusive)
      expect(polygon.coordinates[0]).toHaveLength(65);
    });

    it('creates a polygon with a custom number of steps', () => {
      const polygon = createCirclePolygon([12, 41], 1000, 8);
      expect(polygon.coordinates[0]).toHaveLength(9);
    });

    it('produces a closed ring (first and last coordinates coincide)', () => {
      const polygon = createCirclePolygon([12, 41], 500, 16);
      const coords = polygon.coordinates[0];
      const first = coords[0];
      const last = coords[coords.length - 1];
      expect(first[0]).toBeCloseTo(last[0], 6);
      expect(first[1]).toBeCloseTo(last[1], 6);
    });

    it('produces points approximately at the given radius from the center', () => {
      const center: [number, number] = [12, 41];
      const radius = 2000;
      const polygon = createCirclePolygon(center, radius, 32);
      for (const pt of polygon.coordinates[0]) {
        const d = haversineDistance(center, pt as [number, number]);
        expect(d).toBeCloseTo(radius, -1); // within ~tens of meters
      }
    });

    it('collapses to the center when radius is 0', () => {
      const center: [number, number] = [12, 41];
      const polygon = createCirclePolygon(center, 0, 4);
      for (const pt of polygon.coordinates[0]) {
        expect(pt[0]).toBeCloseTo(center[0], 6);
        expect(pt[1]).toBeCloseTo(center[1], 6);
      }
    });
  });

  describe('createRectanglePolygon', () => {
    it('creates a closed 5-point ring from two opposite corners', () => {
      const polygon = createRectanglePolygon([0, 0], [2, 1]);
      expect(polygon.type).toBe('Polygon');
      expect(polygon.coordinates[0]).toEqual([
        [0, 0],
        [2, 0],
        [2, 1],
        [0, 1],
        [0, 0],
      ]);
    });

    it('works with corners in reverse order', () => {
      const polygon = createRectanglePolygon([2, 1], [0, 0]);
      expect(polygon.coordinates[0]).toEqual([
        [2, 1],
        [0, 1],
        [0, 0],
        [2, 0],
        [2, 1],
      ]);
    });

    it('collapses to a degenerate ring when corners coincide', () => {
      const polygon = createRectanglePolygon([1, 1], [1, 1]);
      expect(polygon.coordinates[0]).toEqual([
        [1, 1],
        [1, 1],
        [1, 1],
        [1, 1],
        [1, 1],
      ]);
    });
  });

  describe('haversineDistance', () => {
    it('returns 0 for identical points', () => {
      expect(haversineDistance([12, 41], [12, 41])).toBe(0);
    });

    it('is symmetric', () => {
      const p1: [number, number] = [12, 41];
      const p2: [number, number] = [13, 42];
      expect(haversineDistance(p1, p2)).toBeCloseTo(
        haversineDistance(p2, p1),
        9,
      );
    });

    it('computes approximately 111 km for 1 degree of latitude', () => {
      const d = haversineDistance([0, 0], [0, 1]);
      expect(d).toBeCloseTo(111195, -3); // within ~1km precision at -3 digits
    });

    it('computes 0 distance for antimeridian-adjacent identical longitude wraparound points', () => {
      // sanity: two points that are actually the same location.
      const d = haversineDistance([179.9999, 10], [179.9999, 10]);
      expect(d).toBe(0);
    });
  });

  describe('computeCentroid', () => {
    it('returns null for a geometry with no coordinates (GeometryCollection empty)', () => {
      const result = computeCentroid({
        type: 'GeometryCollection',
        geometries: [],
      });
      expect(result).toBeNull();
    });

    it('returns null for an unsupported/unknown geometry type', () => {
      const result = computeCentroid({ type: 'Weird' } as unknown as GeoJSON.Geometry);
      expect(result).toBeNull();
    });

    it('computes centroid of a Point as the point itself', () => {
      const result = computeCentroid({ type: 'Point', coordinates: [12, 41] });
      expect(result).toEqual([12, 41]);
    });

    it('computes centroid of a MultiPoint', () => {
      const result = computeCentroid({
        type: 'MultiPoint',
        coordinates: [
          [0, 0],
          [2, 2],
        ],
      });
      expect(result).toEqual([1, 1]);
    });

    it('computes centroid of a LineString', () => {
      const result = computeCentroid({
        type: 'LineString',
        coordinates: [
          [0, 0],
          [4, 0],
        ],
      });
      expect(result).toEqual([2, 0]);
    });

    it('computes centroid of a Polygon (arithmetic mean of ring vertices, including the closing duplicate)', () => {
      const result = computeCentroid({
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ],
        ],
      });
      // arithmetic mean of the 5 listed points (closing point duplicated)
      // sumLng = 0+2+2+0+0=4, sumLat=0+0+2+2+0=4, /5 = 0.8
      expect(result).toEqual([0.8, 0.8]);
    });

    it('computes centroid of a MultiPolygon', () => {
      const result = computeCentroid({
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        ],
      });
      expect(result).toEqual([0.8, 0.8]);
    });

    it('computes centroid of a GeometryCollection recursively', () => {
      const result = computeCentroid({
        type: 'GeometryCollection',
        geometries: [
          { type: 'Point', coordinates: [0, 0] },
          { type: 'Point', coordinates: [2, 2] },
        ],
      });
      expect(result).toEqual([1, 1]);
    });
  });
});
