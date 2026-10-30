import {
  PleiadesBBox,
  PleiadesLngLat,
  PleiadesSearchRequest,
  PleiadesSearchScope,
  PleiadesSearchSort,
  PleiadesSpatialMode,
} from '../../models';
import { getUriLastSegment } from '../../services/pleiades-helpers';

/**
 * The editable controls of the Pleiades query component. Numeric filters
 * equal to 0 or null are not set. Distances are in km.
 */
export interface PleiadesQueryControls {
  text: string;
  matchAny: boolean;
  scopes: PleiadesSearchScope[];
  /** The place types, as their short names (e.g. `settlement`). */
  placeTypes: string[];
  rankMin: number | null;
  rankMax: number | null;
  yearMin: number | null;
  yearMax: number | null;
  sort: PleiadesSearchSort;
  spatialMode: PleiadesSpatialMode;
  pointLat: number | null;
  pointLng: number | null;
  /** The minimum distance in km. */
  distanceMin: number | null;
  /** The maximum distance in km. */
  distanceMax: number | null;
  swLat: number | null;
  swLng: number | null;
  neLat: number | null;
  neLng: number | null;
  containedInBox: boolean;
  /** The region vertices (empty for none). */
  region: PleiadesLngLat[];
  containedInRegion: boolean;
  pageSize: number;
}

/**
 * Create the default query controls.
 * @param pageSize The page size (default 50).
 * @param scopes The default scopes (default none, i.e. all).
 * @returns The controls.
 */
export function createPleiadesQueryControls(
  pageSize = 50,
  scopes: PleiadesSearchScope[] = [],
): PleiadesQueryControls {
  return {
    text: '',
    matchAny: false,
    scopes: [...scopes],
    placeTypes: [],
    rankMin: null,
    rankMax: null,
    yearMin: null,
    yearMax: null,
    sort: 'title',
    spatialMode: 'none',
    pointLat: null,
    pointLng: null,
    distanceMin: null,
    distanceMax: null,
    swLat: null,
    swLng: null,
    neLat: null,
    neLng: null,
    containedInBox: false,
    region: [],
    containedInRegion: false,
    pageSize,
  };
}

function isSet(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && !isNaN(value);
}

function nonZero(value: number | null | undefined): number | undefined {
  return isSet(value) && value !== 0 ? value : undefined;
}

/**
 * Get the distance point from the controls, if set.
 * @param c The controls.
 * @returns The point as `[lng, lat]`, or undefined.
 */
export function getQueryPoint(
  c: PleiadesQueryControls,
): PleiadesLngLat | undefined {
  return isSet(c.pointLng) && isSet(c.pointLat)
    ? [c.pointLng, c.pointLat]
    : undefined;
}

/**
 * Get the bounding box from the controls, if all its corners are set.
 * @param c The controls.
 * @returns The box, or undefined.
 */
export function getQueryBBox(
  c: PleiadesQueryControls,
): PleiadesBBox | undefined {
  return isSet(c.swLng) && isSet(c.swLat) && isSet(c.neLng) && isSet(c.neLat)
    ? { sw: [c.swLng, c.swLat], ne: [c.neLng, c.neLat] }
    : undefined;
}

/**
 * Get the region from the controls, if it has at least 3 vertices.
 * @param c The controls.
 * @returns The region vertices, or undefined.
 */
export function getQueryRegion(
  c: PleiadesQueryControls,
): PleiadesLngLat[] | undefined {
  return c.region.length >= 3 ? c.region : undefined;
}

/**
 * Convert km into meters.
 */
function kmToMeters(km: number | null | undefined): number | undefined {
  return isSet(km) && km > 0 ? Math.round(km * 1000) : undefined;
}

/**
 * Build a search request from the query controls. Only the filters of
 * the current spatial mode are included; sorting by distance falls back
 * to title when there is no distance point.
 * @param c The controls.
 * @param pageNumber The page number (default 1).
 * @returns The request.
 */
