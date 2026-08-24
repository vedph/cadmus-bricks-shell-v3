import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  model,
  signal,
  ViewChild,
} from '@angular/core';
import {
  FieldTree,
  FormField,
  FormRoot,
  disabled,
  form,
  maxLength,
} from '@angular/forms/signals';

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
 * The controls used to add a new count.
 */
interface AddCountControls {
  id: string;
  hasCustom: boolean;
  custom: string;
  batch: string;
}

/**
 * The controls used to edit an existing (or new) count.
 */
interface EditedCountControls {
  tag: string;
  value: number;
  note: string;
}

/**
 * Decorated counts editor component.
 */
@Component({
  selector: 'cadmus-refs-decorated-counts',
  templateUrl: './decorated-counts.component.html',
  styleUrls: ['./decorated-counts.component.css'],
  imports: [
    FormField,
    FormRoot,
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
export class DecoratedCountsComponent {
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

  // add count form
  public readonly form: FieldTree<AddCountControls>;
  // edited count form
  public readonly editedForm: FieldTree<EditedCountControls>;

  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<DecoratedCount | undefined>(undefined);

  constructor() {
    this.form = form(
      signal<AddCountControls>({
        id: '',
        hasCustom: false,
        custom: '',
        batch: '',
      }),
      (path) => {
        disabled(path.id, { when: (ctx) => ctx.valueOf(path.hasCustom) });
      }
    );
    this.editedForm = form(
      signal<EditedCountControls>({ tag: '', value: 0, note: '' }),
      (path) => {
        maxLength(path.note, 1000);
      }
    );

    // when hasCustom becomes true, focus the custom ID input
    effect(() => {
      const hasCustom = this.form.hasCustom().value();
      if (hasCustom && this.customCtl) {
        setTimeout(() => this.customCtl!.nativeElement.focus(), 0);
      }
    });
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

  private resetEditedForm(): void {
    this.editedForm().value.set({ tag: '', value: 0, note: '' });
    this.editedForm().reset();
  }

  public editCount(index: number): void {
    this.editedIndex.set(index);
    this.edited.set(this.counts()![index]);

    this.editedForm().value.set({
      tag: this.edited()!.tag || '',
      value: this.edited()!.value,
      note: this.edited()!.note || '',
    });
    this.editedForm().reset();

    this.focusCount();
  }

  public addCustomCount(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!this.form.custom().value()) {
      return;
    }

    this.editedIndex.set(-1);
    this.edited.set({
      id: this.form.custom().value(),
      value: 0,
    } as DecoratedCount);
    this.resetEditedForm();

    this.form.custom().value.set('');
    this.focusCount();
  }

  public addCount(event?: Event): void {
    if (this.form.hasCustom().value()) {
      this.addCustomCount(event);
      return;
    }
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!this.form.id().value()) {
      return;
    }

    this.editedIndex.set(-1);
    this.edited.set({
      id: this.form.id().value(),
      value: 0,
    } as DecoratedCount);
    this.resetEditedForm();

    if (!this.idEntries?.length) {
      this.form.id().value.set('');
    }
    this.focusCount();
  }

  public addBatchCounts(): void {
    // parse from batch.value with form "ID=value [tag] (note);..."
    const entries = this.form
      .batch()
      .value()
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
          tag: m[3]?.substring(1, m[3].length - 1),
          note: m[4]?.substring(1, m[4].length - 1),
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
    if (!this.edited || !this.editedForm().valid()) {
      return;
    }

    // create the new count
    const editedValue = this.editedForm().value();
    const count: DecoratedCount = {
      id: this.edited()!.id,
      value: editedValue.value,
      tag: editedValue.tag ? editedValue.tag.trim() : undefined,
      note: editedValue.note ? editedValue.note?.trim() : undefined,
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
