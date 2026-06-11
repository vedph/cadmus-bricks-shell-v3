import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  Inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { debounceTime, filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// material
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

// myrmidon
import { RamStorageService } from '@myrmidon/ngx-tools';

// bricks
import { Assertion, AssertionComponent } from '@myrmidon/cadmus-refs-assertion';

// cadmus
import { IndexLookupDefinitions, ThesaurusEntry } from '@myrmidon/cadmus-core';
import {
  LOOKUP_CONFIGS_KEY,
  LookupProviderOptions,
  RefLookupConfig,
  RefLookupSetEvent,
} from '@myrmidon/cadmus-refs-lookup';
import { ThesaurusEntriesPickerComponent } from '@myrmidon/cadmus-thesaurus-store';

// taxonomy
import { TaxoStoreNode } from '@myrmidon/taxo-store-api';
import { FlagOption, TaxoStorePicker } from '@myrmidon/taxo-store-picker';

// local
import { PinRefLookupService } from '../services/pin-ref-lookup.service';
import {
  PinTarget,
  PinTargetLookupComponent,
} from '../pin-target-lookup/pin-target-lookup.component';

/**
 * The mode used to source the target of an asserted composite ID:
 * - internal: the target points to a pin/item in this database.
 * - external: the target is a free GID/label pair.
 * - taxonomy: the target is picked from a taxonomy tree (TaxoStorePicker).
 */
export type AssertedCompositeIdTargetMode = 'internal' | 'external' | 'taxonomy';

/**
 * The prefix prepended to the GID of any target sourced from a taxonomy
 * tree, so that it can be told apart from a plain external GID when
 * reloading an existing ID.
 */
export const TAXONOMY_GID_PREFIX = '@TX:';

/**
 * The key used to retrieve the taxonomy lookup configurations via
 * RamStorageService.
 */
export const LOOKUP_TAXOSTORE_CONFIGS_KEY =
  'cadmus-refs-asserted-ids.taxostore-configs';

/**
 * Configuration for a taxonomy tree to be used as a lookup source for
 * an asserted composite ID's target.
 */
export interface TaxoStoreLookupConfig {
  /**
   * The ID of the taxonomy tree to pick nodes from.
   */
  treeId: string;
  /**
   * A human-friendly name for this source, used both in the source
   * selector and as the label for the taxonomy lookup component.
   */
  treeName: string;
  hasTopNodeFilter?: boolean;
  hasFlagsFilter?: boolean;
  availableFlags?: FlagOption[];
  canEdit?: boolean;
  canAdd?: boolean;
  canDelete?: boolean;
  hideLoc?: boolean;
  hideFilter?: boolean;
}

/**
 * An asserted composite ID. This can be an external ID, having only the ID value
 * as its target.gid property; or a lookup ID, with a pin-based target.
 * In both cases, we can add a tag, a scope, and an assertion.
 */
export interface AssertedCompositeId {
  target: PinTarget;
  tag?: string;
  features?: string[];
  note?: string;
  scope?: string;
  assertion?: Assertion;
}

/**
 * An asserted composite ID editor. This allows the user to edit an asserted
 * composite ID, which can be an external ID or a lookup ID.
 */
@Component({
  selector: 'cadmus-refs-asserted-composite-id',
  templateUrl: './asserted-composite-id.component.html',
  styleUrls: ['./asserted-composite-id.component.css'],
  imports: [
    ReactiveFormsModule,
    // material
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    // bricks
    AssertionComponent,
    // cadmus
    ThesaurusEntriesPickerComponent,
    // taxonomy
    TaxoStorePicker,
    // local
    PinTargetLookupComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssertedCompositeIdComponent {
  private _updatingForm: boolean | undefined;
  private _lookupConfigDirty = true;

  public readonly extLookupConfigs = signal<RefLookupConfig[]>([]);
  public readonly targetExpanded = signal<boolean>(false);

  /**
   * The taxonomy lookup configurations, if any.
   */
  public readonly taxoLookupConfigs = signal<TaxoStoreLookupConfig[]>([]);

  /**
   * True if at least 1 taxonomy lookup configuration is available, so
   * that the taxonomy source mode can be selected.
   */
  public readonly hasTaxonomy = computed(
    () => this.taxoLookupConfigs().length > 0,
  );

  /**
   * The currently selected target source mode.
   */
  public readonly targetMode = signal<AssertedCompositeIdTargetMode>(
    'internal',
  );

  /**
   * The taxonomy lookup configuration currently selected when
   * targetMode is 'taxonomy'.
   */
  public readonly selectedTaxoConfig = signal<
    TaxoStoreLookupConfig | undefined
  >(undefined);

  // form
  public target: FormControl<PinTarget | null>;
  public scope: FormControl<string | null>;
  public tag: FormControl<string | null>;
  public features: FormControl<string[]>;
  public note: FormControl<string | null>;
  public assertion: FormControl<Assertion | null>;
  public form: FormGroup;

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
  // asserted-id-features
  public readonly featureEntries = input<ThesaurusEntry[]>();

  /**
   * The ID being edited.
   */
  public readonly id = model<AssertedCompositeId>();

  /**
   * True if the UI has a submit button.
   */
  public readonly hasSubmit = input<boolean>();

  /**
   * True when the internal UI preselected mode should be by type rather than
   * by item. User can change mode unless modeSwitching is false.
   */
  public readonly pinByTypeMode = input<boolean>();

  /**
   * True when the user can switch between by-type and by-item mode in
   * the internal UI.
   */
  public readonly canSwitchMode = input<boolean>();

  /**
   * True when the user can edit the target's gid/label for internal targets.
   */
  public readonly canEditTarget = input<boolean>();

  /**
   * The lookup definitions to be used for the by-type lookup in the internal UI.
   * If not specified, the lookup definitions will be got via injection
   * when available; if the injected definitions are empty, the
   * lookup definitions will be built from the model-types thesaurus;
   * if this is not available either, the by-type lookup will be
   * disabled.
   */
  public readonly lookupDefinitions = input<IndexLookupDefinitions>();

  /**
   * Optional preset options for external lookup providers.
   * Maps provider IDs to their available scopes.
   */
  public readonly lookupProviderOptions = input<LookupProviderOptions>();

  /**
   * The default part type key to be used.
   */
  public readonly defaultPartTypeKey = input<string>();

  /**
   * Emitted whenever the user requests to close the editor.
   */
  public readonly editorClose = output();

  /**
   * Emitted when the user requests more.
   */
  public readonly extMoreRequest = output<RefLookupSetEvent>();

  /**
   * The thesaurus entries from featureEntries whose id matches
   * any of the current features.
   */
  public readonly idFeatures = computed<ThesaurusEntry[]>(() => {
    const features = this.features.value;
    const entries = this.featureEntries();
    if (!features || features.length === 0 || !entries) {
      return [];
    }
    return entries.filter((e) => features.includes(e.id));
  });

  constructor(
    formBuilder: FormBuilder,
    public lookupService: PinRefLookupService,
    @Inject('indexLookupDefinitions')
    public lookupDefs: IndexLookupDefinitions,
    settings: RamStorageService,
  ) {
    // form
    this.target = formBuilder.control(null, Validators.required);
    this.scope = formBuilder.control(null, Validators.maxLength(500));
    this.tag = formBuilder.control(null, Validators.maxLength(50));
    this.features = formBuilder.control([], { nonNullable: true });
    this.note = formBuilder.control(null, Validators.maxLength(1000));
    this.assertion = formBuilder.control(null);
    this.form = formBuilder.group({
      target: this.target,
      scope: this.scope,
      tag: this.tag,
      features: this.features,
      note: this.note,
      assertion: this.assertion,
    });

    // external lookup configs
    this.extLookupConfigs.set(
      settings.retrieve<RefLookupConfig[]>(LOOKUP_CONFIGS_KEY) || [],
    );

    // taxonomy lookup configs
    this.taxoLookupConfigs.set(
      settings.retrieve<TaxoStoreLookupConfig[]>(
        LOOKUP_TAXOSTORE_CONFIGS_KEY,
      ) || [],
    );

    // when id changes, update form
    effect(() => {
      const id = this.id();
      this.updateForm(id);
    });

    // when form changes, emit id change
    this.form.valueChanges
      .pipe(
        // react only on user changes, when form is valid
        filter(() => !this._updatingForm && this.form.valid),
        debounceTime(300),
        takeUntilDestroyed(),
      )
      .subscribe((_) => {
        this.emitIdChange();
      });
  }

  public onEntriesChange(entries: ThesaurusEntry[]): void {
    const ids = entries.map((e) => e.id);
    this.features.setValue(ids);
    this.features.markAsDirty();
    this.features.updateValueAndValidity();
  }

  public onAssertionChange(assertion: Assertion | undefined): void {
    this.assertion.setValue(assertion || null);
  }

  public onTargetChange(target?: PinTarget): void {
    this.target.setValue(target!);
    this.target.markAsDirty();
    this.target.updateValueAndValidity();
    if (this.form.valid) {
      this.targetExpanded.set(false);
    }
  }

  /**
   * Reset the target to an empty value without collapsing the target
   * panel. This is used when switching source mode, as opposed to
   * onTargetChange, which is used when the user has actually picked a
   * target and the panel can be collapsed.
   */
  private resetTarget(): void {
    this.target.setValue({ gid: '', label: '' }, { emitEvent: false });
    this.target.markAsDirty();
    this.target.updateValueAndValidity({ emitEvent: false });
  }

  private updateForm(id: AssertedCompositeId | undefined): void {
    this._updatingForm = true;
    if (!id) {
      this.form.reset();
      this.targetMode.set('internal');
      this.selectedTaxoConfig.set(undefined);
    } else {
      this.target.setValue(id.target, { emitEvent: false });
      this.scope.setValue(id.scope || null, { emitEvent: false });
      this.tag.setValue(id.tag || null, { emitEvent: false });
      this.features.setValue(id.features || [], { emitEvent: false });
      this.note.setValue(id.note || null, { emitEvent: false });
      this.assertion.setValue(id.assertion || null, { emitEvent: false });
      this.form.markAsPristine();
      this.updateTargetMode(id.target);
    }
    this._updatingForm = false;
  }

  /**
   * Detect the target source mode from the target itself, and update
   * targetMode and selectedTaxoConfig accordingly.
   */
  private updateTargetMode(target?: PinTarget | null): void {
    // internal targets always have a pin name
    if (target?.name) {
      this.targetMode.set('internal');
      this.selectedTaxoConfig.set(undefined);
      return;
    }

    // taxonomy targets have a GID prefixed by TAXONOMY_GID_PREFIX, followed
    // by the tree ID (with spaces replaced by underscores) and the node key
    if (target?.gid?.startsWith(TAXONOMY_GID_PREFIX)) {
      this.targetMode.set('taxonomy');
      const rest = target.gid.substring(TAXONOMY_GID_PREFIX.length);
      const treeIdPart = rest.split('/', 1)[0];
      const configs = this.taxoLookupConfigs();
      this.selectedTaxoConfig.set(
        configs.find((c) => c.treeId.replace(/\s+/g, '_') === treeIdPart) ||
          configs[0],
      );
      return;
    }

    // anything else is a plain external target
    this.targetMode.set('external');
    this.selectedTaxoConfig.set(undefined);
  }

  /**
   * Called when the user changes the target source mode.
   */
  public onTargetModeChange(mode: AssertedCompositeIdTargetMode): void {
    if (this.targetMode() === mode) {
      return;
    }
    this.targetMode.set(mode);

    if (mode === 'taxonomy') {
      if (!this.selectedTaxoConfig()) {
        this.selectedTaxoConfig.set(this.taxoLookupConfigs()[0]);
      }
      // a target from another mode is not a taxonomy target: reset it
      if (!this.target.value?.gid?.startsWith(TAXONOMY_GID_PREFIX)) {
        this.resetTarget();
      }
    } else {
      this.selectedTaxoConfig.set(undefined);
      // a taxonomy target is not valid for internal/external mode: reset it
      if (this.target.value?.gid?.startsWith(TAXONOMY_GID_PREFIX)) {
        this.resetTarget();
      }
    }
  }

  /**
   * Called when the user changes the taxonomy tree to pick nodes from.
   */
  public onTaxoConfigChange(config: TaxoStoreLookupConfig): void {
    if (this.selectedTaxoConfig() === config) {
      return;
    }
    this.selectedTaxoConfig.set(config);
    // the previously picked node belongs to another tree: reset target
    if (this.target.value?.gid?.startsWith(TAXONOMY_GID_PREFIX)) {
      this.resetTarget();
    }
  }

  /**
   * Called when the user picks a node from the taxonomy picker.
   */
  public onTaxoNodePick(node: TaxoStoreNode | null): void {
    if (!node) {
      return;
    }
    const config = this.selectedTaxoConfig();
    if (!config) {
      return;
    }
    const treeIdPart = config.treeId.replace(/\s+/g, '_');
    this.onTargetChange({
      gid: `${TAXONOMY_GID_PREFIX}${treeIdPart}/${node.key}`,
      label: node.label,
    });
  }

  private getId(): AssertedCompositeId {
    const external = !this.target.value?.name;
    const target = this.target.value;
    return {
      target: external
        ? {
            gid: target?.gid || '',
            label: target?.label || target?.gid || '',
          }
        : target!,
      scope: this.scope.value?.trim() || '',
      tag: this.tag.value?.trim(),
      features: this.features.value?.length ? this.features.value : undefined,
      note: this.note.value?.trim() || undefined,
      assertion: this.assertion.value || undefined,
    };
  }

  public emitIdChange(): void {
    if (!this.hasSubmit()) {
      this.id.set(this.getId());
    }
  }

  public onEditorClose(): void {
    this.targetExpanded.set(false);
  }

  public onExtMoreRequest(event: RefLookupSetEvent): void {
    this.extMoreRequest.emit(event);
  }

  public onExtLookupConfigChange(config: RefLookupConfig): void {
    if (this._lookupConfigDirty || this._updatingForm) {
      this._lookupConfigDirty = false;
      return;
    }

    // update scope if external lookup config is selected
    const external = !this.target.value?.name;
    if (this._updatingForm || !external) {
      return;
    }
    if (
      !this.scope.value ||
      this.extLookupConfigs().some((c) => c.name === this.scope.value)
    ) {
      this.scope.setValue(config.service!.id || null);
      this.scope.markAsDirty();
      this.scope.updateValueAndValidity();
    }
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form.valid) {
      this.id.set(this.getId());
    }
  }
}
