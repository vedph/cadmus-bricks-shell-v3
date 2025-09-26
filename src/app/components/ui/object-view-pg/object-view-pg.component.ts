import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { ObjectViewComponent } from '@myrmidon/cadmus-ui-object-view';

@Component({
  selector: 'app-object-view-pg',
  imports: [MatCardModule, ObjectViewComponent, JsonPipe],
  templateUrl: './object-view-pg.component.html',
  styleUrls: ['./object-view-pg.component.scss'],
})
export class ObjectViewPgComponent {
  public readonly data = signal<any>({
    names: [
      {
        first: 'John',
        last: 'Doe',
      },
      {
        first: 'JD',
        type: 'alias',
      },
    ],
    sex: 'male',
    'birth-date': '2020/01/01',
    inventory: [
      {
        type: 'weapon',
        size: {
          width: 4,
          height: 22,
        },
      },
    ],
  });

  public readonly value = signal<any>(undefined);

  public onValuePick(event: any): void {
    this.value.set(event);
  }
}
