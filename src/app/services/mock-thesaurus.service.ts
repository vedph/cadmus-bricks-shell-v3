import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { ThesauriSet, Thesaurus } from '@myrmidon/cadmus-core';

@Injectable({
  providedIn: 'root',
})
export class MockThesaurusService {
  private _thesauri: Thesaurus[];

  constructor() {
    this._thesauri = [
      {
        id: 'model-types',
        entries: [
          {
            id: 'it.vedph.metadata',
            value: 'metadata',
          },
          {
            id: 'it.vedph.note',
            value: 'note',
          },
        ],
      },
      // tags for asserted composite IDs, mapped to lookup sources via
      // AssertedCompositeIdTagSettings.tagThesaurusMap in demo pages
      {
        id: 'asserted-id-tags-webcolor',
        entries: [
          { id: 'warm', value: 'warm color' },
          { id: 'cold', value: 'cold color' },
        ],
      },
      {
        id: 'asserted-id-tags-viaf',
        entries: [
          { id: 'person', value: 'person' },
          { id: 'corporate', value: 'corporate body' },
          { id: 'work', value: 'work' },
        ],
      },
      {
        id: 'asserted-id-tags-animals',
        entries: [
          { id: 'wild', value: 'wild animal' },
          { id: 'domestic', value: 'domestic animal' },
        ],
      },
    ];
  }

  /**
   * Gets the tags set with the specified ID.
   * @param id string The tag set ID.
   * @param emptyIfNotFound True to return an empty thesaurus when the requested
   * thesaurus ID is not found, rather than getting a 404.
   * @returns Tag set.
   */
  public getThesaurus(
    id: string,
    emptyIfNotFound = false
  ): Observable<Thesaurus> {
    const thesaurus = this._thesauri.find((t) => t.id === id);
    if (!thesaurus) {
      if (emptyIfNotFound) {
        return of({ id: id, entries: [] });
      } else {
        throw new Error(`Thesaurus '${id}' not found`);
      }
    } else {
      return of(thesaurus);
    }
  }

  public getThesauriSet(ids: string[]): Observable<ThesauriSet> {
    // get thesauri for each ID returning an object with the ID as key
    // and the thesaurus as value.
    const set: ThesauriSet = {};
    ids.forEach((id) => {
      const t = this._thesauri.find((t) => t.id === id);
      if (t) {
        set[id] = t;
      }
    });
    return of(set);
  }
}