export function pleiadesQueryToRequest(
  c: PleiadesQueryControls,
  pageNumber = 1,
): PleiadesSearchRequest {
  const request: PleiadesSearchRequest = {
    pageNumber,
    pageSize: c.pageSize,
  };
  const text = c.text.trim();
  if (text) {
    request.text = text;
    if (c.matchAny) {
      request.matchAny = true;
    }
  }
  if (c.scopes.length) {
    request.scopes = [...c.scopes];
  }
  if (c.placeTypes.length) {
    request.placeTypes = c.placeTypes.map((t) => '/' + t);
  }
  request.rankMin = nonZero(c.rankMin);
  request.rankMax = nonZero(c.rankMax);
  request.yearMin = nonZero(c.yearMin);
  request.yearMax = nonZero(c.yearMax);

  let hasPoint = false;
  if (c.spatialMode === 'range') {
    const point = getQueryPoint(c);
    if (point) {
      hasPoint = true;
      request.distanceLon = point[0];
      request.distanceLat = point[1];
      request.distanceMin = kmToMeters(c.distanceMin);
      request.distanceMax = kmToMeters(c.distanceMax);
    }
  } else if (c.spatialMode === 'bbox') {
    const bbox = getQueryBBox(c);
    if (bbox) {
      request.swCornerLon = bbox.sw[0];
      request.swCornerLat = bbox.sw[1];
      request.neCornerLon = bbox.ne[0];
      request.neCornerLat = bbox.ne[1];
      if (c.containedInBox) {
        request.containedInBox = true;
      }
    }
  } else if (c.spatialMode === 'polygon') {
    const region = getQueryRegion(c);
    if (region) {
      request.region = region.map((v) => [...v] as PleiadesLngLat);
      if (c.containedInRegion) {
        request.containedInRegion = true;
      }
    }
  }
  request.sort = c.sort === 'distance' && hasPoint ? 'distance' : 'title';

  // drop undefined properties
  for (const key of Object.keys(request) as (keyof PleiadesSearchRequest)[]) {
    if (request[key] === undefined) {
      delete request[key];
    }
  }
  return request;
}

/**
 * Build the query controls from a search request.
 * @param r The request.
 * @param defaults The controls providing defaults for the properties not
 * set in the request (e.g. the page size).
 * @returns The controls.
 */
export function pleiadesRequestToQuery(
  r: PleiadesSearchRequest,
  defaults: PleiadesQueryControls = createPleiadesQueryControls(),
): PleiadesQueryControls {
  const hasPoint = isSet(r.distanceLon) && isSet(r.distanceLat);
  const hasBBox =
    isSet(r.swCornerLon) &&
    isSet(r.swCornerLat) &&
    isSet(r.neCornerLon) &&
    isSet(r.neCornerLat);
  const hasRegion = (r.region?.length ?? 0) >= 3;
  const toKm = (m: number | undefined) => (m ? m / 1000 : null);

  return {
    ...defaults,
    text: r.text || '',
    matchAny: !!r.matchAny,
    scopes: r.scopes ? [...r.scopes] : [...defaults.scopes],
    placeTypes: (r.placeTypes || [])
      .map((t) => getUriLastSegment(t.trim()))
      .filter((t) => t),
    rankMin: r.rankMin || null,
    rankMax: r.rankMax || null,
    yearMin: r.yearMin || null,
    yearMax: r.yearMax || null,
    sort: r.sort === 'distance' && hasPoint ? 'distance' : 'title',
    spatialMode: hasPoint
      ? 'range'
      : hasBBox
        ? 'bbox'
        : hasRegion
          ? 'polygon'
          : 'none',
    pointLat: hasPoint ? r.distanceLat! : null,
    pointLng: hasPoint ? r.distanceLon! : null,
    distanceMin: toKm(r.distanceMin),
    distanceMax: toKm(r.distanceMax),
    swLat: hasBBox ? r.swCornerLat! : null,
    swLng: hasBBox ? r.swCornerLon! : null,
    neLat: hasBBox ? r.neCornerLat! : null,
    neLng: hasBBox ? r.neCornerLon! : null,
    containedInBox: !!r.containedInBox,
    region: hasRegion ? r.region!.map((v) => [...v] as PleiadesLngLat) : [],
    containedInRegion: !!r.containedInRegion,
    pageSize: r.pageSize || defaults.pageSize,
  };
}

/**
 * Check whether a range has its minimum greater than its maximum, both
 * being set (0 and null mean not set).
 * @param min The minimum.
 * @param max The maximum.
 * @returns True if both are set and min is greater than max.
 */
export function isInvertedRange(
  min: number | null | undefined,
  max: number | null | undefined,
): boolean {
  return !!nonZero(min) && !!nonZero(max) && min! > max!;
}
