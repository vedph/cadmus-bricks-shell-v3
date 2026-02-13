import { Injectable } from '@angular/core';
import {
  RefLookupFilter,
  RefLookupService,
} from '@myrmidon/cadmus-refs-lookup';

import { Observable, of } from 'rxjs';

import { DbpediaDoc, DbpediaOptions, DbpediaService } from './dbpedia.service';

@Injectable({
  providedIn: 'root',
})
export class DbpediaRefLookupService implements RefLookupService {
  public readonly id = 'dbpedia';
  private readonly _tagRegex = /<[^>]+>/g;

  constructor(private _dbpedia: DbpediaService) {}

  public lookup(
    filter: RefLookupFilter,
    options?: DbpediaOptions,
  ): Observable<DbpediaDoc[]> {
    if (!filter.text) {
      return of([]);
    }
    return this._dbpedia.lookup(filter.text, {
      ...options,
      limit: filter.limit,
    });
  }

  public getById(id: string): Observable<DbpediaDoc | undefined> {
    if (!id) {
      return of(undefined);
    }
    return this._dbpedia.getResource(id);
  }

  public getName(item: DbpediaDoc): string {
    return item?.label?.replace(this._tagRegex, '') || '';
  }
}
