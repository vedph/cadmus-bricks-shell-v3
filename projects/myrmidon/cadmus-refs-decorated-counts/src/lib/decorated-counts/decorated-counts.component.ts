import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  model,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { FlatLookupPipe } from '@myrmidon/ngx-tools';

/**
 * A count decorated with the ID of the entity being counted,
 * and optionally by a tag and/or note.
 */
export interface DecoratedCount {
  id: string;
  value: number;
  tag?: string;
  note?: string;
}

/**
 * Decorated counts editor component.
 */
@Component({
  selector: 'cadmus-refs-decorated-counts',
  templateUrl: './decorated-counts.component.html',
  styleUrls: ['./decorated-counts.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    FlatLookupPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DecoratedCountsComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;

  /**
   * The decorated counts.
   */
  public readonly counts = model<DecoratedCount[]>();

  /**
   * True to allow custom item IDs. This is meaningful
   * only when idEntries is specified; otherwise, all the
   * IDs are custom.
   */
  public readonly allowCustomId = input<boolean>(true);

  /**
   * True to allow distinct IDs only. When this is true,
   * you cannot add multiple counts with the same ID.
   */
  public readonly distinct = input<boolean>();

  // decorated-count-ids
  public readonly idEntries = input<ThesaurusEntry[]>();
  // decorated-count-tags
  public readonly tagEntries = input<ThesaurusEntry[]>();

  @ViewChild('cstn', { static: false })
  public customCtl?: ElementRef;
  @ViewChild('valn', { static: false })
  public valueCtl?: ElementRef;

  public id: FormControl<string | null>;
  public hasCustom: FormControl<boolean>;
  public custom: FormControl<string | null>;
  public batch: FormControl<string | null>;
  public form: FormGroup;

  public tag: FormControl<string | null>;
  public value: FormControl<number>;
  public note: FormControl<string | null>;
  public editedForm: FormGroup;

  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<DecoratedCount | undefined>(undefined);

  constructor(formBuilder: FormBuilder) {
    // add count form
    this.id = formBuilder.control(null);
    this.hasCustom = formBuilder.control(false, { nonNullable: true });
    this.custom = formBuilder.control(null);
    this.batch = formBuilder.control(null);
    this.form = formBuilder.group({
      id: this.id,
      hasCustom: this.hasCustom,
      custom: this.custom,
      batch: this.batch,
    });
    // edited count form
    this.tag = formBuilder.control(null);
    this.value = formBuilder.control(0, { nonNullable: true });
    this.note = formBuilder.control(null, Validators.maxLength(1000));
    this.editedForm = formBuilder.group({
      tag: this.tag,
      value: this.value,
      note: this.note,
    });
  }

  public ngOnInit(): void {
    this._sub = this.hasCustom.valueChanges.subscribe((value) => {
      if (value) {
        this.id.disable();
      } else {
        this.id.enable();
      }
      if (value && this.customCtl) {
        setTimeout(() => this.customCtl!.nativeElement.focus(), 0);
      }
    });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private areCountsEqual(a: DecoratedCount, b: DecoratedCount): boolean {
    return (
      a.id === b.id &&
      a.value === b.value &&
      a.tag === b.tag &&
      a.note === b.note
    );
  }

  public closeCount(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  private focusCount(): void {
    if (this.valueCtl) {
      setTimeout(() => this.valueCtl!.nativeElement.focus(), 0);
    }
  }

  public editCount(index: number): void {
    this.editedIndex.set(index);
    this.edited.set(this.counts()![index]);

    this.value.setValue(this.edited()!.value, { emitEvent: false });
    this.tag.setValue(this.edited()!.tag || null, { emitEvent: false });
    this.note.setValue(this.edited()!.note || null, { emitEvent: false });
    this.editedForm.markAsPristine();

    this.focusCount();
  }

  public addCustomCount(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!this.custom.value) {
      return;
    }

    this.editedIndex.set(-1);
    this.edited.set({
      id: this.custom.value,
      value: 0,
    } as DecoratedCount);
    this.editedForm.reset();

    this.custom.reset();
    this.focusCount();
  }

  public addCount(event?: Event): void {
    if (this.hasCustom.value) {
      this.addCustomCount(event);
      return;
    }
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!this.id.value) {
      return;
    }

    this.editedIndex.set(-1);
    this.edited.set({
      id: this.id.value,
      value: 0,
    } as DecoratedCount);
    this.editedForm.reset();

    if (!this.idEntries?.length) {
      this.id.reset();
    }
    this.focusCount();
  }

  public addBatchCounts(): void {
    // parse from batch.value with form "ID=value [tag] (note);..."
    const entries = this.batch.value
      ?.split(';')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    if (!entries?.length) {
      return;
    }

    const added: DecoratedCount[] = [];
    for (let i = 0; i < entries.length; i++) {
      const m = entries[i].match(
        /^([^\s=]+)=([^\s]+)\s*(\[[^\]]+\])?\s*(\([^\)]+\))?$/
      );
      if (m) {
        added.push({
          id: m[1],
          value: parseFloat(m[2]),
          tag: m[3]?.substring(1, m[3].length - 2),
          note: m[4]?.substring(1, m[4].length - 2),
        });
      }
    }

    if (added.length) {
      let counts = [...(this.counts() || [])];

      // if distinct, remove existing counts with the same ID
      if (this.distinct()) {
        const ids = new Set(added.map((c) => c.id));
        counts = counts.filter((c) => !ids.has(c.id));
      }

      counts.push(...added);
      this.counts.set(counts);
    }
  }

  public saveCount(): void {
    if (!this.edited || !this.editedForm.valid) {
      return;
    }

    // create the new count
    const count: DecoratedCount = {
      id: this.edited()!.id,
      value: this.value.value,
      tag: this.tag.value ? this.tag.value?.trim() : undefined,
      note: this.note.value ? this.note.value?.trim() : undefined,
    };

    // create a copy of the existing counts
    const counts = [...(this.counts() || [])];

    // check for exact duplicate (excluding the currently edited index)
    const isDuplicate = counts.some(
      (c, i) => i !== this.editedIndex() && this.areCountsEqual(c, count)
    );
    if (isDuplicate) {
      // do nothing if duplicate
      return;
    }

    // get the index of the existing count with the same ID
    const existingIndex = counts.findIndex((m) => m.id === count.id);
    // append or replace
    if (this.editedIndex() === -1) {
      counts.push(count);
    } else {
      counts[this.editedIndex()] = count;
    }

    // if distinct, remove another existing count with the same ID
    if (
      existingIndex > -1 &&
      existingIndex !== this.editedIndex() &&
      this.distinct()
    ) {
      counts.splice(existingIndex, 1);
    }

    // save the updated counts
    this.counts.set(counts);

    // close the editor
    this.closeCount();
  }

  public moveCountUp(index: number): void {
    if (index < 1) {
      return;
    }
    const counts = [...this.counts()!];
    const item = counts[index];
    counts.splice(index, 1);
    counts.splice(index - 1, 0, item);

    this.counts.set(counts);
  }

  public moveCountDown(index: number): void {
    if (index + 1 >= this.counts()!.length) {
      return;
    }
    const counts = [...this.counts()!];
    const item = counts[index];
    counts.splice(index, 1);
    counts.splice(index + 1, 0, item);

    this.counts.set(counts);
  }

  public deleteCount(index: number) {
    const counts = [...this.counts()!];
    counts.splice(index, 1);

    this.counts.set(counts);
  }
}
