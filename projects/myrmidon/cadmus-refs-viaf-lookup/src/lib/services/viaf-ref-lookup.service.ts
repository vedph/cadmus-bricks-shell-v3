import { Injectable } from '@angular/core';
import {
  RefLookupFilter,
  RefLookupService,
} from '@myrmidon/cadmus-refs-lookup';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { ViafService } from './viaf.service';

@Injectable({
  providedIn: 'root',
})
export class ViafRefLookupService implements RefLookupService {
  public readonly id = 'viaf';

  constructor(private _viaf: ViafService) {}

  public lookup(filter: RefLookupFilter, options?: any): Observable<any[]> {
    if (!filter.text) {
      return of([]);
    }
    return this._viaf.suggest(filter.text).pipe(
      map((r) => {
        return r.result;
      })
    );
  }

  public getById(id: string): Observable<any | undefined> {
    if (!id) {
      return of(undefined);
    }
    return this._viaf.getRecord(id);
  }

  public getName(item: any): string {
    // ID = item?.viafid
    return item?.displayForm;
  }
}
