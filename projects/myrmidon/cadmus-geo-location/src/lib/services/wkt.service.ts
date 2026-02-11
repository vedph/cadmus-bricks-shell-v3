import { Injectable } from '@angular/core';
import { wktToGeoJSON, geojsonToWKT } from '@terraformer/wkt';

import { GeoLocationGeometryFormat } from '../models';

@Injectable({ providedIn: 'root' })
export class WktService {
  /**
   * Convert a geometry string to a GeoJSON Geometry object.
   * Returns null if the input is empty or conversion fails.
   * @param geometry The geometry string (WKT or GeoJSON).
   * @param format The format of the geometry string.
   * @returns The GeoJSON Geometry object, or null.
   */
  public toGeoJSON(
    geometry: string | undefined | null,
    format: GeoLocationGeometryFormat,
  ): GeoJSON.Geometry | null {
    if (!geometry?.trim()) {
      return null;
    }
    try {
      if (format === GeoLocationGeometryFormat.GeoJSON) {
        return JSON.parse(geometry) as GeoJSON.Geometry;
      }
      return wktToGeoJSON(geometry) as GeoJSON.Geometry;
    } catch {
      return null;
    }
  }

  /**
   * Convert a GeoJSON Geometry object to a geometry string.
   * @param geojson The GeoJSON Geometry object.
   * @param format The desired output format.
   * @returns The geometry string.
   */
  public fromGeoJSON(
    geojson: GeoJSON.Geometry,
    format: GeoLocationGeometryFormat,
  ): string {
    if (format === GeoLocationGeometryFormat.GeoJSON) {
      return JSON.stringify(geojson, null, 2);
    }
    return geojsonToWKT(geojson as any);
  }
}
