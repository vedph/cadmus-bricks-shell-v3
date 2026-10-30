import {
  PLEIADES_PLACE_URI_PREFIX,
  PleiadesLngLat,
  PleiadesSearchRequest,
  PleiadesSearchResult,
} from '../models';

/**
 * The text operators recognized by the Pleiades search, longest first.
 */
const TEXT_OPERATORS = ['<>', '*=', '^=', '$=', '?=', '~=', '%=', '='];

/**
 * Get the last segment of a URI (e.g. `settlement` from
 * `https://pleiades.stoa.org/vocabularies/place-types/settlement`).
 * @param uri The URI.
 * @returns The last non-empty segment, or the URI itself if it has none.
 */
export function getUriLastSegment(uri: string | null | undefined): string {
  if (!uri) {
    return '';
  }
  const segments = uri.split('/').filter((s) => s);
  return segments.length ? segments[segments.length - 1] : uri;
}

/**
 * Normalize a place type for the search request: full URIs and
 * `/`-prefixed short names are kept as they are, while bare short names
 * get a `/` prefix.
 * @param type The place type.
 * @returns The normalized type, or an empty string if empty.
 */
export function normalizePlaceType(type: string): string {
  const t = type.trim();
  if (!t) {
    return '';
  }
  return t.startsWith('/') || t.includes('://') ? t : '/' + t;
}

/**
 * True if the token starts with a Pleiades text operator.
 */
function hasTextOperator(token: string): boolean {
  return TEXT_OPERATORS.some((op) => token.startsWith(op));
}

/**
 * Build the text for a type-ahead search: the last word typed, unless it
 * already has an operator, gets the "starts with" operator (`^=`), so that
 * e.g. `via app` becomes `via ^=app`.
 * @param text The text typed by the user.
 * @returns The search text, or an empty string.
 */
export function buildTypeAheadText(text: string | null | undefined): string {
  const tokens = (text || '').split(/\s+/).filter((t) => t);
  if (!tokens.length) {
    return '';
  }
  const last = tokens[tokens.length - 1];
  if (!hasTextOperator(last)) {
    tokens[tokens.length - 1] = '^=' + last;
  }
  return tokens.join(' ');
}

/**
 * Build the query parameters for a Pleiades search request. Empty values,
 * false flags, and numeric filters equal to 0 (=not set) are omitted.
 * @param request The request.
 * @returns The parameters.
 */
export function buildSearchParams(
  request: PleiadesSearchRequest,
): Record<string, string> {
  const params: Record<string, string> = {};
  const setNumber = (name: string, value: number | undefined | null) => {
    if (value !== undefined && value !== null && value !== 0) {
      params[name] = value.toString();
    }
  };
  const setCoord = (name: string, value: number | undefined | null) => {
    if (value !== undefined && value !== null && !isNaN(value)) {
      params[name] = value.toString();
    }
  };

  if (request.text?.trim()) {
    params['text'] = request.text.trim();
  }
  if (request.matchAny) {
    params['matchAny'] = 'true';
  }
  if (request.scopes?.length) {
    params['scopes'] = request.scopes.join(',');
  }
  const types = (request.placeTypes || [])
    .map((t) => normalizePlaceType(t))
    .filter((t) => t);
  if (types.length) {
    params['placeType'] = types.join(',');
  }
  setNumber('rankMin', request.rankMin);
  setNumber('rankMax', request.rankMax);
  setNumber('yearMin', request.yearMin);
  setNumber('yearMax', request.yearMax);

  // distance
  setCoord('distanceLon', request.distanceLon);
  setCoord('distanceLat', request.distanceLat);
  setNumber('distanceMin', request.distanceMin);
  setNumber('distanceMax', request.distanceMax);

  // bounding box
  setCoord('swCornerLon', request.swCornerLon);
  setCoord('swCornerLat', request.swCornerLat);
  setCoord('neCornerLon', request.neCornerLon);
  setCoord('neCornerLat', request.neCornerLat);
  if (request.containedInBox) {
    params['containedInBox'] = 'true';
  }

  // region
  if (request.region && request.region.length >= 3) {
    params['region'] = formatPleiadesRegion(request.region);
    if (request.containedInRegion) {
      params['containedInRegion'] = 'true';
    }
  }

  if (request.sort && request.sort !== 'title') {
    params['sort'] = request.sort;
  }
  setNumber('pageNumber', request.pageNumber);
  setNumber('pageSize', request.pageSize);
  return params;
}

