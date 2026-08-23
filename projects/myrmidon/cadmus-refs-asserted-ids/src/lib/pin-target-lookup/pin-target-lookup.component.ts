import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  Inject,
  input,
  Injector,
  model,
  OnInit,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FieldTree, FormField, form, maxLength, required } from '@angular/forms/signals';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, forkJoin, take } from 'rxjs';

// material
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

// myrmidon
import { FlatLookupPipe } from '@myrmidon/ngx-tools';

// bricks
import {
  LookupProviderOptions,
  RefLookupSetEvent,
  RefLookupComponent,
  RefLookupConfig,
  RefLookupSetComponent,
} from '@myrmidon/cadmus-refs-lookup';

// cadmus
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import {
  DataPinInfo,
  IndexLookupDefinition,
  IndexLookupDefinitions,
  Item,
  Part,
  ThesaurusEntry,
} from '@myrmidon/cadmus-core';

// local
import {
  PinRefLookupFilter,
  PinRefLookupService,
} from '../services/pin-ref-lookup.service';
import { ItemRefLookupService } from '../services/item-ref-lookup.service';

// from Cadmus general parts
const METADATA_PART_ID = 'it.vedph.metadata';
interface MetadataPart extends Part {
  metadata: {
    type?: string;
    name: string;
    value: string;
  }[];
}

/**
 * Pin lookup data used internally by the component.
 */
export interface PinLookupData {
  pin: DataPinInfo;
  item?: Item;
  metaPart?: MetadataPart;
}

/**
 * A pin-based target. This includes pin's name and value, and
 * the item's ID and optional part IDs. The label is a user friendly
 * string representation of the target, while the gid is a globally
 * unique identifier for the target.
 */
export interface PinTarget {
  gid: string;
  label: string;
  itemId?: string;
  partId?: string;
  partTypeId?: string;
  roleId?: string;
  name?: string;
  value?: string;
}

interface PinTargetControls {
  item: Item | null;
  itemPart: Part | null;
  partTypeKey: string | null;
  gid: string;
  label: string;
  byTypeMode: boolean;
  external: boolean;
}

/*
 * Scoped pin-based lookup component. This component provides a list
 * of pin-based searches, with a lookup control. Whenever the user
 * picks a pin value, he gets the details about its item and part, and
 * item's metadata part, if any. He can then use these data to build
 * some EID by variously assembling these components.
 */
