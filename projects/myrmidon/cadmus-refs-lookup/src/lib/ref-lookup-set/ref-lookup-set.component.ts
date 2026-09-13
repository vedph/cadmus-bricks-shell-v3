import {
  ChangeDetectionStrategy,
  Component,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import {
  LookupProviderOptions,
  RefLookupComponent,
  RefLookupService,
} from '../ref-lookup/ref-lookup.component';

/**
 * The configuration for each lookup in a lookup set.
 */
export interface RefLookupConfig {
  /**
   * The lookup service human-friendly name. If you need a unique
   * identifier for the service lookup, use service.id.
   */
  name: string;

  /**
   * The lookup icon URL.
   */
  iconUrl?: string;

  /**
   * The lookup description.
   */
  description?: string;

  /**
   * The label to be displayed in the lookup control.
   */
  label?: string;

  /**
   * The maximum number of items to retrieve at each lookup.
   * Default is 10.
   */
  limit?: number;

  /**
   * The base filter object to supply when filtering data
   * in this lookup. If you have more filtering criteria
   * set by your client code, set this property to an object
   * representing the filter criteria. This object will be
   * used as the base object when invoking the lookup service.
   */
  baseFilter?: any;

  /**
   * The lookup service to use.
   */
  service?: RefLookupService;

  /**
   * The current lookup item or undefined.
   */
  item?: any;

  /**
   * The optional item ID to resolve via service.getById().
   * When set, the lookup component will call getById() to
   * resolve the full item object. This should be a raw
   * service-native ID; use itemIdParser to strip any
   * consumer-level decoration before resolution.
   */
  itemId?: string;

  /**
   * The optional function to get a string ID from an item.
   * If undefined, the item object will be used.
   * @param item The item to get the ID for.
   * @returns The ID.
   */
  itemIdGetter?: (item: any) => string;

  /**
   * Optional function to parse a decorated/stored ID into the
   * raw service-native ID. This is the inverse of itemIdGetter
   * when it applies decoration (e.g. prefixing). If not set,
   * itemId is used as-is.
   * @param id The decorated ID.
   * @returns The raw service-native ID.
   */
  itemIdParser?: (id: string) => string;

  /**
   * The optional function to get a string label from an item.
   * If undefined, the item object will be used.
   * @param item The item to get the label for.
   * @returns The label.
   */
  itemLabelGetter?: (item: any) => string;

  /**
   * True if a value is required.
   */
  required?: boolean;

  /**
   * True to add a More button for more complex lookup.
   * When the user clicks it, the corresponding moreRequest
   * event will be emitted.
   */
  hasMore?: boolean;

  /**
   * The optional template to be used when building the
   * URI pointing to the external resource and linked by
   * the Link button. The ID placeholder is represented by
   * a property path included in {}, e.g. {id} or {some.id}.
   * If undefined, no link button will be displayed.
   */
  linkTemplate?: string;

  /**
   * When using quick options, this is a component used to
   * customize the options bound to options.
   */
  optDialog?: any;

  /**
   * The quick options for the lookup service.
   */
  options?: any;
}

/**
 * The icon size used for lookup items.
 */
export interface IconSize {
  width: number;
  height: number;
}

/**
 * The event emitted by the lookup set component.
 */
export interface RefLookupSetEvent {
  configs: RefLookupConfig[];
  config: RefLookupConfig;
  item: any;
  itemId: string;
  itemLabel: string;
}

/**
 * A set of lookup components, each with its own configuration.
 */
@Component({
  selector: 'cadmus-refs-lookup-set',
  templateUrl: './ref-lookup-set.component.html',
  styleUrls: ['./ref-lookup-set.component.css'],
  imports: [MatFormFieldModule, MatSelectModule, RefLookupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefLookupSetComponent implements OnInit {
  /**
   * The currently selected lookup configuration, or null when none is
   * selected. This is a plain signal, deliberately NOT routed through
   * @angular/forms/signals: `RefLookupConfig.service` is a live injected
   * service instance, which routinely contains circular references (HTTP
   * interceptor chains, DI back-references, RxJS Subjects). Adopting such
   * an object into a signal-forms field - even with no schema/validators
   * declared - makes the field-tree's structural walk (dirty()/getError()/
   * touched() etc.) recurse into the cycle and overflow the stack; a
   * plain signal never attempts to walk the value's shape at all, so it
   * has no such hazard. There was never any validation on this field
   * (`form(this._draft)` was called with no schema), so nothing is lost.
   */
  public readonly config = signal<RefLookupConfig | null>(null);

  /**
   * Configuration for each lookup.
   */
  public readonly configs = input.required<RefLookupConfig[]>();

  /**
   * The icon size used for lookup items.
   */
  public readonly iconSize = input<IconSize>({ width: 24, height: 24 });

  /**
   * Optional configuration for automatic lookup provider options.
   * When defined, this is passed to the child RefLookupComponent to enable
   * automatic options selection via a scope selector UI.
   */
  public readonly lookupProviderOptions = input<LookupProviderOptions>();

  /**
   * Emitted when the currently selected lookup configuration changes.
   */
  public readonly configChange = output<RefLookupConfig>();

  /**
   * Emitted when an item changes in a lookup.
   */
  public readonly itemChange = output<RefLookupSetEvent>();

  /**
   * Emitted when the user clicks the More button in a lookup.
   */
  public readonly moreRequest = output<RefLookupSetEvent>();

  public ngOnInit(): void {
    // select the first config as the current one if any
    if (this.configs()?.length) {
      this.config.set(this.configs()[0]);
    }
  }

  /**
   * Called when the user picks a provider from the select. This is a
   * plain, explicit event handler rather than a reactive watcher: it only
   * ever fires for a genuine user pick (or the initial auto-select above),
   * so there is no "was this our own echo" question to answer, and no
   * debounce is needed for a single discrete selection.
   */
  public onConfigChange(config: RefLookupConfig | null): void {
    this.config.set(config);
    if (config) {
      this.configChange.emit(config);
    }
  }

  private itemToEvent(item: any): RefLookupSetEvent {
    const config = this.config()!;
    return {
      configs: this.configs(),
      config,
      item: item,
      itemId: config.itemIdGetter
        ? config.itemIdGetter(item) || (item as string)
        : (item as string),
      itemLabel: config.itemLabelGetter
        ? config.itemLabelGetter(item) || (item as string)
        : (item as string),
    };
  }

  public onItemChange(item: any): void {
    if (!this.config()) {
      return;
    }
    const event = this.itemToEvent(item);
    this.itemChange.emit(event);
  }

  public getResolvedItemId(
    config: RefLookupConfig
  ): string | undefined {
    if (!config.itemId) {
      return undefined;
    }
    return config.itemIdParser
      ? config.itemIdParser(config.itemId)
      : config.itemId;
  }

  public onMoreRequest(item: any): void {
    if (!this.config()) {
      return;
    }
    const event = this.itemToEvent(item);
    this.moreRequest.emit(event);
  }
}
