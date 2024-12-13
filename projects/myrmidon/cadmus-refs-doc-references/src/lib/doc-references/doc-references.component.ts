import {
  AfterViewInit,
  Component,
  effect,
  input,
  OnDestroy,
  output,
  QueryList,
  ViewChildren,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { CadmusCoreModule, ThesaurusEntry } from '@myrmidon/cadmus-core';

export interface DocReference {
  type?: string;
  tag?: string;
  citation: string;
  note?: string;
}

/**
 * Real-time editor for a set of DocReference's.
 * Set the references with the references property, and get their changes
 * in real-time via referencesChange. Usually you should set the references
 * property once in the container of this component (e.g. using an
 * initialRefs string array, changed only when a new model is set), and
 * then change the references as emitted by this component in a FormControl
 * with an array value.
 * So for instance you would have [references]="initialRefs" and
 * (referencesChange)="onRefsChange($event)", and in this handler you would
 * just call references.setValue(refs). This is required to avoid a
 * recursive update (setting references would trigger referencesChange, which
 * in turn would trigger setting references again, and so on), and is due
 * to the fact that this component has no "save" action, but automatically
 * emits changes a few milliseconds after they happen.
 */
@Component({
  selector: 'cadmus-refs-doc-references',
  templateUrl: './doc-references.component.html',
  styleUrls: ['./doc-references.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    CadmusCoreModule,
  ],
})
export class DocReferencesComponent implements AfterViewInit, OnDestroy {
  private _references: DocReference[];
  private _updatingForm: boolean | undefined;
  private _authorSubscription: Subscription | undefined;
  private _refSubs: Subscription[];

  @ViewChildren('author') authorQueryList: QueryList<any> | undefined;

  /**
   * The references.
   */
  public readonly references = input<DocReference[]>([]);

  // doc-reference-types
  public readonly typeEntries = input<ThesaurusEntry[]>();

  // doc-reference-tags
  public readonly tagEntries = input<ThesaurusEntry[]>();

  /**
   * Emitted whenever any reference changes.
   */
  public readonly referencesChange = output<DocReference[]>();

  public refsArr: FormArray;
  public form: FormGroup;

  constructor(private _formBuilder: FormBuilder) {
    this._refSubs = [];
    this._references = [];
    // form
    this.refsArr = _formBuilder.array([]);
    this.form = _formBuilder.group({
      refsArr: this.refsArr,
    });

    // when references change, update form
    effect(() => {
      this.updateForm(this.references());
    });
  }

  public ngAfterViewInit(): void {
    // focus on newly added author
    this._authorSubscription = this.authorQueryList?.changes
      .pipe(debounceTime(300))
      .subscribe((lst: QueryList<any>) => {
        if (!this._updatingForm && lst.length > 0) {
          lst.last.nativeElement.focus();
        }
      });
  }

  private unsubscribeIds(): void {
    for (let i = 0; i < this._refSubs.length; i++) {
      this._refSubs[i].unsubscribe();
    }
  }

  public ngOnDestroy(): void {
    this.unsubscribeIds();
    this._authorSubscription?.unsubscribe();
  }

  // #region Authors
  private getReferenceGroup(reference?: DocReference): FormGroup {
    return this._formBuilder.group({
      type: this._formBuilder.control(
        reference?.type,
        Validators.maxLength(50)
      ),
      tag: this._formBuilder.control(reference?.tag, [
        Validators.maxLength(50),
      ]),
      citation: this._formBuilder.control(reference?.citation, [
        Validators.required,
        Validators.maxLength(100),
      ]),
      note: this._formBuilder.control(reference?.note, [
        Validators.maxLength(300),
      ]),
    });
  }

  public addReference(reference?: DocReference): void {
    const g = this.getReferenceGroup(reference);
    this._refSubs.push(
      g.valueChanges.pipe(debounceTime(300)).subscribe((_) => {
        this.emitReferencesChange();
      })
    );
    this.refsArr.push(g);

    if (!this._updatingForm) {
      this.emitReferencesChange();
    }
  }

  public removeReference(index: number): void {
    this._refSubs[index].unsubscribe();
    this._refSubs.splice(index, 1);
    this.refsArr.removeAt(index);
    this.emitReferencesChange();
  }

  private swapArrElems(a: any[], i: number, j: number): void {
    if (i === j) {
      return;
    }
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }

  public moveReferenceUp(index: number): void {
    if (index < 1) {
      return;
    }
    const ctl = this.refsArr.controls[index];
    this.refsArr.removeAt(index);
    this.refsArr.insert(index - 1, ctl);

    this.swapArrElems(this._refSubs, index, index - 1);

    this.emitReferencesChange();
  }

  public moveReferenceDown(index: number): void {
    if (index + 1 >= this.refsArr.length) {
      return;
    }
    const ctl = this.refsArr.controls[index];
    this.refsArr.removeAt(index);
    this.refsArr.insert(index + 1, ctl);

    this.swapArrElems(this._refSubs, index, index + 1);

    this.emitReferencesChange();
  }

  public clearReferences(): void {
    this.refsArr.clear();
    this.unsubscribeIds();
    this._refSubs = [];
    if (!this._updatingForm) {
      this.emitReferencesChange();
    }
  }
  // #endregion

  protected updateForm(value: DocReference[]): void {
    if (!this.refsArr) {
      return;
    }
    this._updatingForm = true;
    this.clearReferences();

    if (!value) {
      this.form.reset();
    } else {
      for (const r of value) {
        this.addReference(r);
      }
      this.form.markAsPristine();
    }
    this._updatingForm = false;
    // this.emitReferencesChange();
  }

  protected getReferences(): DocReference[] {
    const references: DocReference[] = [];

    for (let i = 0; i < this.refsArr.length; i++) {
      const g = this.refsArr.controls[i] as FormGroup;
      references.push({
        type: g.controls['type'].value?.trim(),
        tag: g.controls['tag'].value?.trim(),
        citation: g.controls['citation']?.value?.trim(),
        note: g.controls['note'].value?.trim(),
      });
    }

    return references;
  }

  public emitReferencesChange(): void {
    this._references = this.getReferences();
    this.referencesChange.emit(this._references);
  }
}