@Component({
  selector: 'cadmus-pin-target-lookup',
  templateUrl: './pin-target-lookup.component.html',
  styleUrls: ['./pin-target-lookup.component.css'],
  imports: [
    FormField,
    // material
    ClipboardModule,
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    // myrmidon
    FlatLookupPipe,
    // bricks
    RefLookupComponent,
    RefLookupSetComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PinTargetLookupComponent implements OnInit {
  private _updatingForm = false;
  private _startWithByTypeMode?: boolean;

  /**
   * True when the by-type pin lookup mode is active.
   * User can change mode unless modeSwitching is false.
   */
  public readonly pinByTypeMode = model<boolean>();

  /**
   * True when the user can switch between by-type and by-item mode.
   */
  public readonly canSwitchMode = model<boolean>();
  /**
   * True when the user can edit the target's gid/label for internal
   * targets.
   */
  public readonly canEditTarget = input<boolean>();
  /**
   * The lookup definitions to be used for the by-type lookup. If
   * not specified, the lookup definitions will be got via injection
   * when available; if the injected definitions are empty, the
   * lookup definitions will be built from the model-types thesaurus;
   * if this is not available either, the by-type lookup will be
   * disabled.
   */
  public readonly lookupDefinitions = model<IndexLookupDefinitions>();
  /**
   * The optional configurations for using external lookup services.
   */
  public readonly extLookupConfigs = input<RefLookupConfig[]>([]);

  /**
   * Optional preset options for external lookup providers.
   * Maps provider IDs to their available scopes.
   */
  public readonly lookupProviderOptions = input<LookupProviderOptions>();

  /**
   * The target to be edited.
   */
  public readonly target = model<PinTarget>();

  /**
   * True to hide the internal "external" target source checkbox,
   * letting the parent component fully command the source mode via
   * externalMode.
   */
  public readonly hideTargetSelector = input<boolean>(false);

  /**
   * When set, commands whether the target source is external (true)
   * or internal (false), overriding the internal heuristic based on
   * the target's itemId. Leave unset to let this component decide on
   * its own, as before.
   */
  public readonly externalMode = input<boolean>();

  /**
   * The default value for part type key when the by-type mode is active.
   */
  public readonly defaultPartTypeKey = input<string>();

  /**
   * Emitted when user closes the editor.
   */
  public readonly editorClose = output();

  /**
   * Emitted when the user requests more items from an external lookup.
   */
  public readonly extMoreRequest = output<RefLookupSetEvent>();

  /**
   * Emitted when the user changes the external lookup configuration.
   */
  public readonly extLookupConfigChange = output<RefLookupConfig>();

  public readonly filter = signal<PinRefLookupFilter>({
    text: '',
    limit: 10,
  });
  public readonly pinFilterOptions = signal<IndexLookupDefinition | undefined>(
    undefined
  );
  public readonly lookupData = signal<PinLookupData | undefined>(undefined);
  // by type
  public readonly modelEntries = signal<ThesaurusEntry[]>([]);
  public readonly partTypeKeys = signal<string[]>([]);
  // by item
  public readonly itemParts = signal<Part[]>([]);

  // form
  private readonly _draft = signal<PinTargetControls>({
    item: null,
    itemPart: null,
    partTypeKey: null,
    gid: '',
    label: '',
    byTypeMode: false,
    external: false,
  });
  public readonly form: FieldTree<PinTargetControls>;
  // set by the item-changed watcher right before it silently resets
  // itemPart, and consumed (cleared) the next time the itemPart watcher
  // fires - itemPart becoming null this way (item changed) must not be
  // confused with the user explicitly picking "(any)" (also null); see
  // signal-forms-migration.md for why a synchronous flag can't do this
  // job once toObservable()'s deferred emission is involved.
  private _suppressItemPartWatch = false;
  private readonly _injector = inject(Injector);
  private readonly _destroyRef = inject(DestroyRef);

  constructor(
    @Inject('indexLookupDefinitions')
    private _presetLookupDefs: IndexLookupDefinitions,
    public itemLookupService: ItemRefLookupService,
    public pinLookupService: PinRefLookupService,
    private _itemService: ItemService,
    private _thesService: ThesaurusService,
    private _snackbar: MatSnackBar
  ) {
    this.form = form(this._draft, (path) => {
      required(path.gid);
      maxLength(path.gid, 300);
      // required only when external - replaces the imperative
      // setValidators()/updateValueAndValidity() dance the original ran
      // from a debounced `external` watcher; this is always reactively
      // live instead.
      required(path.label, { when: (ctx) => ctx.valueOf(path.external) });
      maxLength(path.label, 300);
    });

    // when pinByTypeMode changes, adjust form
    effect(() => {
      const pinByTypeMode = this.pinByTypeMode();
      if (!this._updatingForm) {
        if (!untracked(() => this._draft().byTypeMode)) {
          this._startWithByTypeMode = pinByTypeMode;
        } else {
          this._draft.update((v) => ({
            ...v,
            byTypeMode: pinByTypeMode || false,
          }));
        }
      }
    });

    // when target changes, update form
    effect(() => {
      const target = this.target();
      this.updateForm(target);
    });

    // when externalMode is commanded by the parent, sync it to the
    // external form control
    effect(() => {
      const externalMode = this.externalMode();
      if (
        externalMode !== undefined &&
        untracked(() => this._draft().external) !== externalMode
      ) {
        this._draft.update((v) => ({ ...v, external: externalMode }));
        this.form.external().markAsDirty();
      }
    });
  }

  private emitTargetChange(): void {
    if (!this._updatingForm) {
      this.target.set(this.getTarget());
    }
  }

  private forceByItem(): void {
    this.pinByTypeMode.set(false);
    this.canSwitchMode.set(false);
  }

  private setupKeys(): void {
    // use DI presets if no lookup definitions
    if (!this.lookupDefinitions()) {
      this.lookupDefinitions.set(this._presetLookupDefs);
    }
    // keys are all the defined lookup searches
    this.partTypeKeys.set(Object.keys(this.lookupDefinitions()!));

    // if no keys, get them from thesaurus model-types;
    // if this is not available, just force by item mode.
    if (!this.partTypeKeys().length) {
      if (this.modelEntries?.length) {
        // set lookupDefinitions from thesaurus entries
        const defs: IndexLookupDefinitions = {};
        this.modelEntries().forEach((e) => {
          defs[e.value] = {
            name: e.value,
            typeId: e.id,
          };
        });
        this.lookupDefinitions.set(defs);
        // set type keys from thesaurus entries
        this.partTypeKeys.set(this.modelEntries().map((e) => e.value));
      }
    }

    // if still no keys, force by item mode
    if (!this.partTypeKeys().length) {
      this.forceByItem();
    } else {
      // set default key
      this._draft.update((v) => ({
        ...v,
        partTypeKey: this.defaultPartTypeKey() || this.partTypeKeys()[0],
      }));
    }
  }

  public ngOnInit(): void {
    // set start mode if required
    if (this._startWithByTypeMode) {
      this._draft.update((v) => ({ ...v, byTypeMode: true }));
    }

    // whenever item changes (by lookup), update item's parts and filter
    toObservable(this.form.item().value, { injector: this._injector })
      .pipe(distinctUntilChanged(), debounceTime(300), takeUntilDestroyed(this._destroyRef))
      .subscribe((item) => {
        this._suppressItemPartWatch = true;
        this._draft.update((v) => ({ ...v, itemPart: null }));
        this.itemParts.set(item?.parts || []);
        this.filter.set({
          ...this.filter(),
          itemId: item?.id,
        });
      });

    // whenever itemPart changes (by user selection), update target and
    // eventually gid
    toObservable(this.form.itemPart().value, { injector: this._injector })
      .pipe(distinctUntilChanged(), debounceTime(300), takeUntilDestroyed(this._destroyRef))
      .subscribe((part) => {
        const suppress = this._suppressItemPartWatch;
        this._suppressItemPartWatch = false;
        if (suppress) {
          return;
        }
        if (!this.form.gid().value() || !this.form.gid().dirty()) {
          this._draft.update((v) => ({ ...v, gid: this.buildGid() || '' }));
        }
        this.filter.set({
          ...this.filter(),
          partId: part?.id,
        });
        this.updateTarget(true);
      });

    // whenever partTypeKey changes, update filter's options
    toObservable(this.form.partTypeKey().value, { injector: this._injector })
      .pipe(distinctUntilChanged(), debounceTime(300), takeUntilDestroyed(this._destroyRef))
      .subscribe((key) => {
        this.pinFilterOptions.set(
          key ? this.lookupDefinitions()![key] : undefined
        );
      });

    // load model-types thesaurus entries
    this._thesService.getThesaurus('model-types', true).subscribe({
      next: (t) => {
        this.modelEntries.set(t.entries || []);
        if (this.modelEntries()?.length) {
          this.setupKeys();
        } else {
          this.forceByItem();
        }
      },
      error: () => {
        this.forceByItem();
      },
    });
  }

  private buildGid(): string | null {
    // the GID is the part ID if any, or the item ID, followed by
    // slash, pin's name, slash, value (=EID)
    const pin = this.lookupData()?.pin;
    if (!pin?.value) {
      return null;
    }
    return pin.partId
      ? `P${pin.partId}/${pin.name}/${pin.value}`
      : `I${pin.itemId}/${pin.name}/${pin.value}`;
  }

  private buildLabel(): string | null {
    if (!this.lookupData()?.pin) {
      return null;
    }
    const sb: string[] = [];
    // pin value
    if (this.lookupData()?.pin.value) {
      sb.push(this.lookupData()!.pin.value);
      sb.push(' | ');
    }
    // item title
    sb.push(this.lookupData()?.item?.title || this.lookupData()!.pin!.itemId);
    // part type and role
    if (this.lookupData()?.pin?.partTypeId) {
      const e = this.modelEntries()?.find(
        (e) => e.id === this.lookupData()!.pin.partTypeId
      );
      sb.push(' (');
      sb.push(e?.value || this.lookupData()?.pin?.partTypeId!);
      if (this.lookupData()?.pin?.roleId) {
        sb.push(`, ${this.lookupData()?.pin?.roleId}`);
      }
      sb.push(')');
    }
    return sb.join('');
  }

  private getTarget(): PinTarget {
    const v = this._draft();
    if (v.external) {
      return {
        gid: v.gid || '',
        label: v.label || '',
      };
    } else {
      const pin = this.lookupData()?.pin;
      return {
        gid: v.gid || '',
        label: v.label || '',
        itemId: pin?.itemId || '',
        partId: pin?.partId || '',
        partTypeId: pin?.partTypeId || '',
        roleId: pin?.roleId || '',
        name: pin?.name || '',
        value: pin?.value || '',
      };
    }
  }

  private updateTarget(suppressEmit = false): void {
    this._updatingForm = true;

    // untracked(): this can run inside the "target changed" effect's own
    // call stack (via updateForm() -> updateTargetFromData(), or directly
    // from an RxJS callback) - a tracked read here plus the .update()
    // write below would make that effect depend on its own write and
    // re-run indefinitely, same hazard as updateForm()'s reset branch.
    if (!untracked(() => this._draft().external)) {
      this._draft.update((v) => ({
        ...v,
        gid: this.buildGid() || '',
        label: this.buildLabel() || '',
      }));
      this.form.gid().markAsDirty();
      this.form.label().markAsDirty();
    }

    this._updatingForm = false;

    if (!suppressEmit) {
      this.emitTargetChange();
    }
  }

  private updateTargetFromData(): void {
    // Update GID and label without emitting changes - untracked(): see
    // updateTarget() above for why.
    if (!untracked(() => this._draft().external)) {
      this._draft.update((v) => ({
        ...v,
        gid: this.buildGid() || '',
        label: this.buildLabel() || '',
      }));
    }
  }

  private updateForm(target?: PinTarget): void {
    this._updatingForm = true;

    try {
      // reset if no target
      if (!target) {
        this.lookupData.set(undefined);
        // .update(), not a tracked _draft() read + .set(): this method
        // runs inside the "target changed" effect, and reading _draft()
        // directly here would make the effect depend on its own write,
        // causing it to re-run indefinitely (the untracked() hazard
        // documented in signal-forms-migration.md).
        this._draft.update((v) => ({
          item: null,
          itemPart: null,
          partTypeKey: v.partTypeKey,
          gid: '',
          label: '',
          byTypeMode: v.byTypeMode,
          external: v.external,
        }));
        this.form().reset();
        return;
      }

      // set gid and label
      this._draft.update((v) => ({
        ...v,
        gid: target.gid || '',
        label: target.label || '',
      }));
      // reset lookup
      this.lookupData.set({
        pin: {
          itemId: target.itemId || '',
          partId: target.partId || '',
          partTypeId: target.partTypeId || '',
          roleId: target.roleId || '',
          name: target.name || '',
          value: target.value || '',
        },
      });

      // if target is internal, get item
      if (target.itemId) {
        this._itemService.getItem(target.itemId, true, true).subscribe({
          next: (item) => {
            this._updatingForm = true;
            this._draft.update((v) => ({ ...v, item }));
            this.form().reset();
            if (this.externalMode() === undefined) {
              this._draft.update((v) => ({ ...v, external: false }));
            }
            this.updateTargetFromData();
            this._updatingForm = false;
          },
          error: (error) => {
            if (error) {
              console.error('Item service error', error);
            }
            this._updatingForm = true;
            if (this.externalMode() === undefined) {
              this._draft.update((v) => ({ ...v, external: false }));
            }
            this._updatingForm = false;
          },
        });
      } else {
        if (this.externalMode() === undefined) {
          this._draft.update((v) => ({ ...v, external: true }));
        }
        this.updateTargetFromData();
      }
    } finally {
      // ensure flag is reset even if there's an error
      if (!target?.itemId) {
        this._updatingForm = false;
      }
    }
  }

  /**
   * Called when the item lookup changes (item is looked up
   * by its title).
   *
   * @param item The item got from lookup.
   */
  public onItemLookupChange(item: unknown): void {
    if (!item) {
      this._draft.update((v) => ({ ...v, itemPart: null }));
      this.itemParts.set([]);
      return;
    }
    // load item's parts
    this._itemService.getItem((item as Item)!.id, true, true).subscribe({
      next: (i) => {
        // setting the item will trigger its parts update
        this._draft.update((v) => ({ ...v, item: i }));
        this.updateTarget(true); // suppress emit to avoid double emission
      },
      error: (error) => {
        if (error) {
          console.error('Error getting item', error);
        }
        this._draft.update((v) => ({ ...v, itemPart: null }));
        this.itemParts.set([]);
        this.updateTarget(true); // suppress emit to avoid double emission
      },
    });
  }

  private loadItemInfo(pin?: DataPinInfo): void {
    if (!pin) {
      return;
    }
    forkJoin({
      item: this._itemService.getItem(pin.itemId, false, true),
      part: this._itemService.getPartFromTypeAndRole(
        pin.itemId,
        METADATA_PART_ID,
        undefined,
        true
      ),
    })
      .pipe(take(1))
      .subscribe({
        next: (result) => {
          this.lookupData.set({
            pin: pin,
            item: result.item!,
            metaPart: result.part as MetadataPart,
          });
          this.updateTarget(true); // suppress emit to avoid double emission
        },
        error: (error) => {
          this.lookupData.set(undefined);
          console.error('Error loading item/metadata', error);
        },
      });
  }

  /**
   * Called when the pin lookup change. A pin is looked up by its
   * name and value (=the filter's text), and optionally by:
   * - its index lookup definition (selected by partTypeKey).
   * - its item (defined by item, in filter).
   * - its part (defined by itemPart, in filter).
   *
   * @param info The pin info from pin lookup.
   */
  public onPinLookupChange(info: unknown): void {
    this.loadItemInfo(info as DataPinInfo);
  }

  public onExtItemChange(event: RefLookupSetEvent): void {
    if (event.item) {
      this._updatingForm = true;
      setTimeout(() => {
        this._draft.update((v) => ({
          ...v,
          gid: event.itemId,
          label: event.itemLabel,
        }));
        this.form.gid().markAsDirty();
        this.form.label().markAsDirty();

        this._updatingForm = false;
      });
    }
  }

  public onExtMoreRequest(event: RefLookupSetEvent): void {
    this.extMoreRequest.emit(event);
  }

  public onCopied(): void {
    this._snackbar.open('Copied to clipboard', 'OK', {
      duration: 1500,
    });
  }

  public onExtConfigChange(config: RefLookupConfig): void {
    this.extLookupConfigChange.emit(config);
  }

  public close(): void {
    this.editorClose.emit();
  }

  public save(): void {
    if (this.form().invalid()) {
      this.form().markAsTouched();
      return;
    }
    this.emitTargetChange();
  }
}
