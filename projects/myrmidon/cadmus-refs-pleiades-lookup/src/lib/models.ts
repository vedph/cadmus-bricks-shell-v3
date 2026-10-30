import type { Geometry } from 'geojson';

/**
 * The prefix of the URIs of Pleiades place pages.
 */
export const PLEIADES_PLACE_URI_PREFIX = 'https://pleiades.stoa.org/places/';

/**
 * The prefix of the URIs of the Pleiades place types vocabulary.
 */
export const PLEIADES_PLACE_TYPE_PREFIX =
  'https://pleiades.stoa.org/vocabularies/place-types/';

/**
 * A page of data returned by the Pleiades API.
 */
export interface PleiadesDataPage<T> {
  /** The page number (1-N). */
  pageNumber: number;
  /** The page size (0 when all the items were requested). */
  pageSize: number;
  /** The total count of the items matching the request. */
  total: number;
  /** The total count of pages. */
  pageCount: number;
  /** The items in this page. */
  items: T[];
}

/**
 * An entry of the Pleiades lookup table, used for closed sets of values
 * like vocabulary URIs (e.g. place types) or review states.
 */
export interface PleiadesLookupEntry {
  /** The internal ID. */
  id: number;
  /** The full name, usually a URI. */
  fullName: string;
  /** The short, human-friendly name, when available. */
  shortName: string | null;
  /** The group, for non-URI values. */
  group: string | null;
}

/**
 * Filter for Pleiades lookup entries (`api/lookup`).
 */
export interface PleiadesLookupFilter {
  /** The prefix of the full name (e.g. a vocabulary URI). */
  prefix?: string;
  /** Any part of the short name. */
  shortName?: string;
  /** The exact group. */
  group?: string;
  /** The page number (default 1). */
  pageNumber?: number;
  /** The page size (0-100, 0=all the matching entries). */
  pageSize?: number;
}

/**
 * The scope of a Pleiades text search, i.e. the field to search in.
 */
export type PleiadesSearchScope =
  | 'plttl'
  | 'pldsc'
  | 'pldtl'
  | 'lcttl'
  | 'nmrmz'
  | 'nmatt'
  | 'nmdsc';

/**
 * Metadata about a Pleiades search scope.
 */
export interface PleiadesSearchScopeInfo {
  /** The scope ID. */
  id: PleiadesSearchScope;
  /** A human-friendly label. */
  label: string;
  /** True if the field has years, so that year filters apply to it. */
  hasYears: boolean;
}

/**
 * All the Pleiades search scopes.
 */
export const PLEIADES_SEARCH_SCOPES: readonly PleiadesSearchScopeInfo[] = [
  { id: 'plttl', label: 'place title', hasYears: false },
  { id: 'pldsc', label: 'place description', hasYears: false },
  { id: 'pldtl', label: 'place details', hasYears: false },
  { id: 'lcttl', label: 'location title', hasYears: true },
  { id: 'nmrmz', label: 'name (romanized)', hasYears: true },
  { id: 'nmatt', label: 'name (attested)', hasYears: true },
  { id: 'nmdsc', label: 'name description', hasYears: true },
];

/**
 * The scopes best suited to a toponym search.
 */
export const PLEIADES_TOPONYM_SCOPES: readonly PleiadesSearchScope[] = [
  'plttl',
  'nmrmz',
  'nmatt',
];

/**
 * The sort order of Pleiades search results.
 */
export type PleiadesSearchSort = 'title' | 'distance';

/**
 * A Pleiades quick search request (`api/qsearch`). All the filters are
 * optional and combined in AND. Numeric filters equal to 0 are not set.
 * Coordinates are WGS84 decimal degrees, distances are in meters, and
 * years are negative for BC.
 */
export interface PleiadesSearchRequest {
  /** The text to search (see the Pleiades API text syntax). */
  text?: string;
  /** True to match any of the text tokens (OR) rather than all (AND). */
  matchAny?: boolean;
  /** The scopes to search the text in (default: all). */
  scopes?: PleiadesSearchScope[];
  /**
   * The place types to match (any of them): each is either a full URI or
   * `/` followed by its last segment (e.g. `/settlement`). A bare short name
   * (e.g. `settlement`) is accepted too, and sent prefixed by `/`.
   */
  placeTypes?: string[];
  /** The minimum rank of the matching text occurrences (1-100). */
  rankMin?: number;
  /** The maximum rank of the matching text occurrences (1-100). */
  rankMax?: number;
  /** The minimum year. */
  yearMin?: number;
  /** The maximum year. */
  yearMax?: number;
  /** The longitude of the distance point. */
  distanceLon?: number;
  /** The latitude of the distance point. */
  distanceLat?: number;
  /** The minimum distance in meters from the distance point. */
  distanceMin?: number;
  /** The maximum distance in meters from the distance point. */
  distanceMax?: number;
  /**
   * The longitude of the bounding box SW corner. It is greater than the
   * NE corner longitude when the box crosses the antimeridian.
   */
  swCornerLon?: number;
  /** The latitude of the bounding box SW corner. */
  swCornerLat?: number;
  /** The longitude of the bounding box NE corner. */
  neCornerLon?: number;
  /** The latitude of the bounding box NE corner. */
  neCornerLat?: number;
  /** True if places must be fully contained in the box. */
  containedInBox?: boolean;
  /**
   * The vertices of a polygonal region (3-200, without closing vertex).
   * Longitudes may exceed 180 (or -180), up to 540, so that a polygon
   * crossing the antimeridian has continuous coordinates.
   */
  region?: PleiadesLngLat[];
  /** True if places must be fully contained in the region. */
  containedInRegion?: boolean;
  /** The sort order (default title). */
  sort?: PleiadesSearchSort;
  /** The page number (default 1). */
  pageNumber?: number;
  /** The page size (1-100, default 20). */
  pageSize?: number;
}

