
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { Component, effect, input, OnDestroy, output } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  Subscription,
} from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ColorToContrastPipe } from '@myrmidon/ngx-tools';

/**
 * A flag used in FlagSetComponent.
 */
export interface Flag {
  id: string;
  label: string;
  custom?: boolean;
  blackIds?: string[];
  color?: string;
}

interface FlagViewModel extends Flag {
  checked?: boolean;
}

/**
 * A set of checkable flags, with optional custom flags.
 */
@Component({
  selector: 'cadmus-ui-flag-set',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    ColorToContrastPipe
],
  templateUrl: './flag-set.component.html',
  styleUrl: './flag-set.component.css',
})
export class FlagSetComponent implements OnDestroy {
  private readonly _sub?: Subscription;
  private readonly _flags$ = new BehaviorSubject<Flag[]>([]);
  private readonly _ids$ = new BehaviorSubject<string[]>([]);

  /**
   * The flags set to use.
   */
  public readonly flags = input<Flag[]>([]);

  /**
   * The IDs of the flags that are checked.
   */
  public readonly checkedIds = input<string[]>([]);

  /**
   * True to allow custom-defined flags.
   */
  public readonly allowCustom = input<boolean>();

  /**
   * True to hide the toolbar.
   */
  public readonly hideToolbar = input<boolean>();

  /**
   * True to number each flag in the displayed list.
   */
  public readonly numbering = input<boolean>();

  /**
   * Emitted when the checked flags IDs change.
   */
  public readonly checkedIdsChange = output<string[]>();

  public userFlags: FlagViewModel[] = [];
  public customFlag: FormControl<string | null>;
  public customForm: FormGroup;

  constructor(formBuilder: FormBuilder) {
    this.customFlag = formBuilder.control(null);
    this.customForm = formBuilder.group({
      customFlag: this.customFlag,
    });

    // whenever flags or checked IDs streams change, update user flags
    this._sub = combineLatest({
      flags: this._flags$,
      ids: this._ids$,
    })
      .pipe(distinctUntilChanged(), debounceTime(300))
      .subscribe((combined) => {
        this.update(combined.flags, combined.ids);
      });

    // when input flags change, update stream
    effect(() => {
      this._flags$.next(this.flags());
    });
    // when input checked ids change, update stream
    effect(() => {
      this._ids$.next(this.checkedIds());
    });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private update(flags: FlagViewModel[], checkedIds: string[]): void {
    // create user flags from input flags and checked IDs
    const assignedIds = new Set<string>();
    this.userFlags = [...flags];
    flags.forEach((f) => {
      f.checked = checkedIds.includes(f.id);
      assignedIds.add(f.id);
    });

    // for each non assigned ID, create a new custom flag
    checkedIds.forEach((id) => {
      if (!assignedIds.has(id)) {
        this.userFlags.push({
          id,
          label: id,
          custom: true,
          checked: true,
        });
      }
    });
  }

  public addCustomFlag(): void {
    if (this.customForm.invalid) {
      return;
    }

    // trim the ID
    const id = this.customFlag.value?.trim();
    if (!id) {
      return;
    }

    // do not add if the ID already exists
    if (this.userFlags.some((f) => f.id === id)) {
      return;
    }

    // add the custom flag
    let flag: FlagViewModel = {
      id: id,
      label: id,
      custom: true,
      checked: true,
    };
    this._ids$.next([...this._ids$.value, flag.id]);
    this.checkedIdsChange.emit(this._ids$.value);

    this.customFlag.reset();
  }

  public onFlagChecked(flag: FlagViewModel, checked: boolean): void {
    flag.checked = checked;

    let ids = [...this._ids$.value];
    if (flag.checked) {
      ids.push(flag.id);
      // if flag has blacks, remove them
      if (flag.blackIds?.length) {
        ids = ids.filter((id) => !flag.blackIds!.includes(id));
      }
    } else {
      ids = ids.filter((id) => id !== flag.id);
    }
    this._ids$.next(ids);
    this.checkedIdsChange.emit(this._ids$.value);
  }

  public uncheckAll(): void {
    this._ids$.next([]);
    this.checkedIdsChange.emit(this._ids$.value);
  }

  public checkAll(): void {
    this._ids$.next(this._flags$.value.map((f) => f.id));
    this.checkedIdsChange.emit(this._ids$.value);
  }

  public toggleAll(): void {
    const ids: string[] = [];
    this.userFlags.forEach((f) => {
      if (f.checked) {
        f.checked = false;
      } else {
        f.checked = true;
        ids.push(f.id);
      }
    });
    this._ids$.next(ids);
    this.checkedIdsChange.emit(this._ids$.value);
  }
}
