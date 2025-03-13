import { Component, computed, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';

import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import {
  Flag,
  FlagSetBadgeComponent,
  FlagSetComponent,
} from '../../../../../projects/myrmidon/cadmus-ui-flag-set/src/public-api';

const COLORS = [
  { id: 'r', label: 'red', color: 'red' },
  { id: 'g', label: 'green', color: 'green' },
  { id: 'b', label: 'blue', color: 'blue' },
  { id: 'y', label: 'yellow', color: 'yellow' },
  { id: 'o', label: 'orange', color: 'orange', blackIds: ['r', 'y'] },
  { id: 'p', label: 'purple', color: 'purple' },
  { id: 'br', label: 'brown', color: 'brown' },
  { id: 'bl', label: 'black', color: 'black' },
  { id: 'w', label: 'white', color: 'white' },
  { id: 'gr', label: 'gray', color: 'gray' },
  { id: 'pk', label: 'pink', color: 'pink' },
  { id: 'cy', label: 'cyan', color: 'cyan' },
  { id: 'mg', label: 'magenta', color: 'magenta' },
  { id: 'lm', label: 'lime', color: 'lime' },
  { id: 'iv', label: 'ivory', color: 'ivory' },
  { id: 'tn', label: 'tan', color: 'tan' },
  { id: 'lv', label: 'lavender', color: 'lavender' },
  { id: 'cr', label: 'coral', color: 'coral' },
  { id: 'aq', label: 'aqua', color: 'aqua' },
  { id: 'te', label: 'teal', color: 'teal' },
];

const TOPPINGS = [
  { id: 'pep', label: 'Pepperoni' },
  { id: 'saus', label: 'Sausage' },
  { id: 'mush', label: 'Mushrooms' },
  { id: 'on', label: 'Onions' },
  { id: 'ol', label: 'Olives' },
  { id: 'gp', label: 'Green Peppers' },
  { id: 'bac', label: 'Bacon' },
  { id: 'ham', label: 'Ham' },
  { id: 'pin', label: 'Pineapple' },
  { id: 'jal', label: 'Jalapenos' },
  { id: 'tom', label: 'Tomatoes' },
  { id: 'sp', label: 'Spinach' },
  { id: 'ch', label: 'Chicken' },
  { id: 'anch', label: 'Anchovies' },
  { id: 'bbq', label: 'BBQ Sauce' },
  { id: 'alf', label: 'Alfredo Sauce' },
];

@Component({
  selector: 'app-flag-set-pg',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    FlagSetComponent,
    FlagSetBadgeComponent,
    JsonPipe,
  ],
  templateUrl: './flag-set-pg.component.html',
  styleUrl: './flag-set-pg.component.scss',
})
export class FlagSetPgComponent {
  public flags: Flag[] = COLORS;

  public readonly checkedIds = signal<string[]>(['r', 'g', 'cr']);

  public readonly checkedFlags = computed<Flag[]>(() => {
    return this.flags.filter((f) => this.checkedIds().includes(f.id));
  });

  public numbering: FormControl<boolean> = new FormControl(true, {
    nonNullable: true,
  });
  public initials: FormControl<boolean> = new FormControl(true, {
    nonNullable: true,
  });

  public onCheckedIdsChange(ids: string[]): void {
    this.checkedIds.set(ids);
  }

  public readonly userIds: FormControl<string | null> = new FormControl(
    this.checkedIds().join(' ')
  );
  public readonly form: FormGroup = new FormGroup({
    userIds: this.userIds,
  });

  public setUserIds(): void {
    if (this.userIds.value) {
      this.checkedIds.set(this.userIds.value.split(' '));
    }
  }

  public toggleFlags(): void {
    this.checkedIds.set([]);
    this.flags = this.flags === COLORS ? TOPPINGS : COLORS;
  }
}
