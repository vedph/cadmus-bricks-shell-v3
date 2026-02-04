import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

// myrmidon
import { DataPage } from '@myrmidon/ngx-tools';

// bricks
import {
  RefLookupFilter,
  RefLookupService,
} from '@myrmidon/cadmus-refs-lookup';

// cadmus
import { ItemService } from '@myrmidon/cadmus-api';
import { Item } from '@myrmidon/cadmus-core';

@Injectable({
  providedIn: 'root',
})
export class ItemRefLookupService implements RefLookupService {
  public readonly id = 'item';

  constructor(private _itemService: ItemService) {}

  public lookup(filter: RefLookupFilter, options?: any): Observable<Item[]> {
    return this._itemService
      .getItems(
        {
          title: filter.text,
        },
        1,
        filter.limit || 10
      )
      .pipe(map((page: DataPage<Item>) => page.items));
  }

  getName(item: Item): string {
    return item?.title;
  }
}
