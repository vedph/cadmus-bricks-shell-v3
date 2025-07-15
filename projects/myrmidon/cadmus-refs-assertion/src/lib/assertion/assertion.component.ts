import {
  Component,
  effect,
  input,
  model,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { Subscription } from 'rxjs';

// material
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

// bricks
import { DocReference } from '@myrmidon/cadmus-refs-doc-references';
import { LookupDocReferencesComponent } from '@myrmidon/cadmus-refs-lookup';

// cadmus
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

/**
 * An assertion with optional references.
 */
export interface Assertion {
  tag?: string;
  rank: number;
  note?: string;
  references?: DocReference[];
}

/**
 * Editor for an assertion with optional references.
 */
@Component({
  selector: 'cadmus-refs-assertion',
  templateUrl: './assertion.component.html',
  styleUrls: ['./assertion.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    // material
    MatBadgeModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    // bricks
    LookupDocReferencesComponent,
  ],
})
export class AssertionComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;
  private _updatingForm?: boolean;
  private _dropNextInput?: boolean;

  public tag: FormControl<string | null>;
  public rank: FormControl<number>;
  public note: FormControl<string | null>;
  public references: FormControl<DocReference[]>;
  public form: FormGroup;

  // assertion-tags
  public readonly assTagEntries = input<ThesaurusEntry[]>();

  // doc-reference-types
  public readonly refTypeEntries = input<ThesaurusEntry[]>();

  // doc-reference-tags
  public readonly refTagEntries = input<ThesaurusEntry[]>();

  /**
   * The assertion being edited.
   */
  public readonly assertion = model<Assertion>();

  /**
   * True to disable the lookup set.
   */
  public readonly noLookup = input<boolean>();

  /**
   * True to disable the citation builder.
   */
  public readonly noCitation = input<boolean>();

  /**
   * The default picker to show when the editor opens.
   */
  public readonly defaultPicker = input<'citation' | 'lookup'>('citation');

  public visualExpanded?: boolean;

  constructor(formBuilder: FormBuilder) {
    this.tag = formBuilder.control(null, Validators.maxLength(50));
    this.rank = formBuilder.control(0, { nonNullable: true });
    this.note = formBuilder.control(null, Validators.maxLength(500));
    this.references = formBuilder.control([], { nonNullable: true });
    this.form = formBuilder.group({
      tag: this.tag,
      rank: this.rank,
      note: this.note,
      references: this.references,
    });

    // when assertion changes, update form
    effect(() => {
      if (this._dropNextInput) {
        this._dropNextInput = false;
        return;
      }
      this.updateForm(this.assertion());
    });
  }

  public ngOnInit(): void {
    this._sub = this.form.valueChanges
      .pipe(debounceTime(300))
      .subscribe((_) => {
        if (!this._updatingForm) {
          this.saveAssertion();
        }
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public onReferencesChange(references: DocReference[]): void {
    this.references.setValue(references, { emitEvent: false });
    this.saveAssertion();
  }

  private updateForm(value: Assertion | undefined): void {
    this._updatingForm = true;
    if (!value) {
      this.form.reset();
    } else {
      this.tag.setValue(value.tag || null);
      this.rank.setValue(value.rank);
      this.note.setValue(value.note || null);
      this.references.setValue(value.references || []);
      this.form.markAsPristine();
    }
    this._updatingForm = false;
  }

  private getAssertion(): Assertion | undefined {
    const assertion = {
      tag: this.tag.value?.trim(),
      rank: this.rank.value,
      note: this.note.value?.trim(),
      references: this.references.value?.length
        ? this.references.value
        : undefined,
    };
    if (
      !assertion.tag &&
      !assertion.rank &&
      !assertion.note &&
      !assertion.references?.length
    ) {
      return undefined;
    }
    return assertion;
  }

  public saveAssertion(): void {
    this._dropNextInput = true;
    this.assertion.set(this.getAssertion());
  }
}
