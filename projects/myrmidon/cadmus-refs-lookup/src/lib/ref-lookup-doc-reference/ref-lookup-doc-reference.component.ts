import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  input,
  model,
  OnDestroy,
  output,
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  Citation,
  CitationComponent,
  CitSchemeService,
} from '@myrmidon/cadmus-refs-citation';

import { RamStorageService } from '@myrmidon/ngx-tools';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { ASSERTED_COMPOSITE_ID_CONFIGS_KEY } from '@myrmidon/cadmus-refs-asserted-ids';

import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DocReference } from '@myrmidon/cadmus-refs-doc-references';

import {
  RefLookupConfig,
  RefLookupSetComponent,
} from '../ref-lookup-set/ref-lookup-set.component';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';

/**
 * Document reference editor lookup component.
 */
@Component({
  selector: 'cadmus-ref-lookup-doc-reference',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    RefLookupSetComponent,
    CitationComponent,
  ],
  templateUrl: './ref-lookup-doc-reference.component.html',
  styleUrl: './ref-lookup-doc-reference.component.css',
})
export class LookupDocReferenceComponent implements OnDestroy {
  private _lookupConfig?: RefLookupConfig;
  private _sub?: Subscription;

  /**
   * The list of thesaurus entries for doc-reference-types.
   */
  public readonly typeEntries = input<ThesaurusEntry[]>();

  /**
   * The list of thesaurus entries for doc-reference-tags.
   */
  public readonly tagEntries = input<ThesaurusEntry[]>();

  /**
   * True to disable the lookup set.
   */
  public readonly noLookup = input<boolean>();

  /**
   * True to disable the citation builder.
   */
  public readonly noCitation = input<boolean>();

  /**
   * The reference being edited.
   */
  public readonly reference = model<DocReference>();

  /**
   * The default picker to show when the editor opens.
   */
  public readonly defaultPicker = input<'citation' | 'lookup'>('citation');

  /**
   * Emitted when the user closes the editor.
   */
  public readonly cancel = output<void>();

  public readonly pickerEnabled = computed<boolean>(
    () => !this.noLookup() || !this.noCitation()
  );

  public readonly pickers = computed<string[]>(() => {
    if (this.noLookup() && this.noCitation()) {
      return [];
    }
    if (this.noLookup()) {
      return ['citation'];
    }
    if (this.noCitation()) {
      return ['lookup'];
    }
    return ['citation', 'lookup'];
  });

  public type: FormControl<string | null>;
  public tag: FormControl<string | null>;
  public citation: FormControl<string>;
  public note: FormControl<string | null>;
  public form: FormGroup;

  public pickerExpanded?: boolean;
  public pickerType: FormControl<string>;
  public lookupConfigs: RefLookupConfig[] = [];
  public parsedCitation?: Citation;

  constructor(
    private _schemeService: CitSchemeService,
    settings: RamStorageService,
    formBuilder: FormBuilder
  ) {
    this.type = formBuilder.control(null, Validators.maxLength(50));
    this.tag = formBuilder.control(null, Validators.maxLength(50));
    this.citation = formBuilder.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(300)],
    });
    this.note = formBuilder.control(null, Validators.maxLength(500));
    this.form = formBuilder.group({
      type: this.type,
      tag: this.tag,
      citation: this.citation,
      note: this.note,
    });
    this.pickerType = formBuilder.control(this.defaultPicker(), {
      nonNullable: true,
    });

    this.lookupConfigs =
      settings.retrieve<RefLookupConfig[]>(ASSERTED_COMPOSITE_ID_CONFIGS_KEY) ||
      [];
    this._lookupConfig = this.lookupConfigs.length
      ? this.lookupConfigs[0]
      : undefined;

    // when reference changes, update form
    effect(() => {
      this.updateForm(this.reference());
    });

    // when picker type changes, parse citation if it's citation
    this._sub = this.pickerType.valueChanges
      .pipe(distinctUntilChanged(), debounceTime(300))
      .subscribe((value) => {
        if (value === 'citation' && this.citation.value) {
          this.parseCitation();
        }
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public onLookupConfigChange(config: RefLookupConfig): void {
    this._lookupConfig = config;
  }

  private parseCitation(): void {
    const citation = this._schemeService.parse(
      this.citation.value,
      this._schemeService.getSchemes()[0].id,
      true  // we want empty slots so we can fill them
    );
    if (citation) {
      this.parsedCitation = citation;
    }
  }

  public togglePicker(): void {
    this.pickerExpanded = !this.pickerExpanded;

    // if expanded and picker is citation, parse citation into it
    if (
      this.pickerExpanded &&
      this.pickerType.value === 'citation' &&
      this.citation.value
    ) {
      this.parseCitation();
    }
  }

  public onLookupItemChange(item: any): void {
    if (item?.itemId) {
      this.citation.setValue(item.itemId);
      this.citation.markAsDirty();
      this.citation.updateValueAndValidity();
      this.pickerExpanded = false;
    }
  }

  public onCitationChange(citation?: Citation): void {
    if (
      !citation ||
      !this.pickerExpanded ||
      this.pickerType.value !== 'citation'
    ) {
      return;
    }
    this.citation.setValue(this._schemeService.toString(citation));
    this.citation.markAsDirty();
    this.citation.updateValueAndValidity;
  }

  private updateForm(reference?: DocReference): void {
    if (!reference) {
      this.form.reset();
      return;
    }

    this.type.setValue(reference.type || null);
    this.tag.setValue(reference.tag || null);
    this.citation.setValue(reference.citation);
    this.note.setValue(reference.note || null);
    this.form.markAsPristine();
  }

  private getReference(): DocReference {
    return {
      type: this.type.value?.trim(),
      tag: this.tag.value?.trim(),
      citation: this.citation.value?.trim(),
      note: this.note.value?.trim(),
    };
  }

  public close(): void {
    this.cancel.emit();
  }

  public save(): void {
    this.reference.set(this.getReference());
  }
}
