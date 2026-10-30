import type { Polygon } from 'geojson';

import { PleiadesBBox, PleiadesLngLat } from '../models';

const EARTH_RADIUS = 6371008.8; // meters

/**
 * Clamp a value into the specified range.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Round a coordinate to 6 decimals (about 10 cm).
 * @param value The coordinate.
 * @returns The rounded coordinate.
 */
export function roundCoord(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/**
 * Wrap a longitude into the range -180 to 180, as maps with world copies
 * can produce longitudes out of this range.
 * @param lng The longitude.
 * @returns The wrapped longitude.
 */
export function wrapLng(lng: number): number {
  if (lng >= -180 && lng <= 180) {
    return lng;
  }
  const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 && lng > 0 ? 180 : wrapped;
}

/**
 * Calculate the distance in meters between two points using the
 * Haversine formula.
 * @param p1 The first point.
 * @param p2 The second point.
 * @returns The distance in meters.
 */
export function haversineDistance(
  p1: PleiadesLngLat,
  p2: PleiadesLngLat,
): number {
  const dLat = ((p2[1] - p1[1]) * Math.PI) / 180;
  const dLng = ((p2[0] - p1[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1[1] * Math.PI) / 180) *
      Math.cos((p2[1] * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Build the ring of points approximating a circle on the Earth's surface.
 * @param center The center.
 * @param radius The radius in meters.
 * @param steps The number of vertices.
 * @returns The closed ring.
 */
function createCircleRing(
  center: PleiadesLngLat,
  radius: number,
  steps: number,
): PleiadesLngLat[] {
  const ring: PleiadesLngLat[] = [];
  const lat = (center[1] * Math.PI) / 180;
  const lng = (center[0] * Math.PI) / 180;
  const d = radius / EARTH_RADIUS;

  for (let i = 0; i <= steps; i++) {
    const bearing = (2 * Math.PI * i) / steps;
    const pLat = Math.asin(
      Math.sin(lat) * Math.cos(d) +
        Math.cos(lat) * Math.sin(d) * Math.cos(bearing),
    );
    const pLng =
      lng +
      Math.atan2(
        Math.sin(bearing) * Math.sin(d) * Math.cos(lat),
        Math.cos(d) - Math.sin(lat) * Math.sin(pLat),
      );
    ring.push([(pLng * 180) / Math.PI, (pLat * 180) / Math.PI]);
  }
  // close the ring exactly
  ring[ring.length - 1] = ring[0];
  return ring;
}

/**
 * Create a polygon approximating a circle on the Earth's surface.
 * @param center The center.
 * @param radius The radius in meters.
 * @param steps The number of vertices (default 64).
 * @returns The polygon.
 */
export function createCirclePolygon(
  center: PleiadesLngLat,
  radius: number,
  steps = 64,
): Polygon {
  return {
    type: 'Polygon',
    coordinates: [createCircleRing(center, radius, steps)],
  };
}

/**
 * Create a polygon for the ring (annulus) between two distances from a
 * center, i.e. a circle with radius `max` and a hole with radius `min`.
 * When `min` is 0 the result is a plain circle.
 * @param center The center.
 * @param min The inner radius in meters (0=none).
 * @param max The outer radius in meters.
 * @param steps The number of vertices (default 64).
 * @returns The polygon.
 */
export function createRingPolygon(
  center: PleiadesLngLat,
  min: number,
  max: number,
  steps = 64,
): Polygon {
  const outer = createCircleRing(center, max, steps);
  if (min <= 0 || min >= max) {
    return { type: 'Polygon', coordinates: [outer] };
  }
  // holes must wind opposite to the outer ring
  const inner = createCircleRing(center, min, steps).reverse();
  return { type: 'Polygon', coordinates: [outer, inner] };
}

/**
 * Get the width in degrees of a bounding box, which may cross the
 * antimeridian.
 * @param bbox The box.
 * @returns The width (0-360).
 */
export function getBBoxWidth(bbox: PleiadesBBox): number {
  const w = bbox.ne[0] - bbox.sw[0];
  return w < 0 ? w + 360 : w;
}

/**
 * True if the bounding box crosses the antimeridian, i.e. its W edge is
 * east of its E edge.
 * @param bbox The box.
 * @returns True if crossing.
 */
export function crossesAntimeridian(bbox: PleiadesBBox): boolean {
  return bbox.sw[0] > bbox.ne[0];
}

/**
 * Create a polygon for a bounding box. When the box crosses the
 * antimeridian, its E edge is unwrapped (e.g. 190 rather than -170), so
 * that maps draw it continuously across the antimeridian.
 * @param bbox The box.
 * @returns The polygon.
 */
export function createBBoxPolygon(bbox: PleiadesBBox): Polygon {
  const [w, s] = bbox.sw;
  const n = bbox.ne[1];
  const e = w + getBBoxWidth(bbox);
  return {
    type: 'Polygon',
    coordinates: [
      [
        [w, s],
        [e, s],
        [e, n],
        [w, n],
        [w, s],
      ],
    ],
  };
}

/**
 * Wrap the longitude of a W edge: as a W edge, 180 is the same as -180,
 * which avoids a box being mistaken as crossing the antimeridian.
 */
function westEdge(lng: number): number {
  const w = wrapLng(lng);
  return w === 180 ? -180 : w;
}

/**
 * Build a bounding box from any two opposite corners, as got from a map.
 * Map longitudes are continuous across the antimeridian (e.g. 190 east of
 * 179), so the box is built from them and then wrapped: a box crossing
 * the antimeridian gets its W edge east of its E edge. Latitudes are
 * clamped into their range.
 * @param a The first corner.
 * @param b The opposite corner.
 * @returns The box with its SW and NE corners.
 */
export function bboxFromCorners(
  a: PleiadesLngLat,
  b: PleiadesLngLat,
): PleiadesBBox {
  let w = Math.min(a[0], b[0]);
  let e = Math.max(a[0], b[0]);
  if (e - w >= 360) {
    w = -180;
    e = 180;
  } else {
    w = westEdge(w);
    e = wrapLng(e);
  }
  const lat1 = clamp(a[1], -90, 90);
  const lat2 = clamp(b[1], -90, 90);
  return {
    sw: [roundCoord(w), roundCoord(Math.min(lat1, lat2))],
    ne: [roundCoord(e), roundCoord(Math.max(lat1, lat2))],
  };
}

/**
 * Move a bounding box by the specified offsets without changing its size.
 * Longitudes wrap around the antimeridian, while latitudes are kept inside
 * their range.
 * @param bbox The box.
 * @param dLng The longitude offset.
 * @param dLat The latitude offset.
 * @returns The moved box.
 */
export function moveBBox(
  bbox: PleiadesBBox,
  dLng: number,
  dLat: number,
): PleiadesBBox {
  const width = getBBoxWidth(bbox);
  const height = bbox.ne[1] - bbox.sw[1];
  const w = bbox.sw[0] + dLng;
  const s = clamp(bbox.sw[1] + dLat, -90, 90 - height);
  return {
    sw: [roundCoord(width >= 360 ? -180 : westEdge(w)), roundCoord(s)],
    ne: [roundCoord(width >= 360 ? 180 : wrapLng(w + width)), roundCoord(s + height)],
  };
}

/**
 * True if the point is inside the box (borders included). The point
 * longitude may be unwrapped, and the box may cross the antimeridian.
 * @param point The point.
 * @param bbox The box.
 * @returns True if inside.
 */
export function isInBBox(point: PleiadesLngLat, bbox: PleiadesBBox): boolean {
  if (point[1] < bbox.sw[1] || point[1] > bbox.ne[1]) {
    return false;
  }
  // longitude offset from the W edge, eastwards
  const d = (((point[0] - bbox.sw[0]) % 360) + 360) % 360;
  return d <= getBBoxWidth(bbox) || getBBoxWidth(bbox) >= 360;
}

/**
 * True if the box is valid, i.e. its coordinates are in range, and its SW
 * corner is south of its NE corner. Its SW corner can be east of its NE
 * corner, when the box crosses the antimeridian.
 * @param bbox The box.
 * @returns True if valid.
 */
export function isValidBBox(bbox: PleiadesBBox | null | undefined): boolean {
  if (!bbox) {
    return false;
  }
  const [w, s] = bbox.sw;
  const [e, n] = bbox.ne;
  return (
    [w, s, e, n].every((v) => typeof v === 'number' && !isNaN(v)) &&
    w >= -180 &&
    w <= 180 &&
    e >= -180 &&
    e <= 180 &&
    s >= -90 &&
    n <= 90 &&
    s <= n
  );
}

/**
 * Normalize the vertices of a region polygon: remove consecutive duplicate
 * vertices and the closing vertex, round coordinates, clamp latitudes, and
 * shift longitudes by multiples of 360 so that the westernmost one is in
 * the range -180 to 180. Longitudes stay continuous, so a polygon crossing
 * the antimeridian has longitudes greater than 180.
 * @param vertices The vertices.
 * @returns The normalized vertices.
 */
export function normalizeRegion(vertices: PleiadesLngLat[]): PleiadesLngLat[] {
  const result: PleiadesLngLat[] = [];
  for (const v of vertices) {
    const p: PleiadesLngLat = [roundCoord(v[0]), roundCoord(clamp(v[1], -90, 90))];
    const last = result[result.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) {
      result.push(p);
    }
  }
  while (
    result.length > 1 &&
    result[0][0] === result[result.length - 1][0] &&
    result[0][1] === result[result.length - 1][1]
  ) {
    result.pop();
  }
  if (!result.length) {
    return result;
  }
  const minLng = Math.min(...result.map((p) => p[0]));
  const shift = Math.floor((minLng + 180) / 360) * 360;
  return shift
    ? result.map(([lng, lat]) => [roundCoord(lng - shift), lat])
    : result;
}

/**
 * Create a polygon for a region.
 * @param vertices The region vertices, without closing vertex.
 * @returns The polygon.
 */
export function createRegionPolygon(vertices: PleiadesLngLat[]): Polygon {
  return {
    type: 'Polygon',
    coordinates: [[...vertices, vertices[0]]],
  };
}

/**
 * Move a region by the specified offsets, keeping its latitudes inside
 * their range.
 * @param vertices The region vertices.
 * @param dLng The longitude offset.
 * @param dLat The latitude offset.
 * @returns The moved and normalized vertices.
 */
export function moveRegion(
  vertices: PleiadesLngLat[],
  dLng: number,
  dLat: number,
): PleiadesLngLat[] {
  if (!vertices.length) {
    return vertices;
  }
  const lats = vertices.map((v) => v[1]);
  const d = clamp(dLat, -90 - Math.min(...lats), 90 - Math.max(...lats));
  return normalizeRegion(vertices.map(([lng, lat]) => [lng + dLng, lat + d]));
}

/**
 * True if the point is inside the region polygon (even-odd rule). The
 * point longitude may be unwrapped, and the region may have longitudes
 * beyond 180.
 * @param point The point.
 * @param vertices The region vertices.
 * @returns True if inside.
 */
export function isInRegion(
  point: PleiadesLngLat,
  vertices: PleiadesLngLat[],
): boolean {
  if (vertices.length < 3) {
    return false;
  }
  const test = (x: number, y: number): boolean => {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const [xi, yi] = vertices[i];
      const [xj, yj] = vertices[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  };
  const x = wrapLng(point[0]);
  return [x, x + 360, x - 360].some((lng) => test(lng, point[1]));
}

/**
 * Get the bounds including all the specified points.
 * @param points The points; null coordinates are skipped.
 * @returns The bounds, or null if there are no located points.
 */
export function getPointsBounds(
  points: { lat: number | null; lng: number | null }[],
): PleiadesBBox | null {
  let w = Infinity,
    s = Infinity,
    e = -Infinity,
    n = -Infinity;
  for (const p of points) {
    if (p.lat === null || p.lng === null) {
      continue;
    }
    w = Math.min(w, p.lng);
    e = Math.max(e, p.lng);
    s = Math.min(s, p.lat);
    n = Math.max(n, p.lat);
  }
  return w === Infinity ? null : { sw: [w, s], ne: [e, n] };
}
