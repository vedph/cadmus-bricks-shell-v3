import {
  bboxFromCorners,
  createBBoxPolygon,
  createCirclePolygon,
  createRegionPolygon,
  createRingPolygon,
  crossesAntimeridian,
  getBBoxWidth,
  getPointsBounds,
  haversineDistance,
  isInBBox,
  isInRegion,
  isValidBBox,
  moveBBox,
  moveRegion,
  normalizeRegion,
  roundCoord,
  wrapLng,
} from './pleiades-geo';
import { PleiadesBBox, PleiadesLngLat } from '../models';

describe('pleiades-geo', () => {
  it('roundCoord rounds to 6 decimals', () => {
    expect(roundCoord(12.123456789)).toBe(12.123457);
  });

  describe('wrapLng', () => {
    it('keeps in-range longitudes', () => {
      expect(wrapLng(0)).toBe(0);
      expect(wrapLng(180)).toBe(180);
      expect(wrapLng(-180)).toBe(-180);
    });
    it('wraps out-of-range longitudes', () => {
      expect(wrapLng(190)).toBeCloseTo(-170);
      expect(wrapLng(-190)).toBeCloseTo(170);
      expect(wrapLng(370)).toBeCloseTo(10);
      expect(wrapLng(540)).toBe(180);
    });
  });

  it('haversineDistance measures about 111 km per latitude degree', () => {
    const d = haversineDistance([12, 41], [12, 42]);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
    expect(haversineDistance([12, 41], [12, 41])).toBe(0);
  });

  describe('circles', () => {
    it('createCirclePolygon builds a closed ring at the radius', () => {
      const center: [number, number] = [23.72, 37.97];
      const polygon = createCirclePolygon(center, 10_000, 32);
      expect(polygon.type).toBe('Polygon');
      const ring = polygon.coordinates[0] as [number, number][];
      expect(ring.length).toBe(33);
      expect(ring[0]).toEqual(ring[ring.length - 1]);
      for (const p of ring) {
        expect(haversineDistance(center, p)).toBeCloseTo(10_000, -1);
      }
    });

    it('createRingPolygon has a hole for min', () => {
      const polygon = createRingPolygon([0, 0], 1000, 5000, 16);
      expect(polygon.coordinates.length).toBe(2);
      const outer = polygon.coordinates[0] as [number, number][];
      const inner = polygon.coordinates[1] as [number, number][];
      expect(haversineDistance([0, 0], outer[3])).toBeCloseTo(5000, -1);
      expect(haversineDistance([0, 0], inner[3])).toBeCloseTo(1000, -1);
    });

    it('createRingPolygon has no hole without a valid min', () => {
      expect(createRingPolygon([0, 0], 0, 5000).coordinates.length).toBe(1);
      expect(createRingPolygon([0, 0], 6000, 5000).coordinates.length).toBe(
        1,
      );
    });
  });

  describe('bbox', () => {
    it('createBBoxPolygon builds a closed rectangle', () => {
      const polygon = createBBoxPolygon({ sw: [1, 2], ne: [3, 4] });
      expect(polygon.coordinates[0]).toEqual([
        [1, 2],
        [3, 2],
        [3, 4],
        [1, 4],
        [1, 2],
      ]);
    });

    it('bboxFromCorners normalizes any two corners', () => {
      expect(bboxFromCorners([24, 37], [23, 38])).toEqual({
        sw: [23, 37],
        ne: [24, 38],
      });
      expect(bboxFromCorners([10, 95], [20, -100])).toEqual({
        sw: [10, -90],
        ne: [20, 90],
      });
      // spanning 360 degrees or more: the whole world
      expect(bboxFromCorners([370, 0], [5, 1])).toEqual({
        sw: [-180, 0],
        ne: [180, 1],
      });
    });

    it('bboxFromCorners wraps boxes crossing the antimeridian', () => {
      // map longitudes are continuous: 190 is east of 170
      const box = bboxFromCorners([170, 10], [190, 20]);
      expect(box).toEqual({ sw: [170, 10], ne: [-170, 20] });
      expect(crossesAntimeridian(box)).toBe(true);
      expect(getBBoxWidth(box)).toBe(20);
      // the same box drawn in the western world copy
      expect(bboxFromCorners([-190, 10], [-170, 20])).toEqual(box);
    });

    it('createBBoxPolygon unwraps boxes crossing the antimeridian', () => {
      const polygon = createBBoxPolygon({ sw: [170, 10], ne: [-170, 20] });
      expect(polygon.coordinates[0][1]).toEqual([190, 10]);
    });

    it('moveBBox moves keeping size', () => {
      const moved = moveBBox({ sw: [10, 10], ne: [12, 13] }, 1, -2);
      expect(moved).toEqual({ sw: [11, 8], ne: [13, 11] });
    });

    it('moveBBox clamps latitudes and wraps longitudes', () => {
      const moved = moveBBox({ sw: [170, 80], ne: [175, 85] }, 20, 20);
      expect(moved).toEqual({ sw: [-170, 85], ne: [-165, 90] });
      const moved2 = moveBBox({ sw: [-175, -85], ne: [-170, -80] }, -20, -20);
      expect(moved2).toEqual({ sw: [165, -90], ne: [170, -85] });
    });

    it('moveBBox moves a box across the antimeridian', () => {
      const moved = moveBBox({ sw: [160, 0], ne: [175, 5] }, 10, 0);
      expect(moved).toEqual({ sw: [170, 0], ne: [-175, 5] });
      expect(getBBoxWidth(moved)).toBe(15);
    });

    it('isInBBox includes borders', () => {
      const box = { sw: [0, 0] as [number, number], ne: [2, 2] as [number, number] };
      expect(isInBBox([1, 1], box)).toBe(true);
      expect(isInBBox([0, 2], box)).toBe(true);
      expect(isInBBox([3, 1], box)).toBe(false);
      expect(isInBBox([1, 3], box)).toBe(false);
    });

    it('isInBBox handles boxes crossing the antimeridian', () => {
      const box: PleiadesBBox = { sw: [170, 0], ne: [-170, 10] };
      expect(isInBBox([175, 5], box)).toBe(true);
      expect(isInBBox([-175, 5], box)).toBe(true);
      // unwrapped point
      expect(isInBBox([185, 5], box)).toBe(true);
      expect(isInBBox([0, 5], box)).toBe(false);
    });

    it('isValidBBox checks ranges and corners', () => {
      expect(isValidBBox(undefined)).toBe(false);
      expect(isValidBBox({ sw: [0, 0], ne: [1, 1] })).toBe(true);
      // crossing the antimeridian
      expect(isValidBBox({ sw: [1, 0], ne: [0, 1] })).toBe(true);
      expect(isValidBBox({ sw: [0, 1], ne: [1, 0] })).toBe(false);
      expect(isValidBBox({ sw: [0, 0], ne: [181, 1] })).toBe(false);
      expect(isValidBBox({ sw: [0, -91], ne: [1, 1] })).toBe(false);
      expect(isValidBBox({ sw: [NaN, 0], ne: [1, 1] })).toBe(false);
    });
  });

  describe('regions', () => {
    const triangle: PleiadesLngLat[] = [
      [23, 37.5],
      [24.2, 37.5],
      [23.6, 38.5],
    ];

    it('normalizeRegion removes duplicates and closing vertex', () => {
      expect(
        normalizeRegion([
          [23, 37.5],
          [23, 37.5],
          [24.2, 37.5],
          [23.6, 38.5],
          [23, 37.5],
        ]),
      ).toEqual(triangle);
    });

    it('normalizeRegion shifts world copies keeping continuity', () => {
      expect(
        normalizeRegion([
          [530, 10],
          [550, 10],
          [540, 20],
        ]),
      ).toEqual([
        [170, 10],
        [190, 10],
        [180, 20],
      ]);
      expect(
        normalizeRegion([
          [-190, 10],
          [-170, 10],
          [-180, 20],
        ]),
      ).toEqual([
        [170, 10],
        [190, 10],
        [180, 20],
      ]);
    });

    it('normalizeRegion rounds and clamps', () => {
      expect(normalizeRegion([[1.123456789, 95]])).toEqual([[1.123457, 90]]);
    });

    it('createRegionPolygon closes the ring', () => {
      expect(createRegionPolygon(triangle).coordinates[0]).toEqual([
        ...triangle,
        triangle[0],
      ]);
    });

    it('moveRegion moves and clamps latitudes', () => {
      expect(moveRegion(triangle, 1, 1)).toEqual([
        [24, 38.5],
        [25.2, 38.5],
        [24.6, 39.5],
      ]);
      const moved = moveRegion(triangle, 0, 100);
      expect(Math.max(...moved.map((v) => v[1]))).toBe(90);
      expect(moved[0][1]).toBe(89);
    });

    it('moveRegion moves across the antimeridian', () => {
      const moved = moveRegion(
        [
          [160, 0],
          [170, 0],
          [165, 5],
        ],
        15,
        0,
      );
      expect(moved).toEqual([
        [175, 0],
        [185, 0],
        [180, 5],
      ]);
    });

    it('isInRegion tests points', () => {
      expect(isInRegion([23.6, 37.8], triangle)).toBe(true);
      expect(isInRegion([23.05, 38.4], triangle)).toBe(false);
      expect(isInRegion([23.6, 37.8], triangle.slice(0, 2))).toBe(false);
    });

    it('isInRegion handles regions across the antimeridian', () => {
      const region: PleiadesLngLat[] = [
        [170, 0],
        [190, 0],
        [190, 10],
        [170, 10],
      ];
      expect(isInRegion([-175, 5], region)).toBe(true);
      expect(isInRegion([175, 5], region)).toBe(true);
      expect(isInRegion([185, 5], region)).toBe(true);
      expect(isInRegion([0, 5], region)).toBe(false);
    });
  });

  describe('getPointsBounds', () => {
    it('returns null without located points', () => {
      expect(getPointsBounds([])).toBeNull();
      expect(getPointsBounds([{ lat: null, lng: null }])).toBeNull();
    });
    it('returns the bounds of located points', () => {
      expect(
        getPointsBounds([
          { lat: 37, lng: 23 },
          { lat: null, lng: null },
          { lat: 41, lng: 12 },
        ]),
      ).toEqual({ sw: [12, 37], ne: [23, 41] });
    });
  });
});
