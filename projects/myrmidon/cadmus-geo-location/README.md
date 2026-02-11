# CadmusGeoLocation

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.0.

> ⚠️ This library requires [ngx-maplibre-gl](https://github.com/maplibre/ngx-maplibre-gl) and you can install it with `npm install @maplibre/ngx-maplibre-gl maplibre-gl` (the library already provides its type definitions). Its API is documented at <https://maplibre.org/ngx-maplibre-gl/API/>.

A `GeoLocation` is an essential model for a simple geographic location. It always has a single point with a display label, latitude, longitude, and optionally altitude, representing the location itself or just its canonical or approximated position. Optionally it adds a free text note, and an uncertainty radius whose center is the point, and a geometry representing its area in a more complex way. The geometry is just a string, usually with WKT format.

Example:

```json
{
  "eid": "place-123",
  "label": "Ancient Settlement X",
  "latitude": 41.8902,
  "longitude": 12.4922,
  "altitude": 35.0,
  "geometry": "POLYGON((12.48 41.89, 12.49 41.89, 12.49 41.90, 12.48 41.90, 12.48 41.89))"
}
```

## GeoLocationEditor

Editor for a single geographic location. It features an interactive map for visualizing and drawing
 geometries.

- 🔑 `GeoLocationEditor`
- 🚩 `cadmus-geo-location-editor`
- ▶️ input:
  - `location` (`GeoLocation`?)
  - `geometryFormat` (`GeoLocationGeometryFormat`): the format to use for the `geometry` field. Default is WKT (Well-Known Text), because it is an OGC standard, simple, compact and human-readable, and also fits in data mostly serialized into JSON because it's an implementation-neutral string. Alternatively you can use GeoJSON.
  - `noLocateButton` (`boolean`): true to hide the locate button.
  - `mapStyle` (`string`): the map style URL, defaulting to <https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json>.
- 🔥 output:
  - `locationChange`: emitted when location is saved.
  - `cancelEdit`: emitted when user cancels the edit.
