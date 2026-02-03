import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';
import {
  BiblissimaCandidate,
  BiblissimaExtendResponse,
  BiblissimaLanguage,
  BiblissimaRefLookupOptions,
  BiblissimaRefLookupService,
  BiblissimaService,
  BiblissimaSuggestItem,
} from '@myrmidon/cadmus-refs-biblissima-lookup';

@Component({
  selector: 'app-biblissima-ref-lookup-pg',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    RefLookupComponent,
  ],
  templateUrl: './biblissima-ref-lookup-pg.html',
  styleUrl: './biblissima-ref-lookup-pg.scss',
})
export class BiblissimaRefLookupPg {
  // Lookup component
  public item?: BiblissimaCandidate;
  public lookupOptions: BiblissimaRefLookupOptions = {};

  // Reconciliation form
  public reconcileForm: FormGroup;
  public reconcileQuery: FormControl<string | null>;
  public reconcileType: FormControl<string | null>;
  public reconcileLimit: FormControl<number>;
  public reconcileLanguage: FormControl<BiblissimaLanguage>;
  public reconcileProperties: FormArray;
  public reconcileResult: BiblissimaCandidate[] | undefined;
  public reconciling = false;

  // Suggest form
  public suggestForm: FormGroup;
  public suggestPrefix: FormControl<string | null>;
  public suggestLanguage: FormControl<BiblissimaLanguage>;
  public suggestEndpoint: FormControl<string>;
  public suggestResult: BiblissimaSuggestItem[] | undefined;
  public suggesting = false;

  // Extend form
  public extendForm: FormGroup;
  public extendIds: FormControl<string | null>;
  public extendProperties: FormControl<string | null>;
  public extendLanguage: FormControl<BiblissimaLanguage>;
  public extendResult: BiblissimaExtendResponse | undefined;
  public extending = false;

  constructor(
    private _formBuilder: FormBuilder,
    public lookupService: BiblissimaRefLookupService,
    private _biblissima: BiblissimaService,
  ) {
    // Reconciliation form
    this.reconcileQuery = _formBuilder.control(null, Validators.required);
    this.reconcileType = _formBuilder.control(null);
    this.reconcileLimit = _formBuilder.control(10, { nonNullable: true });
    this.reconcileLanguage = _formBuilder.control<BiblissimaLanguage>('en', {
      nonNullable: true,
    });
    this.reconcileProperties = _formBuilder.array([]);
    this.reconcileForm = _formBuilder.group({
      query: this.reconcileQuery,
      type: this.reconcileType,
      limit: this.reconcileLimit,
      language: this.reconcileLanguage,
      properties: this.reconcileProperties,
    });

    // Suggest form
    this.suggestPrefix = _formBuilder.control(null, Validators.required);
    this.suggestLanguage = _formBuilder.control<BiblissimaLanguage>('en', {
      nonNullable: true,
    });
    this.suggestEndpoint = _formBuilder.control('entity', {
      nonNullable: true,
    });
    this.suggestForm = _formBuilder.group({
      prefix: this.suggestPrefix,
      language: this.suggestLanguage,
      endpoint: this.suggestEndpoint,
    });

    // Extend form
    this.extendIds = _formBuilder.control(null, Validators.required);
    this.extendProperties = _formBuilder.control(null, Validators.required);
    this.extendLanguage = _formBuilder.control<BiblissimaLanguage>('en', {
      nonNullable: true,
    });
    this.extendForm = _formBuilder.group({
      ids: this.extendIds,
      properties: this.extendProperties,
      language: this.extendLanguage,
    });
  }

  // Lookup component handlers
  public onItemChange(item: any): void {
    this.item = item;
  }

  public onMoreRequest(): void {
    alert('More...');
  }

  // Property constraints management
  public addProperty(): void {
    const group = this._formBuilder.group({
      pid: ['', Validators.required],
      v: ['', Validators.required],
    });
    this.reconcileProperties.push(group);
  }

  public removeProperty(index: number): void {
    this.reconcileProperties.removeAt(index);
  }

  // Reconciliation
  public reconcile(): void {
    if (this.reconcileForm.invalid || this.reconciling) {
      return;
    }

    this.reconciling = true;
    this.reconcileResult = undefined;

    const properties = this.reconcileProperties.controls.map((ctrl) => ({
      pid: ctrl.get('pid')?.value || '',
      v: ctrl.get('v')?.value || '',
    }));

    this._biblissima
      .reconcile(
        {
          query: this.reconcileQuery.value!,
          type: this.reconcileType.value || undefined,
          limit: this.reconcileLimit.value,
          properties: properties.length ? properties : undefined,
        },
        { language: this.reconcileLanguage.value },
      )
      .subscribe({
        next: (result) => {
          this.reconcileResult = result;
          this.reconciling = false;
        },
        error: (error) => {
          console.error('Reconciliation error:', error);
          this.reconciling = false;
        },
      });
  }

  // Suggest
  public suggest(): void {
    if (this.suggestForm.invalid || this.suggesting) {
      return;
    }

    this.suggesting = true;
    this.suggestResult = undefined;

    const options = { language: this.suggestLanguage.value };
    const prefix = this.suggestPrefix.value!;

    let observable;
    switch (this.suggestEndpoint.value) {
      case 'property':
        observable = this._biblissima.suggestProperties(prefix, options);
        break;
      case 'type':
        observable = this._biblissima.suggestTypes(prefix, options);
        break;
      default:
        observable = this._biblissima.suggestEntities(prefix, options);
    }

    observable.subscribe({
      next: (result) => {
        this.suggestResult = result;
        this.suggesting = false;
      },
      error: (error) => {
        console.error('Suggest error:', error);
        this.suggesting = false;
      },
    });
  }

  // Extend
  public extend(): void {
    if (this.extendForm.invalid || this.extending) {
      return;
    }

    this.extending = true;
    this.extendResult = undefined;

    const ids = this.extendIds
      .value!.split(',')
      .map((id) => id.trim())
      .filter((id) => id);

    const properties = this.extendProperties
      .value!.split(',')
      .map((p) => p.trim())
      .filter((p) => p)
      .map((id) => ({ id }));

    this._biblissima
      .extend({ ids, properties }, { language: this.extendLanguage.value })
      .subscribe({
        next: (result) => {
          this.extendResult = result;
          this.extending = false;
        },
        error: (error) => {
          console.error('Extend error:', error);
          this.extending = false;
        },
      });
  }
}
