import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { MatCardModule } from '@angular/material/card';

import {
  GeoLocation,
  GeoLocationEditor,
} from '@myrmidon/cadmus-geo-location';

@Component({
  selector: 'app-geo-location-editor-pg',
  templateUrl: './geo-location-editor-pg.component.html',
  styleUrls: ['./geo-location-editor-pg.component.css'],
  imports: [CommonModule, MatCardModule, GeoLocationEditor],
})
export class GeoLocationEditorPgComponent {
  public location: GeoLocation = {
    eid: 'place-123',
    label: 'Colosseum',
    latitude: 41.8902,
    longitude: 12.4922,
    altitude: 35,
    geometry:
      'POLYGON((12.491 41.889, 12.493 41.889, 12.493 41.891, 12.491 41.891, 12.491 41.889))',
    note: 'The Flavian Amphitheatre in Rome.',
  };

  public onLocationChange(location: GeoLocation | undefined): void {
    if (location) {
      this.location = location;
    }
  }
}
