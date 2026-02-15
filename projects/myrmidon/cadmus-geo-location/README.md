# CadmusGeoLocation

Cadmus geographical location editor brick, built with Angular and [MapLibre GL JS](https://maplibre.org/) via [ngx-maplibre-gl](https://github.com/maplibre/ngx-maplibre-gl).

## Setup

### 1. Install Peer Dependencies

The library requires MapLibre GL and its Angular wrapper, plus a WKT parser and GeoJSON types:

```bash
npm install @maplibre/ngx-maplibre-gl maplibre-gl @terraformer/wkt @types/geojson
```

> The library also uses `@myrmidon/ngx-mat-tools` for its `DialogService` (confirmation dialogs). If you don't already have it:

```bash
npm install @myrmidon/ngx-mat-tools
```

### 2. Import MapLibre CSS

The MapLibre GL stylesheet **must** be imported globally. Without it, the map will render with broken layout and missing controls.

**Option A** (suggested) -- in your global `styles.scss` (or `styles.css`):

```scss
@import "maplibre-gl/dist/maplibre-gl.css";
```

**Option B** -- in `angular.json`, under `projects > your-app > architect > build > options > styles`:

```json
"styles": [
  "node_modules/maplibre-gl/dist/maplibre-gl.css",
  "src/styles.scss"
]
```

### 3. CommonJS Warning (Optional)

MapLibre GL is distributed as CommonJS. Angular CLI will emit a warning during build:

> Module 'maplibre-gl' is not ESM

This is harmless. To silence it, add to `angular.json` under `build > options`:

```json
"allowedCommonJsDependencies": ["maplibre-gl"]
```

## Model

A `GeoLocation` represents a simple geographic location:

```ts
interface GeoLocation {
  eid?: string; // optional entity ID
  label: string; // display label (required)
  latitude: number; // decimal degrees, -90 to 90 (required)
  longitude: number; // decimal degrees, -180 to 180 (required)
  altitude?: number; // meters
  radius?: number; // uncertainty radius in meters
  geometry?: string; // area geometry (WKT or GeoJSON string)
  note?: string; // free text note
}
```

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

Interactive editor for a single `GeoLocation`. It shows a form for all properties side by side with a MapLibre map. The map displays the marker, geometry overlay, radius circle, and label. Users can draw geometries (point, circle, rectangle, polygon) directly on the map.

### Component Reference

- ▶️ input:
- 🔑 **class**: `GeoLocationEditor`
- 🚩 **selector**: `cadmus-geo-location-editor`
- ▶️ **inputs**:
  - `location` (`GeoLocation?`): the location to edit (two-way bindable via `model`).
  - `geometryFormat` (`GeoLocationGeometryFormat`): format for the `geometry` field. Default is WKT (Well-Known Text), because it is an OGC standard, simple, compact and human-readable, and also fits in data mostly serialized into JSON because it's an implementation-neutral string. Alternatively you can use GeoJSON. Alternatively use `GeoJSON`.
  - `noLocateButton` (`boolean`): set to `true` to hide the browser geolocation button.
  - `mapStyle` (`string`): map tile style URL. Defaults to `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json`.
- 🔥 **outputs**:
  - `locationChange`: emitted when the user saves the location.
  - `cancelEdit`: emitted when the user cancels.

### Usage Example

```ts
import { Component } from "@angular/core";
import { GeoLocation, GeoLocationEditor } from "@myrmidon/cadmus-geo-location";

@Component({
  selector: "app-my-page",
  imports: [GeoLocationEditor],
  template: ` <cadmus-geo-location-editor [location]="location" (locationChange)="onLocationChange($event)" (cancelEdit)="onCancel()" /> `,
})
export class MyPageComponent {
  public location: GeoLocation = {
    label: "Rome",
    latitude: 41.9028,
    longitude: 12.4964,
  };

  public onLocationChange(location: GeoLocation): void {
    this.location = location;
  }

  public onCancel(): void {
    // handle cancel
  }
}
```

### Map Toolbar

The map toolbar (above the map) provides:

| Button         | Icon                  | Description                                                                                   |
| -------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| Recenter       | `center_focus_strong` | Re-centers the map on the current point.                                                      |
| Centroid       | `filter_center_focus` | Sets lat/lng from the centroid of the current geometry (enabled only when a geometry exists). |
| Draw toggle    | `edit` / `edit_off`   | Enters or exits drawing mode. When exiting, any drawn geometry is committed to the form.      |
| Point tool     | `place`               | (drawing mode) Click the map to place/move the point.                                         |
| Circle tool    | `circle`              | (drawing mode) Click center, then click to set radius.                                        |
| Rectangle tool | `crop_square`         | (drawing mode) Click two opposite corners.                                                    |
| Polygon tool   | `pentagon`            | (drawing mode) Click vertices, double-click to finish.                                        |
| Clear          | `delete_outline`      | (drawing mode) Clears the point, geometry, radius, and all overlays so you can start fresh.   |

### Browser Geolocation

The locate button (`my_location`) uses the browser Geolocation API with high-accuracy mode. After a successful fix, an accuracy indicator icon appears next to the button with a color-coded tooltip:

| Accuracy   | Icon                        | Color       | Likely Source |
| ---------- | --------------------------- | ----------- | ------------- |
| < 20 m     | `gps_fixed`                 | green       | GPS           |
| 20-100 m   | `signal_cellular_alt_1_bar` | light green | Wi-Fi         |
| 100-1000 m | `signal_cellular_alt_2_bar` | orange      | Cell tower    |
| > 1000 m   | `signal_cellular_alt`       | red         | IP-based      |

### Two-Way Map Sync

The form and map stay in sync in both directions:

- **Form to map**: editing latitude, longitude, or geometry in the form updates the map (marker position, geometry overlay, radius circle, label) in real-time after a 400 ms debounce.
- **Map to form**: drawing on the map or dragging the marker updates the form controls. Drawn geometries are committed to the form when exiting drawing mode.

## Exported Utilities

The library also exports standalone helper functions and services:

### WktService

Injectable service for converting between geometry strings and GeoJSON:

- `toGeoJSON(geometry, format)`: parses a WKT or GeoJSON string into a `GeoJSON.Geometry` object.
- `fromGeoJSON(geojson, format)`: serializes a `GeoJSON.Geometry` to WKT or GeoJSON string.

### geo-helper Functions

Pure functions for geometric calculations:

- `createCirclePolygon(center, radiusMeters, steps?)`: generates a GeoJSON Polygon approximating a circle.
- `createRectanglePolygon(corner1, corner2)`: generates a GeoJSON Polygon for a rectangle.
- `haversineDistance(p1, p2)`: calculates the distance in meters between two `[lng, lat]` points.
- `computeCentroid(geometry)`: computes the `[lng, lat]` centroid of any GeoJSON Geometry.

## History

### 0.0.3

- 2026-02-15: fix to race condition. In @maplibre/ngx-maplibre-gl v21, both MarkerComponent and PopupComponent use afterNextRender() to initialize. When both are created in the same render cycle and the popup tries to attach to the marker via [marker], it reads marker.markerInstance() which can still be null if the marker's afterNextRender hasn't set it yet. This timing is environment-dependent, which explains why it works here, but fails in other workspaces (where the component nesting is deeper).

### 0.0.2

- 2026-02-12: changed DEFAULT_MAP_STYLE from CARTO Voyager to OpenFreeMap Liberty. OpenFreeMap returns 200 OK with CORS headers even for empty tiles (instead of CARTO's 404 without CORS headers), and requires no API key. In template, added 'text-font': ['Noto Sans Regular'] to the label-text layer layout. Without this, MapLibre defaults to "Open Sans Regular,Arial Unicode MS Regular" which only CARTO's font server has. Noto Sans Regular is what the OpenFreeMap Liberty style uses and serves.

### 0.0.1

- 2026-02-11: initial release.
