import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  signal,
} from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { FlatLookupPipe, NgxToolsSignalValidators } from '@myrmidon/ngx-tools';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { Assertion, AssertionComponent } from '@myrmidon/cadmus-refs-assertion';
import { LookupProviderOptions } from '@myrmidon/cadmus-refs-lookup';

import { ProperName, ProperNamePiece, TypeThesaurusEntry } from '../models';
import { ProperNameService } from '../services/proper-name.service';
import { ProperNamePieceComponent } from '../proper-name-piece/proper-name-piece.component';

/**
 * A proper name with an assertion.
 */
export interface AssertedProperName extends ProperName {
  assertion?: Assertion;
}

interface ProperNameControls {
  language: string;
  tag: string;
  pieces: ProperNamePiece[];
  assertion: Assertion | null;
}

function makeDefaultDraft(): ProperNameControls {
  return { language: '', tag: '', pieces: [], assertion: null };
}

/**
 * Proper name real-time editor (cadmus-refs-proper-name).
 * To use, add to the consumer component an initialName property to be
 * bound to name, and handle nameChange to setValue the received name.
 * This component uses the following conventions for its type thesaurus:
 * - thesaurus can be hierarchical. This happens if any of its entries
 *   IDs contains a dot. In this case, any type can have a list of children
 *   representing the allowed values for it. No further nesting is allowed,
 *   as parent entries represent types, while their children entries
 *   represent type values.
 * - a reserved entry named _order with value equal to a space-delimited
 *   list of entries IDs defines the prescribed order of pieces. When set,
 *   users are not allowed to move pieces up/down in the list, and pieces
 *   are always added in the prescribed order.
 * - entries ending with `*` are unique, i.e. you cannot add more than
 *   a single entry of this type to the pieces.
 */
