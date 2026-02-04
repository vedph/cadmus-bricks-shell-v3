import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  OnDestroy,
  QueryList,
  signal,
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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LookupProviderOptions } from '@myrmidon/cadmus-refs-lookup';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { Assertion, AssertionComponent } from '@myrmidon/cadmus-refs-assertion';

/**
 * A generic ID referred to an external resource.
 */
export interface ExternalId {
  value: string;
  scope?: string;
  tag?: string;
  assertion?: Assertion;
}

/**
 * An external ID plus a rank.
 */
export interface RankedExternalId extends ExternalId {
  rank?: number;
}

@Component({
  selector: 'cadmus-refs-external-ids',
  templateUrl: './external-ids.component.html',
  styleUrls: ['./external-ids.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    AssertionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExternalIdsComponent implements OnDestroy {
  private _idSubscription: Subscription | undefined;
  private _idsSubs: Subscription[];
  private _updatingForm: boolean | undefined;

  @ViewChildren('id') idQueryList: QueryList<any> | undefined;

  /**
   * The external IDs.
   */
  public readonly ids = model<RankedExternalId[]>([]);

  /**
   * Optional preset options for lookup providers.
   * Maps provider IDs to their available scopes.
   */
  public readonly lookupProviderOptions = input<LookupProviderOptions>();

  /**
   * The ID scopes thesaurus entries.
   */
  public readonly scopeEntries = input<ThesaurusEntry[]>();

  /**
   * The ID tags thesaurus entries.
   */
  public readonly tagEntries = input<ThesaurusEntry[]>();

  // assertion-tags
  public readonly assTagEntries = input<ThesaurusEntry[]>();
  // doc-reference-types
  public readonly refTypeEntries = input<ThesaurusEntry[]>();
  // doc-reference-tags
  public readonly refTagEntries = input<ThesaurusEntry[]>();

  public idsArr: FormArray;
  public form: FormGroup;

  // edited assertion
  public readonly assEdOpen = signal<boolean>(false);
  public readonly assertionNr = signal<number>(0);
  public readonly assertion = signal<Assertion | undefined>(undefined);

  constructor(private _formBuilder: FormBuilder) {
    this._idsSubs = [];
    // form
    this.idsArr = _formBuilder.array([]);
    this.form = _formBuilder.group({
      idsArr: this.idsArr,
    });

    // when ids change, update form
    effect(() => {
      this.updateForm(this.ids());
    });
  }

  public ngAfterViewInit(): void {
    // focus on newly added ID
    this._idSubscription = this.idQueryList?.changes
      .pipe(debounceTime(300))
      .subscribe((lst: QueryList<any>) => {
        if (!this._updatingForm && lst.length > 0) {
          lst.last.nativeElement.focus();
        }
      });
  }

  private unsubscribeIds(): void {
    for (let i = 0; i < this._idsSubs.length; i++) {
      this._idsSubs[i].unsubscribe();
    }
  }

  public ngOnDestroy(): void {
    this.unsubscribeIds();
    this._idSubscription?.unsubscribe();
  }

  private getIdGroup(id?: RankedExternalId): FormGroup {
    return this._formBuilder.group({
      value: this._formBuilder.control(id?.value, [
        Validators.required,
        Validators.maxLength(500),
      ]),
      scope: this._formBuilder.control(id?.scope, Validators.maxLength(50)),
      tag: this._formBuilder.control(id?.tag, Validators.maxLength(50)),
      rank: this._formBuilder.control(id?.rank),
      assertion: this._formBuilder.control(id?.assertion),
    });
  }

  public addId(id?: RankedExternalId): void {
    const g = this.getIdGroup(id);
    this._idsSubs.push(
      g.valueChanges.pipe(debounceTime(300)).subscribe((_) => {
        this.emitIdsChange();
      }),
    );
    this.idsArr.push(g);
    if (!this._updatingForm) {
      this.emitIdsChange();
    }
  }

  public removeId(index: number): void {
    this.closeAssertion();
    this._idsSubs[index].unsubscribe();
    this._idsSubs.splice(index, 1);
    this.idsArr.removeAt(index);
    this.emitIdsChange();
  }

  private swapArrElems(a: any[], i: number, j: number): void {
    if (i === j) {
      return;
    }
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }

  public moveIdUp(index: number): void {
    if (index < 1) {
      return;
    }
    this.closeAssertion();
    const ctl = this.idsArr.controls[index];
    this.idsArr.removeAt(index);
    this.idsArr.insert(index - 1, ctl);

    this.swapArrElems(this._idsSubs, index, index - 1);

    this.emitIdsChange();
  }

  public moveIdDown(index: number): void {
    if (index + 1 >= this.idsArr.length) {
      return;
    }
    this.closeAssertion();
    const item = this.idsArr.controls[index];
    this.idsArr.removeAt(index);
    this.idsArr.insert(index + 1, item);

    this.swapArrElems(this._idsSubs, index, index + 1);

    this.emitIdsChange();
  }

  public clearIds(): void {
    this.closeAssertion();
    this.idsArr.clear();
    this.unsubscribeIds();
    this._idsSubs = [];
    if (!this._updatingForm) {
      this.emitIdsChange();
    }
  }

  public editAssertion(index: number): void {
    // save the currently edited assertion if any
    this.saveAssertion();
    // edit the new assertion
    this.assertion.set(
      (this.idsArr.at(index) as FormGroup).controls['assertion'].value,
    );
    this.assertionNr.set(index + 1);
    this.assEdOpen.set(true);
  }

  public onAssertionChange(assertion: Assertion | undefined): void {
    this.assertion.set(assertion);
  }

  public saveAssertion(): void {
    // save the currently edited assertion if any
    if (this.assertionNr) {
      const g = this.idsArr.at(this.assertionNr()! - 1) as FormGroup;
      g.controls['assertion'].setValue(this.assertion());
      this.closeAssertion();
      this.emitIdsChange();
    }
  }

  private closeAssertion(): void {
    if (this.assertionNr) {
      this.assEdOpen.set(false);
      this.assertionNr.set(0);
      this.assertion.set(undefined);
    }
  }

  private updateForm(ids: RankedExternalId[]): void {
    if (!this.idsArr) {
      return;
    }
    this._updatingForm = true;
    this.clearIds();

    if (!ids) {
      this.form.reset();
    } else {
      for (const id of ids) {
        this.addId(id);
      }
      this.form.markAsPristine();
    }
    this._updatingForm = false;
    this.emitIdsChange();
  }

  private getIds(): RankedExternalId[] {
    const ids: RankedExternalId[] = [];
    for (let i = 0; i < this.idsArr.length; i++) {
      const g = this.idsArr.controls[i] as FormGroup;
      ids.push({
        value: g.controls['value'].value?.trim(),
        scope: g.controls['scope'].value?.trim(),
        tag: g.controls['tag'].value?.trim(),
        assertion: g.controls['assertion'].value,
      });
    }
    return ids;
  }

  private emitIdsChange(): void {
    this.ids.set(this.getIds());
  }
}
