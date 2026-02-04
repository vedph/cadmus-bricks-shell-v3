import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  signal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { take } from 'rxjs';

// material
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

// myrmidon
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { deepCopy } from '@myrmidon/ngx-tools';

// cadmus
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { LookupProviderOptions } from '@myrmidon/cadmus-refs-lookup';

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
    AssertedIdComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssertedIdsComponent {
  public readonly editedIndex = signal<number>(-1);
  public readonly edited = signal<AssertedId | undefined>(undefined);

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

  /**
   * Optional preset options for lookup providers.
   * Maps provider IDs to their available scopes.
   */
  public readonly lookupProviderOptions = input<LookupProviderOptions>();

  constructor(private _dialogService: DialogService) {}

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
    this.editedIndex.set(index);
    this.edited.set(deepCopy(id));
  }

  public closeId(): void {
    this.editedIndex.set(-1);
    this.edited.set(undefined);
  }

  public saveId(id: AssertedId): void {
    const ids = [...this.ids()];
    if (this.editedIndex() === -1) {
      ids.push(id);
    } else {
      ids.splice(this.editedIndex(), 1, id);
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

  public onIdChange(id?: AssertedId): void {
    this.saveId(id!);
  }
}