@Component({
  selector: 'cadmus-refs-proper-name',
  templateUrl: './proper-name.component.html',
  styleUrls: ['./proper-name.component.css'],
  imports: [
    FormField,
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    AssertionComponent,
    ProperNamePieceComponent,
    FlatLookupPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProperNameComponent {
  public readonly pieceTypes = signal<TypeThesaurusEntry[]>([]);
  public readonly editedPieceIndex = signal<number>(-1);
  public readonly editedPiece = signal<ProperNamePiece | undefined>(undefined);
  public readonly purgedTypeEntries = computed<ThesaurusEntry[] | undefined>(
    () => {
      const entries = this.typeEntries();
      if (!entries) {
        return undefined;
      }
      // copy all entries by removing last * from IDs if present
      return entries.map((e) => {
        return e.id[e.id.length - 1] === '*'
          ? { ...e, id: e.id.substring(0, e.id.length - 1) }
          : e;
      });
    },
  );

  /**
   * The proper name.
   */
  public readonly name = model<AssertedProperName>();

  /**
   * Optional preset options for lookup providers.
   * Maps provider IDs to their available scopes.
   */
  public readonly lookupProviderOptions = input<LookupProviderOptions>();

  /**
   * The optional thesaurus name piece's type entries (name-piece-types).
   */
  public readonly typeEntries = input<ThesaurusEntry[]>();
  /**
   * The optional thesaurus proper name languages entries (name-languages).
   */
  public readonly langEntries = input<ThesaurusEntry[]>();
  /**
   * The optional thesaurus name's tag entries (name-tags).
   */
  public readonly tagEntries = input<ThesaurusEntry[]>();

  // thesauri for assertions
  // assertion-tags
  public readonly assTagEntries = input<ThesaurusEntry[]>();
  // doc-reference-types
  public readonly refTypeEntries = input<ThesaurusEntry[]>();
  // doc-reference-tags
  public readonly refTagEntries = input<ThesaurusEntry[]>();

  /**
   * True to hide the proper name's assertion UI.
   */
  public readonly hideAssertion = input<boolean>();

  // main form
  private readonly _draft = signal<ProperNameControls>(makeDefaultDraft());
  public readonly form = form(this._draft, (path) => {
    required(path.language);
    maxLength(path.language, 50);
    maxLength(path.tag, 50);
    NgxToolsSignalValidators.strictMinLength(path.pieces, 1);
  });

  // edited assertion
  public readonly assEdOpen = signal<boolean>(false);
  public readonly ordered = computed(() =>
    this.pieceTypes().some((t) => t.ordinal),
  );
  public readonly valueEntries = computed(() =>
    this._nameService.getValueEntries(this.pieceTypes()),
  );

  constructor(private _nameService: ProperNameService) {
    this.assEdOpen.set(false);

    // when name or typeEntries change, update the form (native signal
    // dependency tracking replaces the original's manual
    // BehaviorSubject + combineLatest bridge)
    effect(() => {
      const name = this.name();
      const typeEntries = this.typeEntries();
      this.updateForm(name, typeEntries);
    });

    // any change on language/tag emits event, once settled
    toObservable(this.form.language().value)
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        const next = this.getName();
        if (!this.namesEqual(next, this.name())) {
          this.name.set(next);
        }
      });
    toObservable(this.form.tag().value)
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        const next = this.getName();
        if (!this.namesEqual(next, this.name())) {
          this.name.set(next);
        }
      });
  }

  private namesEqual(
    a: AssertedProperName | undefined,
    b?: AssertedProperName,
  ): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  //#region Pieces
  public editPiece(piece: ProperNamePiece, index: number): void {
    this.editedPieceIndex.set(index);
    this.editedPiece.set(piece);
  }

  public addPiece(): void {
    this.editPiece(
      {
        // note: pieceTypes is a signal, so it must be invoked (pieceTypes())
        // to read the underlying array before checking its length
        type: this.pieceTypes().length ? this.pieceTypes()[0].id : '',
        value: '',
      },
      -1,
    );
  }

  public closePiece(): void {
    this.editedPieceIndex.set(-1);
    this.editedPiece.set(undefined);
  }

  private getTypeOrdinal(id: string): number {
    return this.pieceTypes().find((t) => t.id === id)?.ordinal || -1;
  }

  private updatePieces(pieces: ProperNamePiece[]): void {
    this._draft.update((v) => ({ ...v, pieces }));
    this.form.pieces().markAsDirty();

    this.name.set(this.getName());
  }

  public savePiece(piece?: ProperNamePiece): void {
    const pieces = [...this._draft().pieces];

    // just replace if editing an existing piece
    if (this.editedPieceIndex() > -1) {
      pieces.splice(this.editedPieceIndex(), 1, piece!);
      this.updatePieces(pieces);
      this.closePiece();
      return;
    }

    // also replace a single piece if one is already present
    const type = this.pieceTypes().find((t) => t.id === piece!.type);
    if (type?.single) {
      const i = pieces.findIndex((p) => p.type === piece!.type);
      if (i > -1) {
        pieces.splice(i, 1, piece!);
        this.updatePieces(pieces);
        this.closePiece();
        return;
      }
    }

    // else add: if ordered, insert at the right place; else just append
    if (this.ordered() && pieces.length) {
      const n = type?.ordinal || 0;
      const i = n
        ? pieces.findIndex((p) => n < this.getTypeOrdinal(p.type))
        : -1;
      if (i === -1) {
        pieces.push(piece!);
      } else {
        pieces.splice(i, 0, piece!);
      }
    } else {
      pieces.push(piece!);
    }

    this.updatePieces(pieces);
    this.closePiece();
  }

  public removePiece(index: number): void {
    const pieces = [...this._draft().pieces];
    pieces.splice(index, 1);
    this._draft.update((v) => ({ ...v, pieces }));
    this.form.pieces().markAsDirty();

    if (this.editedPieceIndex() === index) {
      this.closePiece();
    }

    this.name.set(this.getName());
  }

  public movePieceUp(index: number): void {
    if (index < 1) {
      return;
    }
    const pieces = [...this._draft().pieces];
    const p = pieces.splice(index, 1)[0];
    pieces.splice(index - 1, 0, p);
    this._draft.update((v) => ({ ...v, pieces }));
    this.form.pieces().markAsDirty();
    this.name.set(this.getName());
  }

  public movePieceDown(index: number): void {
    if (index + 1 >= this._draft().pieces.length) {
      return;
    }
    const pieces = [...this._draft().pieces];
    const p = pieces.splice(index, 1)[0];
    pieces.splice(index + 1, 0, p);
    this._draft.update((v) => ({ ...v, pieces }));
    this.form.pieces().markAsDirty();
    this.name.set(this.getName());
  }

  public clearPieces(): void {
    this._draft.update((v) => ({ ...v, pieces: [] }));
    this.name.set(this.getName());
  }
  //#endregion

  private updateForm(
    name?: AssertedProperName,
    typeEntries?: ThesaurusEntry[],
  ): void {
    this.closePiece();
    this.assEdOpen.set(false);
    this.pieceTypes.set(this._nameService.parseTypeEntries(typeEntries));

    if (!name) {
      this._draft.set(makeDefaultDraft());
    } else {
      this._draft.set({
        language: name.language || '',
        tag: name.tag || '',
        // map into fresh objects rather than adopting the caller's own
        // ProperNamePiece references directly - see
        // signal-forms-migration.md (cadmus-refs-decorated-ids entry)
        // for why.
        pieces: name.pieces.map((p) => ({ type: p.type, value: p.value })),
        assertion: name.assertion || null,
      });
    }
    this.form().reset();
  }

  public onAssertionChange(assertion: Assertion | undefined): void {
    this.form.assertion().value.set(assertion || null);
    this.form.assertion().markAsDirty();
  }

  public saveAssertion(): void {
    this.name.set(this.getName());
    this.assEdOpen.set(false);
  }

  private getName(): AssertedProperName | undefined {
    const v = this._draft();
    if (!v.pieces?.length) {
      return undefined;
    }

    return {
      language: v.language || '',
      tag: v.tag || undefined,
      pieces: v.pieces.map((p) => ({ type: p.type, value: p.value })),
      assertion: v.assertion || undefined,
    };
  }

  public onFormSubmit(event: Event): void {
    event.preventDefault();
  }
}
