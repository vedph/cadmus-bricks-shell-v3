import { Component, effect, input, model, output } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { take } from 'rxjs';

// material
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

// myrmidon
import { DialogService } from '@myrmidon/ngx-mat-tools';

// cadmus
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

// local
import {
  AssertedId,
  AssertedIdComponent,
} from '../asserted-id/asserted-id.component';

/**
 * Asserted IDs editor.
 */
@Component({
  selector: 'cadmus-refs-asserted-ids',
  templateUrl: './asserted-ids.component.html',
  styleUrls: ['./asserted-ids.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    // material
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    MatTooltipModule,
    // bricks
    AssertedIdComponent
],
})
export class AssertedIdsComponent {
  private _editedIndex: number;
  public edited?: AssertedId;

  /**
   * The asserted IDs.
   */
  public readonly ids = model<AssertedId[]>([]);

  // asserted-id-scopes
  public readonly idScopeEntries = input<ThesaurusEntry[]>();

  // asserted-id-tags
  public readonly idTagEntries = input<ThesaurusEntry[]>();

  // assertion-tags
  public readonly assTagEntries = input<ThesaurusEntry[]>();

  // doc-reference-types
  public readonly refTypeEntries = input<ThesaurusEntry[]>();

  // doc-reference-tags
  public readonly refTagEntries = input<ThesaurusEntry[]>();

  public entries: FormControl<AssertedId[]>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder, private _dialogService: DialogService) {
    this._editedIndex = -1;
    this.entries = formBuilder.control([], { nonNullable: true });
    // form
    this.form = formBuilder.group({
      ids: this.entries,
    });

    // when ids change, update form
    effect(() => {
      this.updateForm(this.ids());
    });
  }

  private updateForm(ids: AssertedId[]): void {
    if (!ids?.length) {
      this.form.reset();
      return;
    }
    this.entries.setValue(ids, { emitEvent: false });
    this.entries.updateValueAndValidity();
    this.form.markAsPristine();
  }

  public addId(): void {
    this.editId(
      {
        scope: '',
        value: '',
      },
      -1
    );
  }

  public editId(id: AssertedId, index: number): void {
    this._editedIndex = index;
    this.edited = id;
  }

  public closeId(): void {
    this._editedIndex = -1;
    this.edited = undefined;
  }

  public saveId(entry: AssertedId): void {
    const entries = [...this.entries.value];
    if (this._editedIndex === -1) {
      entries.push(entry);
    } else {
      entries.splice(this._editedIndex, 1, entry);
    }
    this.entries.setValue(entries);
    this.entries.markAsDirty();
    this.entries.updateValueAndValidity();
    this.closeId();
  }

  public deleteId(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete ID?')
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          if (this._editedIndex === index) {
            this.closeId();
          }
          const entries = [...this.entries.value];
          entries.splice(index, 1);
          this.entries.setValue(entries);
          this.entries.markAsDirty();
          this.entries.updateValueAndValidity();
          this.ids.set(this.entries.value);
        }
      });
  }

  public moveIdUp(index: number): void {
    if (index < 1) {
      return;
    }
    const entry = this.entries.value[index];
    const entries = [...this.entries.value];
    entries.splice(index, 1);
    entries.splice(index - 1, 0, entry);
    this.entries.setValue(entries);
    this.entries.markAsDirty();
    this.entries.updateValueAndValidity();
    this.ids.set(this.entries.value);
  }

  public moveIdDown(index: number): void {
    if (index + 1 >= this.entries.value.length) {
      return;
    }
    const entry = this.entries.value[index];
    const entries = [...this.entries.value];
    entries.splice(index, 1);
    entries.splice(index + 1, 0, entry);
    this.entries.setValue(entries);
    this.entries.markAsDirty();
    this.entries.updateValueAndValidity();
    this.ids.set(this.entries.value);
  }

  public onIdChange(id?: AssertedId): void {
    this.saveId(id!);
    this.ids.set(this.entries.value);
  }
}
