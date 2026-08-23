import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FieldTree, FormField, form, required } from '@angular/forms/signals';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { ProperNamePiece, TypeThesaurusEntry } from '../models';

interface ProperNamePieceControls {
  type: TypeThesaurusEntry | string | null;
  value: ThesaurusEntry | string | null;
}

/**
 * Proper name piece editor. This edits a single proper name's piece,
 * including a type and a value, where both can be either a literal
 * value or a thesaurus entity.
 */
@Component({
  selector: 'cadmus-refs-proper-name-piece',
  templateUrl: './proper-name-piece.component.html',
  styleUrls: ['./proper-name-piece.component.css'],
  imports: [
    FormField,
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProperNamePieceComponent {
  private _noNextValuesUpdate?: boolean;

  /**
   * The piece being edited.
   */
  public readonly piece = model<ProperNamePiece>();

  /**
   * The available piece types.
   */
  public readonly types = input<TypeThesaurusEntry[]>();

  /**
   * Emitted when the editor is closed.
   */
  public readonly editorClose = output();

  // form
  private readonly _draft = signal<ProperNamePieceControls>({
    type: null,
    value: null,
  });
  public readonly form: FieldTree<ProperNamePieceControls>;

  // the preset values (if any) of the current type
  public readonly typeValues = signal<ThesaurusEntry[]>([]);

  constructor() {
    this.form = form(this._draft, (path) => {
      required(path.type);
      required(path.value);
    });

    // when piece or types change, update the form (native signal
    // dependency tracking replaces the original's manual
    // BehaviorSubject + combineLatest bridge)
    effect(() => {
      const piece = this.piece();
      const types = this.types();
      this.updateForm(piece, types);
    });

    // when type changes, type's values are updated
    toObservable(this.form.type().value)
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        if (!this._noNextValuesUpdate) {
          this.updateTypeValues();
        } else {
          this._noNextValuesUpdate = false;
        }
      });
  }

  public onTypeInput(value: string): void {
    this.form.type().value.set(value);
    this.form.type().markAsDirty();
  }

  public onValueInput(value: string): void {
    this.form.value().value.set(value);
    this.form.value().markAsDirty();
  }

  private updateTypeValues(): void {
    // no preset values if no types
    if (!this.types()?.length) {
      this.typeValues.set([]);
    } else {
      // get type's values if any
      const type = this.form.type().value() as TypeThesaurusEntry;
      if (type?.values?.length) {
        this.typeValues.set(type.values);
      } else {
        this.typeValues.set([]);
      }
      // if we got values and there is an invalid value, reset it
      if (
        this.typeValues().length &&
        this.form.value().value() &&
        this.typeValues().every((e) => e.id !== this.form.value().value())
      ) {
        this.form.value().value.set(null);
        this.form.value().reset();
      }
    }
  }

  private updateForm(
    piece?: ProperNamePiece,
    types?: TypeThesaurusEntry[]
  ): void {
    if (!piece) {
      this._draft.set({ type: null, value: null });
      this.form().reset();
      return;
    }

    this._noNextValuesUpdate = true;
    // type: TypeThesaurusEntry or string
    const typeEntity = types?.find((t) => t.id === piece.type);
    this.typeValues.set(typeEntity?.values || []);

    // value: ThesaurusEntry or string
    this._draft.set({
      type: typeEntity || piece.type || null,
      value:
        typeEntity?.values?.find((e) => e.id === piece.value) ||
        piece.value ||
        null,
    });
    this.form().reset();
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form().invalid()) {
      return;
    }
    const typeVal = this.form.type().value();
    const valueVal = this.form.value().value();
    this.piece.set({
      type: (typeVal as TypeThesaurusEntry)?.id || (typeVal as string),
      value: (valueVal as ThesaurusEntry)?.id || (valueVal as string),
    });
  }
}
