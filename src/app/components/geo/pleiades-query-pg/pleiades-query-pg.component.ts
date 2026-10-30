import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  PleiadesQueryComponent,
  PleiadesSearchRequest,
  PleiadesSearchResult,
} from '@myrmidon/cadmus-refs-pleiades-lookup';

@Component({
  selector: 'app-pleiades-query-pg',
  imports: [
    JsonPipe,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatTooltipModule,
    PleiadesQueryComponent,
  ],
  templateUrl: './pleiades-query-pg.component.html',
  styleUrl: './pleiades-query-pg.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PleiadesQueryPgComponent {
  public readonly hidePick = signal(false);
  public readonly picked = signal<PleiadesSearchResult | undefined>(undefined);
  public readonly showPicked = signal(false);
  public readonly request = signal<PleiadesSearchRequest | undefined>(
    undefined,
  );

  /**
   * Load a sample request into the query, from the API documentation:
   * settlements or forts within 20 km from Athens, nearest first.
   */
  public loadSample(): void {
    this.request.set({
      placeTypes: ['settlement', 'fort'],
      distanceLon: 23.72,
      distanceLat: 37.97,
      distanceMax: 20000,
      sort: 'distance',
    });
  }

  public onPlacePick(place: PleiadesSearchResult): void {
    this.picked.set(place);
  }
}
