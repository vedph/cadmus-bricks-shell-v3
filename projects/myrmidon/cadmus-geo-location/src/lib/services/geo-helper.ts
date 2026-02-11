const EARTH_RADIUS = 6371008.8; // meters

/**
 * Generate a GeoJSON Polygon approximating a circle on the Earth's surface.
 * @param center [lng, lat] center of the circle.
 * @param radiusMeters Radius in meters.
 * @param steps Number of vertices (default 64).
 * @returns GeoJSON Polygon geometry.
 */
export function createCirclePolygon(
  center: [number, number],
  radiusMeters: number,
  steps = 64
): GeoJSON.Polygon {
  const coords: [number, number][] = [];
  const lat = (center[1] * Math.PI) / 180;
  const lng = (center[0] * Math.PI) / 180;
  const d = radiusMeters / EARTH_RADIUS;

  for (let i = 0; i <= steps; i++) {
    const bearing = (2 * Math.PI * i) / steps;
    const pLat = Math.asin(
      Math.sin(lat) * Math.cos(d) +
        Math.cos(lat) * Math.sin(d) * Math.cos(bearing)
    );
    const pLng =
      lng +
      Math.atan2(
        Math.sin(bearing) * Math.sin(d) * Math.cos(lat),
        Math.cos(d) - Math.sin(lat) * Math.sin(pLat)
      );
    coords.push([(pLng * 180) / Math.PI, (pLat * 180) / Math.PI]);
  }

  return { type: 'Polygon', coordinates: [coords] };
}

/**
 * Create a GeoJSON Polygon for a rectangle defined by two opposite corners.
 * @param corner1 [lng, lat] first corner.
 * @param corner2 [lng, lat] opposite corner.
 * @returns GeoJSON Polygon geometry.
 */
export function createRectanglePolygon(
  corner1: [number, number],
  corner2: [number, number]
): GeoJSON.Polygon {
  const [lng1, lat1] = corner1;
  const [lng2, lat2] = corner2;
  return {
    type: 'Polygon',
    coordinates: [
      [
        [lng1, lat1],
        [lng2, lat1],
        [lng2, lat2],
        [lng1, lat2],
        [lng1, lat1],
      ],
    ],
  };
}

/**
 * Calculate the distance in meters between two [lng, lat] points
 * using the Haversine formula.
 * @param p1 [lng, lat] first point.
 * @param p2 [lng, lat] second point.
 * @returns Distance in meters.
 */
export function haversineDistance(
  p1: [number, number],
  p2: [number, number]
): number {
  const dLat = ((p2[1] - p1[1]) * Math.PI) / 180;
  const dLng = ((p2[0] - p1[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1[1] * Math.PI) / 180) *
      Math.cos((p2[1] * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Collect all coordinate pairs from a GeoJSON geometry.
 */
function collectCoords(geometry: GeoJSON.Geometry): [number, number][] {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates as [number, number]];
    case 'MultiPoint':
    case 'LineString':
      return geometry.coordinates as [number, number][];
    case 'MultiLineString':
    case 'Polygon':
      return (geometry.coordinates as [number, number][][]).flat();
    case 'MultiPolygon':
      return (geometry.coordinates as [number, number][][][]).flat(2);
    case 'GeometryCollection':
      return geometry.geometries.flatMap(collectCoords);
    default:
      return [];
  }
}

/**
 * Compute the centroid of a GeoJSON geometry as the arithmetic mean
 * of all its coordinate pairs.
 * @param geometry A GeoJSON Geometry object.
 * @returns [lng, lat] centroid, or null if the geometry has no coordinates.
 */
export function computeCentroid(
  geometry: GeoJSON.Geometry,
): [number, number] | null {
  const coords = collectCoords(geometry);
  if (!coords.length) {
    return null;
  }
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of coords) {
    sumLng += lng;
    sumLat += lat;
  }
  return [sumLng / coords.length, sumLat / coords.length];
}
