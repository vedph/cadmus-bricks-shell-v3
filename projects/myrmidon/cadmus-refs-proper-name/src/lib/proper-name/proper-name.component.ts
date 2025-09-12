import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { FlatLookupPipe, NgxToolsValidators } from '@myrmidon/ngx-tools';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { Assertion, AssertionComponent } from '@myrmidon/cadmus-refs-assertion';

import { ProperName, ProperNamePiece, TypeThesaurusEntry } from '../models';
import { ProperNameService } from '../services/proper-name.service';
import { ProperNamePieceComponent } from '../proper-name-piece/proper-name-piece.component';

/**
 * A proper name with an assertion.
 */
export interface AssertedProperName extends ProperName {
  assertion?: Assertion;
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
    FormsModule,
    ReactiveFormsModule,
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
export class ProperNameComponent implements OnInit, OnDestroy {
  private readonly _subs: Subscription[] = [];
  private _typeEntries$: BehaviorSubject<ThesaurusEntry[] | undefined>;
  private _name$: BehaviorSubject<AssertedProperName | undefined>;

  public readonly pieceTypes = signal<TypeThesaurusEntry[]>([]);
  public readonly editedPieceIndex = signal<number>(-1);
  public readonly editedPiece = signal<ProperNamePiece | undefined>(undefined);
  public readonly purgedTypeEntries = signal<ThesaurusEntry[] | undefined>(
    undefined
  );

  /**
   * The proper name.
   */
  public readonly name = model<AssertedProperName>();

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
  public language: FormControl<string | null>;
  public tag: FormControl<string | null>;
  public pieces: FormControl<ProperNamePiece[]>;
  public assertion: FormControl<Assertion | null>;
  public form: FormGroup;

  // edited assertion
  public readonly assEdOpen = signal<boolean>(false);
  public readonly ordered = computed(() =>
    this.pieceTypes().some((t) => t.ordinal)
  );
  public readonly valueEntries = computed(() =>
    this._nameService.getValueEntries(this.pieceTypes())
  );

  constructor(
    formBuilder: FormBuilder,
    private _nameService: ProperNameService
  ) {
    this.assEdOpen.set(false);

    // main form
    this.language = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(50),
    ]);
    this.tag = formBuilder.control(null, Validators.maxLength(50));
    this.pieces = formBuilder.control([], {
      validators: NgxToolsValidators.strictMinLengthValidator(1),
      nonNullable: true,
    });
    this.assertion = formBuilder.control(null);
    this.form = formBuilder.group({
      language: this.language,
      tag: this.tag,
      pieces: this.pieces,
      assertion: this.assertion,
    });

    // streams
    this._typeEntries$ = new BehaviorSubject<ThesaurusEntry[] | undefined>(
      undefined
    );
    this._name$ = new BehaviorSubject<AssertedProperName | undefined>(
      undefined
    );
    // combine types and name together in updating form
    combineLatest({
      types: this._typeEntries$,
      name: this._name$,
    }).subscribe((tn) => {
      this.updateForm(tn.name, tn.types);
    });

    // when name changes, update the stream
    effect(() => {
      this._name$.next(this.name());
    });

    // when typeEntries change, update the stream
    effect(() => {
      this._typeEntries$.next(this.typeEntries());
      this.updatePurgedTypeEntries();
    });
  }

  public ngOnInit(): void {
    // any change on name emits event
    this._subs.push(
      this.language.valueChanges
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe((_) => {
          this.name.set(this.getName());
        })
    );
    this._subs.push(
      this.tag.valueChanges
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe((_) => {
          this.name.set(this.getName());
        })
    );
  }

  public ngOnDestroy(): void {
    this._subs.forEach((s) => s.unsubscribe());
  }

  private updatePurgedTypeEntries(): void {
    if (this._typeEntries$.value) {
      // copy all entries by removing last * from IDs if present
      this.purgedTypeEntries.set(
        this._typeEntries$.value.map((e) => {
          return e.id[e.id.length - 1] === '*'
            ? { ...e, id: e.id.substring(0, e.id.length - 1) }
            : e;
        })
      );
    } else {
      this.purgedTypeEntries.set(undefined);
    }
  }

  //#region Pieces
  public editPiece(piece: ProperNamePiece, index: number): void {
    this.editedPieceIndex.set(index);
    this.editedPiece.set(piece);
  }

  public addPiece(): void {
    this.editPiece(
      {
        type: this.pieceTypes.length ? this.pieceTypes()[0].id : '',
        value: '',
      },
      -1
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
    this.pieces.setValue(pieces);
    this.pieces.markAsDirty();
    this.pieces.updateValueAndValidity();

    this.name.set(this.getName());
  }

  public savePiece(piece?: ProperNamePiece): void {
    const pieces = [...this.pieces.value];

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
      const i = this.pieces.value.findIndex((p) => p.type === piece!.type);
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
    const pieces = [...this.pieces.value];
    pieces.splice(index, 1);
    this.pieces.setValue(pieces);
    this.pieces.markAsDirty();
    this.pieces.updateValueAndValidity();

    if (this.editedPieceIndex() === index) {
      this.closePiece();
    }

    this.name.set(this.getName());
  }

  public movePieceUp(index: number): void {
    if (index < 1) {
      return;
    }
    const pieces = [...this.pieces.value];
    const p = pieces.splice(index, 1)[0];
    pieces.splice(index - 1, 0, p);
    this.pieces.setValue(pieces);
    this.pieces.markAsDirty();
    this.pieces.updateValueAndValidity();
    this.name.set(this.getName());
  }

  public movePieceDown(index: number): void {
    if (index + 1 >= this.pieces.value.length) {
      return;
    }
    const pieces = [...this.pieces.value];
    const p = pieces.splice(index, 1)[0];
    pieces.splice(index + 1, 0, p);
    this.pieces.setValue(pieces);
    this.pieces.markAsDirty();
    this.pieces.updateValueAndValidity();
    this.name.set(this.getName());
  }

  public clearPieces(): void {
    this.pieces.setValue([]);
    this.name.set(this.getName());
  }
  //#endregion

  private updateForm(
    name?: AssertedProperName,
    typeEntries?: ThesaurusEntry[]
  ): void {
    this.closePiece();
    this.assEdOpen.set(false);

    // no name
    if (!name) {
      this.pieces.setValue([]);
      this.form.reset();
      this.pieceTypes.set(this._nameService.parseTypeEntries(typeEntries));
      return;
    }

    // name
    this.pieceTypes.set(this._nameService.parseTypeEntries(typeEntries));

    this.language.setValue(name.language, { emitEvent: false });
    this.tag.setValue(name.tag || null, { emitEvent: false });
    this.pieces.setValue(name.pieces);
    this.assertion.setValue(name.assertion || null);
    this.form.markAsPristine();
  }

  public onAssertionChange(assertion: Assertion | undefined): void {
    this.assertion.setValue(assertion || null);
    this.assertion.updateValueAndValidity();
    this.assertion.markAsDirty();
  }

  public saveAssertion(): void {
    this.name.set(this.getName());
    this.assEdOpen.set(false);
  }

  private getName(): AssertedProperName | undefined {
    if (!this.pieces.value?.length) {
      return undefined;
    }

    return {
      language: this.language.value || '',
      tag: this.tag.value || undefined,
      pieces: this.pieces.value,
      assertion: this.assertion.value || undefined,
    };
  }
}
