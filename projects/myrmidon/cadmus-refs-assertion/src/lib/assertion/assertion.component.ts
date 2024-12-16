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

import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { CadmusCoreModule, ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  DocReference,
  DocReferencesComponent,
} from '@myrmidon/cadmus-refs-doc-references';
import { Subscription } from 'rxjs';

export interface Assertion {
  tag?: string;
  rank: number;
  note?: string;
  references?: DocReference[];
}

@Component({
  selector: 'cadmus-refs-assertion',
  templateUrl: './assertion.component.html',
  styleUrls: ['./assertion.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatBadgeModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    CadmusCoreModule,
    DocReferencesComponent,
  ],
})
export class AssertionComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;
  private _updatingForm?: boolean;
  private _dropNextAssertion?: boolean;

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
      if (this._dropNextAssertion) {
        this._dropNextAssertion = false;
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
    this._dropNextAssertion = true;
    this.assertion.set(this.getAssertion());
  }
}
