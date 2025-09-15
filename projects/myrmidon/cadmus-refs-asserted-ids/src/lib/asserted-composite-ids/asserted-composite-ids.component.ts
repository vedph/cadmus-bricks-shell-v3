import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  signal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { take } from 'rxjs';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { IndexLookupDefinitions, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { deepCopy } from '@myrmidon/ngx-tools';

import {
  AssertedCompositeId,
  AssertedCompositeIdComponent,
} from '../asserted-composite-id/asserted-composite-id.component';

/**
 * Asserted composite IDs editor.
 */
@Component({
  selector: 'cadmus-refs-asserted-composite-ids',
  templateUrl: './asserted-composite-ids.component.html',
  styleUrls: ['./asserted-composite-ids.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    AssertedCompositeIdComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssertedCompositeIdsComponent {
  /**
   * The asserted IDs.
   */
  public readonly ids = model<AssertedCompositeId[]>([]);

  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<AssertedCompositeId | undefined>(undefined);

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

  /**
   * True when the internal UI preselected mode should be by type rather than
   * by item. User can change mode unless modeSwitching is false.
   */
  public readonly pinByTypeMode = input<boolean>();

  /**
   * True when the user can switch between by-type and by-item mode in
   * the internal UI.
   */
  public readonly canSwitchMode = input<boolean>();

  /**
   * True when the user can edit the target's gid/label for internal targets.
   */
  public readonly canEditTarget = input<boolean>();

  /**
   * The lookup definitions to be used for the by-type lookup in the internal UI.
   * If not specified, the lookup definitions will be got via injection
   * when available; if the injected definitions are empty, the
   * lookup definitions will be built from the model-types thesaurus;
   * if this is not available either, the by-type lookup will be
   * disabled.
   */
  public readonly lookupDefinitions = input<IndexLookupDefinitions>();

  /**
   * The default part type key.
   */
  public readonly defaultPartTypeKey = input<string>();

  constructor(private _dialogService: DialogService) {}

  public addId(): void {
    this.editId(
      {
        target: { gid: '', label: '' },
      },
      -1
    );
  }

  public editId(id: AssertedCompositeId, index: number): void {
    this.editedIndex.set(index);
    this.edited.set(deepCopy(id));
  }

  public closeId(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  public saveId(entry: AssertedCompositeId): void {
    const ids = [...this.ids()];
    if (this.editedIndex() === -1) {
      ids.push(entry);
    } else {
      ids.splice(this.editedIndex(), 1, entry);
    }
    this.ids.set(ids);
    this.closeId();
  }

  public deleteId(index: number): void {
    this._dialogService
      .confirm('Confirmation', 'Delete ID?')
      .pipe(take(1))
      .subscribe((yes) => {
        if (yes) {
          if (this.editedIndex() === index) {
            this.closeId();
          }
          const ids = [...this.ids()];
          ids.splice(index, 1);
          this.ids.set(ids);
        }
      });
  }

  public moveIdUp(index: number): void {
    if (index < 1) {
      return;
    }
    const id = this.ids()[index];
    const ids = [...this.ids()];
    ids.splice(index, 1);
    ids.splice(index - 1, 0, id);
    this.ids.set(ids);
  }

  public moveIdDown(index: number): void {
    if (index + 1 >= this.ids().length) {
      return;
    }
    const id = this.ids()[index];
    const ids = [...this.ids()];
    ids.splice(index, 1);
    ids.splice(index + 1, 0, id);
    this.ids.set(ids);
  }

  public onIdChange(id?: AssertedCompositeId): void {
    this.saveId(id!);
  }
}
