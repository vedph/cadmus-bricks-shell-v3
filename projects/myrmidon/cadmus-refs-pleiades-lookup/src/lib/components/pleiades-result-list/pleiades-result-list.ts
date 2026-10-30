import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  untracked,
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PleiadesSearchResult } from '../../models';
import {
  formatPleiadesDistance,
  getPleiadesPlaceUri,
  getUriLastSegment,
} from '../../services/pleiades-helpers';

/**
 * A list of Pleiades search results, each in a collapsible panel with
 * buttons to fly to it in a map, show its details, open its Pleiades page,
 * and pick it.
 */
@Component({
  selector: 'cadmus-pleiades-result-list',
  imports: [MatButtonModule, MatExpansionModule, MatIconModule, MatTooltipModule],
  templateUrl: './pleiades-result-list.html',
  styleUrl: './pleiades-result-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PleiadesResultListComponent {
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The results to list.
   */
  public readonly results = input<PleiadesSearchResult[]>([]);

  /**
   * The ID of the selected result, whose panel is expanded.
   */
  public readonly selectedId = model<string | undefined>();

  /**
   * True to hide the pick button.
   */
  public readonly hidePick = input<boolean>(false);

  /**
   * True to hide the fly-to button, e.g. when there is no map.
   */
  public readonly hideFlyTo = input<boolean>(false);

  /**
   * Emitted when the user wants to see a place in the map.
   */
  public readonly flyToRequest = output<PleiadesSearchResult>();

  /**
   * Emitted when the user wants to see the details of a place.
   */
  public readonly detailsRequest = output<PleiadesSearchResult>();

  /**
   * Emitted when the user picks a place.
   */
  public readonly placePick = output<PleiadesSearchResult>();

  constructor() {
    // bring the selected result into view
    effect(() => {
      const id = this.selectedId();
      if (!id) {
        return;
      }
      untracked(() =>
        setTimeout(() => {
          const element = Array.from(
            this._host.nativeElement.querySelectorAll<HTMLElement>(
              '[data-place-id]',
            ),
          ).find((e) => e.dataset['placeId'] === id);
          element?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
        }),
      );
    });
  }

  public getTypes(result: PleiadesSearchResult): string[] {
    return result.types.map((t) => getUriLastSegment(t));
  }

  public getUri(result: PleiadesSearchResult): string {
    return getPleiadesPlaceUri(result);
  }

  public formatDistance(meters: number | null): string {
    return formatPleiadesDistance(meters);
  }

  public isLocated(result: PleiadesSearchResult): boolean {
    return result.lat !== null && result.lng !== null;
  }

  public onOpened(result: PleiadesSearchResult): void {
    this.selectedId.set(result.id);
  }

  public onClosed(result: PleiadesSearchResult): void {
    if (this.selectedId() === result.id) {
      this.selectedId.set(undefined);
    }
  }

  public flyTo(result: PleiadesSearchResult, event?: Event): void {
    event?.stopPropagation();
    this.selectedId.set(result.id);
    this.flyToRequest.emit(result);
  }

  public showDetails(result: PleiadesSearchResult, event?: Event): void {
    event?.stopPropagation();
    this.selectedId.set(result.id);
    this.detailsRequest.emit(result);
  }

  public pick(result: PleiadesSearchResult, event?: Event): void {
    event?.stopPropagation();
    this.placePick.emit(result);
  }

  public stop(event: Event): void {
    event.stopPropagation();
  }
}