/**
 * Format the vertices of a region for the `region` search parameter, as
 * `lon,lat` pairs separated by semicolons, with coordinates rounded to 6
 * decimals.
 * @param region The vertices.
 * @returns The text.
 */
export function formatPleiadesRegion(region: PleiadesLngLat[]): string {
  const round = (n: number) => Math.round(n * 1e6) / 1e6;
  return region.map(([lng, lat]) => `${round(lng)},${round(lat)}`).join(';');
}

/**
 * Parse the text of a `region` search parameter.
 * @param text The text with semicolon-separated `lon,lat` pairs.
 * @returns The vertices, or undefined if the text is empty or invalid.
 */
export function parsePleiadesRegion(
  text: string | null | undefined,
): PleiadesLngLat[] | undefined {
  if (!text?.trim()) {
    return undefined;
  }
  const vertices: PleiadesLngLat[] = [];
  for (const pair of text.split(';').filter((p) => p.trim())) {
    const values = pair.split(',').map((v) => v.trim());
    const lng = Number(values[0]);
    const lat = Number(values[1]);
    if (values.length !== 2 || !values[0] || !values[1] || isNaN(lng) || isNaN(lat)) {
      return undefined;
    }
    vertices.push([lng, lat]);
  }
  return vertices;
}

/**
 * Get the URI of the Pleiades page of the specified place.
 * @param place The place, or just its ID.
 * @returns The URI.
 */
export function getPleiadesPlaceUri(
  place: Pick<PleiadesSearchResult, 'id' | 'uriPrefix'> | string,
): string {
  return typeof place === 'string'
    ? PLEIADES_PLACE_URI_PREFIX + place
    : (place.uriPrefix || PLEIADES_PLACE_URI_PREFIX) + place.id;
}

/**
 * Format a year, e.g. `300 BC` or `AD 300`.
 * @param year The year (negative for BC).
 * @returns The formatted year, or an empty string if undefined.
 */
export function formatPleiadesYear(year: number | null | undefined): string {
  if (year === null || year === undefined || year === 0) {
    return '';
  }
  return year < 0 ? `${-year} BC` : `AD ${year}`;
}

/**
 * Format a time span, e.g. `750 BC – AD 300`.
 * @param start The start year.
 * @param end The end year.
 * @returns The formatted span, or an empty string if both are undefined.
 */
export function formatPleiadesYearSpan(
  start: number | null | undefined,
  end: number | null | undefined,
): string {
  const s = formatPleiadesYear(start);
  const e = formatPleiadesYear(end);
  if (s && e) {
    return s === e ? s : `${s} – ${e}`;
  }
  return s || e;
}

/**
 * Format a distance in meters, as meters below 1 km, else as km.
 * @param meters The distance in meters.
 * @returns The formatted distance, or an empty string.
 */
export function formatPleiadesDistance(
  meters: number | null | undefined,
): string {
  if (meters === null || meters === undefined || isNaN(meters)) {
    return '';
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km < 100 ? km.toFixed(1) : Math.round(km)} km`;
}

/**
 * Get a user-facing message from an error got from the Pleiades API.
 * Validation errors (problem details) are listed with their parameter
 * names.
 * @param error The error, usually an HttpErrorResponse.
 * @returns The message.
 */
export function getPleiadesErrorMessage(error: unknown): string {
  if (!error) {
    return 'Unknown error';
  }
  if (typeof error === 'string') {
    return error;
  }
  const e = error as {
    status?: number;
    message?: string;
    error?: unknown;
  };
  if (e.status === 0) {
    return 'The Pleiades service cannot be reached';
  }
  const body = e.error as
    | {
        title?: string;
        detail?: string;
        error?: string;
        errors?: Record<string, string[]>;
      }
    | string
    | undefined
    | null;

  if (body && typeof body === 'object') {
    if (body.errors && Object.keys(body.errors).length) {
      // the same message may be repeated for several parameters
      const messages = new Map<string, string[]>();
      for (const [key, values] of Object.entries(body.errors)) {
        for (const value of values || []) {
          if (!messages.has(value)) {
            messages.set(value, []);
          }
          messages.get(value)!.push(key);
        }
      }
      return [...messages.entries()]
        .map(([message, keys]) => `${message} (${keys.join(', ')})`)
        .join('; ');
    }
    if (body.error) {
      return body.error;
    }
    if (body.detail || body.title) {
      return body.detail || body.title!;
    }
  }
  if (typeof body === 'string' && body) {
    return body;
  }
  if (e.status === 404) {
    return 'Not found';
  }
  return e.message || `Error ${e.status ?? ''}`.trim();
}
