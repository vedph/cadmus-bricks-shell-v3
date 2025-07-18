import {
  Component,
  effect,
  Inject,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  Subscription,
  debounceTime,
  distinctUntilChanged,
  filter,
  forkJoin,
  take,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
    FormsModule,
    ReactiveFormsModule,
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
})
export class PinTargetLookupComponent implements OnInit, OnDestroy {
  private readonly _subs: Subscription[] = [];
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
   * The target to be edited.
   */
  public readonly target = model<PinTarget>();

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

  // by type
  public modelEntries: ThesaurusEntry[];
  public partTypeKeys: string[];
  // by item
  public itemParts: Part[];
  // form - by item
  public item: FormControl<Item | null>;
  public itemPart: FormControl<Part | null>;
  // form - by type
  public partTypeKey: FormControl<string | null>;
  // form - both
  public gid: FormControl<string | null>;
  public label: FormControl<string | null>;
  public byTypeMode: FormControl<boolean>;
  public external: FormControl<boolean>;
  public form: FormGroup;

  public filter: PinRefLookupFilter;
  public pinFilterOptions?: IndexLookupDefinition;
  public lookupData?: PinLookupData;

  constructor(
    @Inject('indexLookupDefinitions')
    private _presetLookupDefs: IndexLookupDefinitions,
    public itemLookupService: ItemRefLookupService,
    public pinLookupService: PinRefLookupService,
    private _itemService: ItemService,
    private _thesService: ThesaurusService,
    private _snackbar: MatSnackBar,
    formBuilder: FormBuilder
  ) {
    this.partTypeKeys = [];
    this.itemParts = [];
    this.modelEntries = [];
    // this is the default filter for the pin lookup, which will
    // be merged with values provided by user here
    this.filter = {
      text: '',
      limit: 10,
    };
    // form
    this.item = formBuilder.control(null);
    this.itemPart = formBuilder.control(null);
    this.partTypeKey = formBuilder.control(null);
    this.gid = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(300),
    ]);
    this.label = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(300),
    ]);
    this.byTypeMode = formBuilder.control(false, { nonNullable: true });
    this.external = formBuilder.control(false, { nonNullable: true });
    this.form = formBuilder.group({
      item: this.item,
      itemPart: this.itemPart,
      partTypeKey: this.partTypeKey,
      gid: this.gid,
      label: this.label,
      byTypeMode: this.byTypeMode,
      external: this.external,
    });

    // when pinByTypeMode changes, adjust form
    effect(() => {
      if (!this._updatingForm) {
        if (!this.byTypeMode.value) {
          this._startWithByTypeMode = this.pinByTypeMode();
        } else {
          this.byTypeMode.setValue(this.pinByTypeMode() || false, {
            emitEvent: false,
          });
          this.byTypeMode.updateValueAndValidity();
        }
      }
    });

    // when target changes, update form
    effect(() => {
      const target = this.target();
      console.log('target changed', target);
      this.updateForm(target);
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
    this.partTypeKeys = Object.keys(this.lookupDefinitions()!);

    // if no keys, get them from thesaurus model-types;
    // if this is not available, just force by item mode.
    if (!this.partTypeKeys.length) {
      if (this.modelEntries?.length) {
        // set lookupDefinitions from thesaurus entries
        const defs: IndexLookupDefinitions = {};
        this.modelEntries.forEach((e) => {
          defs[e.value] = {
            name: e.value,
            typeId: e.id,
          };
        });
        this.lookupDefinitions.set(defs);
        // set type keys from thesaurus entries
        this.partTypeKeys = this.modelEntries.map((e) => e.value);
      }
    }

    // if still no keys, force by item mode
    if (!this.partTypeKeys.length) {
      this.forceByItem();
    } else {
      // set default key
      this.partTypeKey.setValue(
        this.defaultPartTypeKey() || this.partTypeKeys[0]
      );
    }
  }

  public ngOnInit(): void {
    // set start mode if required
    if (this._startWithByTypeMode) {
      this.byTypeMode.setValue(true);
    }

    // whenever item changes (by lookup), update item's parts and filter
    this._subs.push(
      this.item.valueChanges
        .pipe(distinctUntilChanged(), debounceTime(300))
        .subscribe((item) => {
          this.itemPart.setValue(null, { emitEvent: false });
          this.itemParts = item?.parts || [];
          this.filter = {
            ...this.filter,
            itemId: item?.id,
          };
        })
    );

    // whenever itemPart changes (by user selection), update target and
    // eventually gid
    this._subs.push(
      this.itemPart.valueChanges
        .pipe(distinctUntilChanged(), debounceTime(300))
        .subscribe((part) => {
          if (!this.gid.value || this.gid.pristine) {
            this.gid.setValue(this.buildGid());
          }
          this.filter = {
            ...this.filter,
            partId: part?.id,
          };
          this.updateTarget(true);
        })
    );

    // whenever partTypeKey changes, update filter's options
    this._subs.push(
      this.partTypeKey.valueChanges
        .pipe(distinctUntilChanged(), debounceTime(300))
        .subscribe((key) => {
          this.pinFilterOptions = key
            ? this.lookupDefinitions()![key]
            : undefined;
        })
    );

    // whenever external changes, set required validator in label
    // (true for external, false for internal)
    this._subs.push(
      this.external.valueChanges
        .pipe(distinctUntilChanged(), debounceTime(300))
        .subscribe((external) => {
          if (external) {
            this.label.setValidators([
              Validators.required,
              Validators.maxLength(300),
            ]);
          } else {
            this.label.setValidators([Validators.maxLength(300)]);
          }
          this.label.updateValueAndValidity();
        })
    );

    // load model-types thesaurus entries
    this._thesService.getThesaurus('model-types', true).subscribe({
      next: (t) => {
        this.modelEntries = t.entries || [];
        if (this.modelEntries?.length) {
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

  public ngOnDestroy(): void {
    for (let i = 0; i < this._subs.length; i++) {
      this._subs[i].unsubscribe();
    }
  }

  private buildGid(): string | null {
    // the GID is the part ID if any, or the item ID, followed by
    // the pin's value (=EID)
    const pin = this.lookupData?.pin;
    if (!pin?.value) {
      return null;
    }
    return pin.partId
      ? `P${pin.partId}/${pin.value}`
      : `I${pin.itemId}/${pin.value}`;
  }

  private buildLabel(): string | null {
    if (!this.lookupData?.pin) {
      return null;
    }
    const sb: string[] = [];
    // pin value
    if (this.lookupData.pin.value) {
      sb.push(this.lookupData.pin.value);
      sb.push(' | ');
    }
    // item title
    sb.push(this.lookupData.item?.title || this.lookupData.pin?.itemId);
    // part type and role
    if (this.lookupData.pin.partTypeId) {
      const e = this.modelEntries?.find(
        (e) => e.id === this.lookupData!.pin.partTypeId
      );
      sb.push(' (');
      sb.push(e?.value || this.lookupData.pin.partTypeId);
      if (this.lookupData.pin.roleId) {
        sb.push(`, ${this.lookupData.pin.roleId}`);
      }
      sb.push(')');
    }
    return sb.join('');
  }

  private getTarget(): PinTarget {
    if (this.external.value) {
      return {
        gid: this.gid.value || '',
        label: this.label.value || '',
      };
    } else {
      const pin = this.lookupData?.pin;
      return {
        gid: this.gid.value || '',
        label: this.label.value || '',
        itemId: pin?.itemId || '',
        partId: pin?.partId || '',
        partTypeId: pin?.partTypeId || '',
        roleId: pin?.roleId || '',
        name: pin?.name || '',
        value: pin?.value || '',
      };
    }
  }

  private emitChange(): void {
    this.target.set(this.getTarget());
  }

  private updateTarget(suppressEmit = false): void {
    this._updatingForm = true;

    if (!this.external.value) {
      this.gid.setValue(this.buildGid());
      this.gid.updateValueAndValidity();
      this.gid.markAsDirty();
      this.label.setValue(this.buildLabel());
      this.label.updateValueAndValidity();
      this.label.markAsDirty();
    }

    this._updatingForm = false;

    if (!suppressEmit) {
      this.emitTargetChange();
    }
  }

  private updateTargetFromData(): void {
    // Update GID and label without emitting changes
    if (!this.external.value) {
      this.gid.setValue(this.buildGid(), { emitEvent: false });
      this.gid.updateValueAndValidity();
      this.label.setValue(this.buildLabel(), { emitEvent: false });
      this.label.updateValueAndValidity();
    }
  }

  private updateForm(target?: PinTarget): void {
    this._updatingForm = true;

    try {
      // reset if no target
      if (!target) {
        this.lookupData = undefined;
        this.item.reset();
        this.itemPart.reset();
        this.gid.reset();
        this.label.reset();
        return;
      }

      // set gid and label
      this.gid.setValue(target.gid || '', { emitEvent: false });
      this.label.setValue(target.label || '', { emitEvent: false });
      // reset lookup
      this.lookupData = {
        pin: {
          itemId: target.itemId || '',
          partId: target.partId || '',
          partTypeId: target.partTypeId || '',
          roleId: target.roleId || '',
          name: target.name || '',
          value: target.value || '',
        },
      };

      // if target is internal, get item
      if (target.itemId) {
        this._itemService.getItem(target.itemId, true, true).subscribe({
          next: (item) => {
            this._updatingForm = true;
            this.item.setValue(item, { emitEvent: false });
            this.form.markAsPristine();
            this.external.setValue(false, { emitEvent: false });
            this.updateTargetFromData();
            this._updatingForm = false;
          },
          error: (error) => {
            if (error) {
              console.error('Item service error', error);
            }
            this._updatingForm = true;
            this.external.setValue(false, { emitEvent: false });
            this._updatingForm = false;
          },
        });
      } else {
        this.external.setValue(true, {
          emitEvent: false,
        });
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
      this.itemPart.setValue(null);
      this.itemParts = [];
      return;
    }
    // load item's parts
    this._itemService.getItem((item as Item)!.id, true, true).subscribe({
      next: (i) => {
        // setting the item will trigger its parts update
        this.item.setValue(i);
        this.updateTarget(true); // suppress emit to avoid double emission
      },
      error: (error) => {
        if (error) {
          console.error('Error getting item', error);
        }
        this.itemPart.setValue(null);
        this.itemParts = [];
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
          this.lookupData = {
            pin: pin,
            item: result.item!,
            metaPart: result.part as MetadataPart,
          };
          this.updateTarget(true); // suppress emit to avoid double emission
        },
        error: (error) => {
          this.lookupData = undefined;
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
        this.gid.setValue(event.itemId);
        this.gid.updateValueAndValidity();
        this.gid.markAsDirty();

        this.label.setValue(event.itemLabel);
        this.label.updateValueAndValidity();
        this.label.markAsDirty();

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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.emitTargetChange();
  }
}
