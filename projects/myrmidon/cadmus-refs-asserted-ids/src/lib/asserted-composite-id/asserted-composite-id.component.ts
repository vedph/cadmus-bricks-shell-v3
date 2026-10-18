import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  FormField,
  form,
  maxLength,
  required,
} from '@angular/forms/signals';
import { of } from 'rxjs';
import { catchError, debounceTime, map, switchMap } from 'rxjs/operators';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';

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
import { ThesaurusService } from '@myrmidon/cadmus-api';
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
import { FeatureOption, TaxoStorePicker } from '@myrmidon/taxo-store-picker';

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
  /**
   * True to show a top-level nodes filter, restricting lookup to the
   * descendants of the selected top-level node. Default is false.
   */
  hasTopNodeFilter?: boolean;
  /**
   * True to show a features filter, restricting lookup to the nodes
   * matching the selected feature options. This is effective only when
   * availableFeatures is not empty. Default is false.
   */
  hasFeaturesFilter?: boolean;
  /**
   * The feature options available to the features filter.
   */
  availableFeatures?: FeatureOption[];
  canEdit?: boolean;
  canAdd?: boolean;
  canDelete?: boolean;
  hideLoc?: boolean;
  hideFilter?: boolean;
}

/**
 * Settings for the asserted composite ID editor.
 */