/**
 * The filters of a Pleiades search request, i.e. all its properties
 * except the text and paging.
 */
export type PleiadesSearchFilters = Omit<
  PleiadesSearchRequest,
  'text' | 'matchAny' | 'pageNumber' | 'pageSize'
>;

/**
 * A Pleiades search result, i.e. a place matching a search.
 */
export interface PleiadesSearchResult {
  /** The Pleiades place ID. */
  id: string;
  /** The prefix to prepend to the ID to get the Pleiades page URI. */
  uriPrefix: string;
  /** The place title. */
  name: string;
  /** The first place type URI, if any. */
  type: string | null;
  /** All the place type URIs. */
  types: string[];
  /** The latitude of the representative point, null when not located. */
  lat: number | null;
  /** The longitude of the representative point, null when not located. */
  lng: number | null;
  /** The distance in meters from the distance point, when available. */
  distance: number | null;
}

/**
 * A reference to a Pleiades place.
 */
export interface PleiadesPlaceRef {
  /** The place ID. */
  id: string;
  /** The place title. */
  title: string;
}

/**
 * A name of a Pleiades place.
 */
export interface PleiadesName {
  id: number;
  uri: string;
  /** The romanized form(s), comma-separated when more than one. */
  romanized: string;
  /** The attested form, in its original script. */
  attested: string | null;
  /** The language code (e.g. `grc`, `la`). */
  language: string | null;
  /** The name type (`geographic`, `ethnic`, ...). */
  type: string | null;
  /** The association certainty URI. */
  certainty: string | null;
  /** The transcription accuracy. */
  transcriptionAccuracy: string | null;
  /** The transcription completeness. */
  transcriptionCompleteness: string | null;
  startYear: number | null;
  endYear: number | null;
  description: string | null;
}

/**
 * A location of a Pleiades place.
 */
export interface PleiadesLocation {
  id: number;
  uri: string;
  title: string;
  /** The association certainty URI. */
  certainty: string | null;
  /** The accuracy assessment URI. */
  accuracy: string | null;
  /** The accuracy in meters. */
  accuracyValue: number;
  startYear: number | null;
  endYear: number | null;
  description: string | null;
  /** The GeoJSON geometry. */
  geometry: Geometry | null;
}

/**
 * A connection between two Pleiades places.
 */
export interface PleiadesConnection {
  id: number;
  /** The connected place (target for outgoing, source for incoming). */
  place: PleiadesPlaceRef;
  /** The relationship type URI. */
  type: string | null;
  /** The certainty (`certain`, `less-certain`, `uncertain`). */
  certainty: string | null;
  title: string | null;
  startYear: number | null;
  endYear: number | null;
}

/**
 * The details of a Pleiades place (`api/places/{id}`).
 */
export interface PleiadesPlace {
  id: string;
  uri: string;
  title: string;
  description: string | null;
  /** Longer details, as HTML. */
  details: string | null;
  provenance: string | null;
  rights: string | null;
  reviewState: string | null;
  created: string;
  modified: string;
  lat: number | null;
  lng: number | null;
  /** The bounding box as `[swLng, swLat, neLng, neLat]`. */
  bbox: [number, number, number, number] | null;
  /** The place type URIs. */
  types: string[];
  subjects: string[];
  names: PleiadesName[];
  locations: PleiadesLocation[];
  connections: PleiadesConnection[];
  incomingConnections: PleiadesConnection[];
  linkedPlaces: PleiadesPlaceRef[];
}

/**
 * Options for the nearby places request (`api/places/{id}/nearby`).
 */
export interface PleiadesNearbyOptions {
  /** The maximum distance in meters (0=any). */
  distance?: number;
  /** The maximum count of places (1-100, default 20). */
  limit?: number;
  /** The place types to match. */
  placeTypes?: string[];
}

/**
 * A point as `[lng, lat]`.
 */
export type PleiadesLngLat = [number, number];

/**
 * The maximum count of vertices of a region polygon.
 */
export const PLEIADES_MAX_REGION_VERTICES = 200;

/**
 * A bounding box defined by its SW and NE corners, each as `[lng, lat]`.
 * Longitudes are in the range -180 to 180: when the box crosses the
 * antimeridian, its SW longitude is greater than its NE longitude (as in
 * GeoJSON bounding boxes).
 */
export interface PleiadesBBox {
  sw: PleiadesLngLat;
  ne: PleiadesLngLat;
}

/**
 * The spatial filter mode of the Pleiades query: none, a range of
 * distances from a point, a bounding box, or a polygonal region.
 */
export type PleiadesSpatialMode = 'none' | 'range' | 'bbox' | 'polygon';
