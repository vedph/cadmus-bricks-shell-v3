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
    eid: 'colosseum',
    label: 'Colosseum',
    latitude: 41.8902,
    longitude: 12.4922,
    altitude: 35,
    geometry:
      'POLYGON ((12.491389972878522 41.89072924955775, 12.491411430550755 41.89005835854766, 12.491937143518271 41.88969096286567, 12.492977840615708 41.889627067748904, 12.493439180566384 41.89008231906237, 12.493267519189743 41.890577501017475, 12.492495042992715 41.890920931408914, 12.491894228173777 41.890928918140276, 12.491894228173777 41.890928918140276, 12.491389972878522 41.89072924955775))',
    note: 'The Flavian Amphitheatre in Rome.',
  };

  public onLocationChange(location: GeoLocation | undefined): void {
    if (location) {
      this.location = location;
    }
  }
}
