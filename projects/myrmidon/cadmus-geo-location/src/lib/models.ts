/**
 * The format for geometries in a GeoLocation.
 */
export enum GeoLocationGeometryFormat {
  WKT = 'WKT',
  GeoJSON = 'GeoJSON',
}

/**
 * A geographical location.
 */
export interface GeoLocation {
  /** An optional entity ID to reference this location from other entities */
  eid?: string;
  /** A label for the location */
  label: string;
  /** The latitude of the location, in decimal degrees */
  latitude: number;
  /** The longitude of the location, in decimal degrees */
  longitude: number;
  /** The altitude of the location, in meters */
  altitude?: number;
  /** An optional uncertainty radius of the location, in meters */
  radius?: number;
  /** An optional geometry, usually in WKT format */
  geometry?: string;
  /** An optional note about the location */
  note?: string;
}
