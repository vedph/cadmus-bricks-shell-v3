import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  PleiadesConnection,
  PleiadesPlace,
  PleiadesSearchResult,
} from '../../models';
import {
  formatPleiadesYearSpan,
  getUriLastSegment,
} from '../../services/pleiades-helpers';
import { pleiadesPlaceToResult } from '../../services/pleiades-ref-lookup.service';

/**
 * The details of a Pleiades place: metadata, names, locations, and
 * connections with other places.
 */
@Component({
  selector: 'cadmus-pleiades-place-details',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './pleiades-place-details.html',
  styleUrl: './pleiades-place-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PleiadesPlaceDetailsComponent {
  /**
   * The place to show.
   */
  public readonly place = input<PleiadesPlace | undefined>();

  /**
   * True to hide the pick button.
   */
  public readonly hidePick = input<boolean>(false);

  /**
   * True to hide the show in map button.
   */
  public readonly hideLocate = input<boolean>(false);

  /**
   * Emitted when the user wants to see a connected place, with its ID.
   */
  public readonly placeRequest = output<string>();

  /**
   * Emitted when the user wants to see the place in a map.
   */
  public readonly locateRequest = output<PleiadesPlace>();

  /**
   * Emitted when the user picks the place, converted into a search result.
   */
  public readonly placePick = output<PleiadesSearchResult>();

  public readonly types = computed(
    () => this.place()?.types.map((t) => getUriLastSegment(t)) || [],
  );

  public readonly isLocated = computed(() => {
    const place = this.place();
    return !!place && place.lat !== null && place.lng !== null;
  });

  /**
   * True if the place has any connection.
   */
  public readonly hasConnections = computed(() => {
    const place = this.place();
    return (
      !!place &&
      (place.connections.length > 0 ||
        place.incomingConnections.length > 0 ||
        place.linkedPlaces.length > 0)
    );
  });

  public short(uri: string | null | undefined): string {
    return getUriLastSegment(uri);
  }

  public span(start: number | null, end: number | null): string {
    return formatPleiadesYearSpan(start, end);
  }

  public getConnectionLabel(connection: PleiadesConnection): string {
    return getUriLastSegment(connection.type).replace(/_/g, ' ');
  }

  public requestPlace(id: string, event?: Event): void {
    event?.preventDefault();
    this.placeRequest.emit(id);
  }

  public locate(): void {
    const place = this.place();
    if (place) {
      this.locateRequest.emit(place);
    }
  }

  public pick(): void {
    const place = this.place();
    if (place) {
      this.placePick.emit(pleiadesPlaceToResult(place));
    }
  }
}