export interface AssertedCompositeIdTagSettings {
  /**
   * The IDs of the lookup providers that should be hidden in the UI.
   * The ID of a lookup provider is the ID of its service
   * (RefLookupConfig.service.id).
   */
  hiddenLookupProviderIds?: string[];
  /**
   * The IDs of the taxonomy trees that should be hidden in the UI
   * (TaxoStoreLookupConfig.treeId).
   */
  hiddenTaxoTreeIds?: string[];
  /**
   * A map between provider IDs (for both lookup providers and taxonomy trees)
   * and the corresponding thesaurus to be used for ID tags. This allows
   * to conditionally load the appropriate thesaurus for each provider.
   * When the currently selected source has no entry in this map, or its
   * thesaurus is empty or not found, the tag falls back to idTagEntries.
   */
  tagThesaurusMap?: { [providerId: string]: string };
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

interface AssertedCompositeIdControls {
  target: PinTarget | null;
  scope: string;
  tag: string;
  features: string[];
  note: string;
  assertion: Assertion | null;
}

/** Map a bound composite ID to the editable draft shape. */
function toDraft(
  id: AssertedCompositeId | undefined,
): AssertedCompositeIdControls {
  return !id
    ? makeDefaultDraft()
    : {
        target: id.target,
        scope: id.scope || '',
        tag: id.tag || '',
        features: id.features || [],
        note: id.note || '',
        assertion: id.assertion || null,
      };
}

function makeDefaultDraft(): AssertedCompositeIdControls {
  return {
    target: null,
    scope: '',
    tag: '',
    features: [],
    note: '',
    assertion: null,
  };
}

/**
 * An asserted composite ID editor. This allows the user to edit an asserted
 * composite ID, which can be an external ID, a lookup ID or a taxonomy ID.
 */
@Component({
  selector: 'cadmus-refs-asserted-composite-id',
  templateUrl: './asserted-composite-id.component.html',
  styleUrls: ['./asserted-composite-id.component.css'],
  imports: [
    FormField,
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
  // true while the effect below re-derives target mode from a newly bound
  // id, so that a child lookup-set echoing a config change during that
  // window is not mistaken for a user pick
  private _updatingForm: boolean | undefined;
  // true once the user has changed the lookup source after the id was
  // bound, so that a tag picked for the previous source can be dropped
  // when it does not belong to the tags of the new one
  private _sourceChanged = false;
  // the bound id the target source mode was last derived from (wrapped,
  // as undefined is a legit bound value): the mode is derived only once
  // per bound id, so that a source picked by the user is not overridden
  // when resetting the target brings the draft back in sync with an id
  // whose target is still empty (as for a newly added id)
  private _modeOf?: { id: AssertedCompositeId | undefined };
  // the external lookup item last picked by the user with its provider ID
  private _extPick?: { gid: string; sourceId: string };
  private readonly _thesService = inject(ThesaurusService);

  /**
   * The tag-related settings: lookup sources to hide, and thesauri to
   * be used for the tag according to the selected lookup source.
   */
  public readonly tagSettings = input<AssertedCompositeIdTagSettings>();

  /**
   * All the configured external lookup configurations.
   */
  public readonly extLookupConfigs = signal<RefLookupConfig[]>([]);
  public readonly targetExpanded = signal<boolean>(false);

  /**
   * The external lookup configurations except those hidden by settings.
   */
  public readonly visibleExtLookupConfigs = computed<RefLookupConfig[]>(() => {
    const hidden = this.tagSettings()?.hiddenLookupProviderIds;
    const configs = this.extLookupConfigs();
    return hidden?.length
      ? configs.filter((c) => !c.service?.id || !hidden.includes(c.service.id))
      : configs;
  });

  /**
   * All the configured taxonomy lookup configurations, if any.
   */
  public readonly taxoLookupConfigs = signal<TaxoStoreLookupConfig[]>([]);

  /**
   * The taxonomy lookup configurations except those hidden by settings.
   */
  public readonly visibleTaxoLookupConfigs = computed<TaxoStoreLookupConfig[]>(
    () => {
      const hidden = this.tagSettings()?.hiddenTaxoTreeIds;
      const configs = this.taxoLookupConfigs();
      return hidden?.length
        ? configs.filter((c) => !hidden.includes(c.treeId))
        : configs;
    },
  );

  /**
   * True if at least 1 visible taxonomy lookup configuration is available,
   * so that the taxonomy source mode can be selected.
   */
  public readonly hasTaxonomy = computed(
    () => this.visibleTaxoLookupConfigs().length > 0,
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

  /**
   * The ID of the external lookup provider selected by the user or
   * implied by the scope of the bound id, if any.
   */
  public readonly selectedExtProviderId = signal<string | undefined>(
    undefined,
  );

  /**
   * The ID of the external lookup provider currently selected: this is
   * selectedExtProviderId when it refers to a visible provider, else the
   * first visible provider, which is the one selected by default.
   */
  public readonly extProviderId = computed<string | undefined>(() => {
    const configs = this.visibleExtLookupConfigs();
    const id = this.selectedExtProviderId();
    return (
      (id ? configs.find((c) => c.service?.id === id) : undefined) ||
      configs[0]
    )?.service?.id;
  });

  /**
   * The ID of the currently selected lookup source: the lookup provider
   * ID in external mode, or the tree ID in taxonomy mode.
   */
  public readonly tagSourceId = computed<string | undefined>(() => {
    switch (this.targetMode()) {
      case 'taxonomy':
        return this.selectedTaxoConfig()?.treeId;
      case 'external':
        return this.extProviderId();
      default:
        return undefined;
    }
  });

  /**
   * The ID of the thesaurus mapped to the currently selected lookup
   * source for its tags, if any.
   */
  public readonly tagThesaurusId = computed<string | undefined>(() => {
    const id = this.tagSourceId();
    return id ? this.tagSettings()?.tagThesaurusMap?.[id] : undefined;
  });

  private readonly _mappedTagEntries = toSignal(
    toObservable(this.tagThesaurusId).pipe(
      switchMap((id) =>
        id
          ? this._thesService.getThesaurus(id, true).pipe(
              map((t) => t?.entries),
              catchError(() => of(undefined)),
            )
          : of(undefined),
      ),
    ),
  );

  // form
  /**
   * The editable draft, derived from `id` but writable in place.
   * `previous` tells an external change apart from the echo of our own
   * save: when the incoming id is just what the current draft maps to, the
   * draft is already up to date and keeping it preserves in-progress edits
   * that saving normalizes away.
   */
  private readonly _draft = linkedSignal<
    AssertedCompositeId | undefined,
    AssertedCompositeIdControls
  >({
    source: () => this.id(),
    computation: (id, previous) =>
      previous &&
      JSON.stringify(id) === JSON.stringify(this.getId(previous.value))
        ? previous.value
        : toDraft(id),
  });

  public readonly form = form(this._draft, (path) => {
    required(path.target);
    maxLength(path.scope, 500);
    maxLength(path.tag, 50);
    maxLength(path.note, 1000);
  });

  // asserted-id-scopes
  public readonly idScopeEntries = input<ThesaurusEntry[]>();
  // asserted-id-tags
  public readonly idTagEntries = input<ThesaurusEntry[]>();

  /**
   * The entries used for the tag: those from the thesaurus mapped to the
   * currently selected lookup source if any, else idTagEntries.
   */
  public readonly tagEntries = computed<ThesaurusEntry[] | undefined>(() => {
    const entries = this._mappedTagEntries();
    return entries?.length ? entries : this.idTagEntries();
  });
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
    const features = this.form.features().value();
    const entries = this.featureEntries();
    if (!features || features.length === 0 || !entries) {
      return [];
    }
    return entries.filter((e) => features.includes(e.id));
  });

  constructor(
    public lookupService: PinRefLookupService,
    @Inject('indexLookupDefinitions')
    public lookupDefs: IndexLookupDefinitions,
    settings: RamStorageService,
  ) {
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

    // the draft mirrors the bound id again: no unsaved edits, so re-derive
    // the target source mode from it and clear the interaction state
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (!this.isDraftInSync(draft)) {
          return;
        }
        this._updatingForm = true;
        try {
          const id = this.id();
          if (!this._modeOf || this._modeOf.id !== id) {
            this._modeOf = { id };
            if (!id) {
              this.targetMode.set('internal');
              this.selectedTaxoConfig.set(undefined);
            } else {
              this.updateTargetMode(id.target);
            }
            // a scope equal to the ID of a lookup provider tells which
            // provider the external target comes from
            if (this.targetMode() === 'external') {
              const config = this.visibleExtLookupConfigs().find(
                (c) => c.service?.id && c.service.id === id?.scope,
              );
              if (config) {
                this.selectedExtProviderId.set(config.service!.id);
              }
            }
          }
          this._sourceChanged = false;
          this.form().reset();
        } finally {
          this._updatingForm = false;
        }
      });
    });

    // when the user changes the lookup source and thus the tag entries,
    // drop a tag which is not among them
    effect(() => {
      const entries = this.tagEntries();
      untracked(() => {
        const tag = this._draft().tag;
        if (!this._sourceChanged || !tag || !entries?.length) {
          return;
        }
        if (!entries.some((e) => e.id === tag)) {
          this._draft.update((v) => ({ ...v, tag: '' }));
          this.form.tag().markAsDirty();
        }
      });
    });

    // when form changes, emit id change - but never while the draft still
    // mirrors what is bound, and never for a target the user has not
    // picked yet (resetTarget() empties the gid when the source mode
    // changes, and a composite id without a target is not worth emitting)
    toObservable(this._draft)
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => {
        const draft = this._draft();
        if (this._updatingForm || this.form().invalid()) {
          return;
        }
        if (!draft.target?.gid || this.isDraftInSync(draft)) {
          return;
        }
        this.emitIdChange();
      });
  }

  public onEntriesChange(entries: ThesaurusEntry[]): void {
    const ids = entries.map((e) => e.id);
    this._draft.update((v) => ({ ...v, features: ids }));
    this.form.features().markAsDirty();
  }

  public onAssertionChange(assertion: Assertion | undefined): void {
    this._draft.update((v) => ({ ...v, assertion: assertion || null }));
  }

  public onTargetChange(target?: PinTarget): void {
    // an external target picked from lookup gets its provider ID as scope
    const pick = this._extPick;
    this.setTarget(
      target,
      pick && !target?.name && target?.gid === pick.gid
        ? pick.sourceId
        : undefined,
    );
  }

  /**
   * Set the target, and when it was picked from a lookup source also
   * set the scope to the ID of that source, whatever its current value.
   */
  private setTarget(target?: PinTarget, sourceId?: string): void {
    this._draft.update((v) => ({
      ...v,
      target: target!,
      scope: sourceId || v.scope,
    }));
    this.form.target().markAsDirty();
    if (sourceId) {
      this.form.scope().markAsDirty();
    }
    if (this.form().valid()) {
      this.targetExpanded.set(false);
    }
  }

  /**
   * Reset the target to an empty value without collapsing the target
   * panel. This is used when switching source mode, as opposed to
   * onTargetChange, which is used when the user has actually picked a
   * target and the panel can be collapsed. Never called from within a
   * tracked effect, so reading _draft() directly here is safe.
   */
  private resetTarget(): void {
    this._extPick = undefined;
    this._draft.update((v) => ({ ...v, target: { gid: '', label: '' } }));
    this.form.target().markAsDirty();
  }

  /** True when the draft still mirrors the bound id. */
  private isDraftInSync(draft: AssertedCompositeIdControls): boolean {
    return JSON.stringify(draft) === JSON.stringify(toDraft(this.id()));
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
      // the tree of an existing target is used even when hidden
      const visible = this.visibleTaxoLookupConfigs();
      const matches = (c: TaxoStoreLookupConfig) =>
        c.treeId.replace(/\s+/g, '_') === treeIdPart;
      this.selectedTaxoConfig.set(
        visible.find(matches) ||
          this.taxoLookupConfigs().find(matches) ||
          visible[0],
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
    this._sourceChanged = true;

    if (mode === 'taxonomy') {
      if (!this.selectedTaxoConfig()) {
        this.selectedTaxoConfig.set(this.visibleTaxoLookupConfigs()[0]);
      }
      // a target from another mode is not a taxonomy target: reset it
      if (!untracked(() => this._draft().target?.gid?.startsWith(TAXONOMY_GID_PREFIX))) {
        this.resetTarget();
      }
    } else {
      this.selectedTaxoConfig.set(undefined);
      // a taxonomy target is not valid for internal/external mode: reset it
      if (untracked(() => this._draft().target?.gid?.startsWith(TAXONOMY_GID_PREFIX))) {
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
    this._sourceChanged = true;
    // the previously picked node belongs to another tree: reset target
    if (untracked(() => this._draft().target?.gid?.startsWith(TAXONOMY_GID_PREFIX))) {
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
    this.setTarget(
      {
        gid: `${TAXONOMY_GID_PREFIX}${treeIdPart}/${node.key}`,
        label: node.label,
      },
      config.treeId,
    );
  }

  private getId(
    draft: AssertedCompositeIdControls = this._draft(),
  ): AssertedCompositeId {
    const v = draft;
    const external = !v.target?.name;
    const target = v.target;
    return {
      target: external
        ? {
            gid: target?.gid || '',
            label: target?.label || target?.gid || '',
          }
        : target!,
      scope: v.scope.trim() || '',
      tag: v.tag.trim() || undefined,
      features: v.features?.length ? v.features : undefined,
      note: v.note.trim() || undefined,
      assertion: v.assertion || undefined,
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

  /**
   * Called when the user picks an item from an external lookup. The item
   * becomes the target only when the user confirms it, so here we just
   * record it with its provider.
   */
  public onExtItemPick(event: RefLookupSetEvent): void {
    const sourceId = event.config?.service?.id;
    this._extPick =
      sourceId && event.itemId ? { gid: event.itemId, sourceId } : undefined;
  }

  public onExtLookupConfigChange(config: RefLookupConfig): void {
    if (this._updatingForm) {
      return;
    }
    this.selectedExtProviderId.set(config.service?.id);
    this._sourceChanged = true;

    // update scope if external lookup config is selected - untracked():
    // this method is wired to a child component output, but is reached
    // indirectly enough from change detection that it's cheap insurance
    // against the same tracked-read-plus-write hazard documented for
    // updateForm()/resetTarget() above.
    const v = untracked(() => this._draft());
    const external = !v.target?.name;
    if (this._updatingForm || !external) {
      return;
    }
    if (
      !v.scope ||
      this.extLookupConfigs().some(
        (c) => c.service?.id === v.scope || c.name === v.scope,
      )
    ) {
      this._draft.update((d) => ({ ...d, scope: config.service?.id || '' }));
      this.form.scope().markAsDirty();
    }
  }

  public cancel(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form().valid()) {
      this.id.set(this.getId());
    }
  }

}
