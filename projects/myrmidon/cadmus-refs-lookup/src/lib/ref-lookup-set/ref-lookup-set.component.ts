import { Component, input, OnDestroy, OnInit, output } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import {
  RefLookupComponent,
  RefLookupService,
} from '../ref-lookup/ref-lookup.component';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

/**
 * The configuration for each lookup in a lookup set.
 */
export interface RefLookupConfig {
  /**
   * The lookup human-friendly name.
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
   * The optional function to get a string ID from an item.
   * If undefined, the item object will be used.
   * @param item The item to get the label for.
   * @returns The label.
   */
  itemIdGetter?: (item: any) => string;

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
  selector: 'cadmus-ref-lookup-set',
  templateUrl: './ref-lookup-set.component.html',
  styleUrls: ['./ref-lookup-set.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    RefLookupComponent,
  ],
})
export class RefLookupSetComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;

  public config: FormControl<RefLookupConfig | null>;

  /**
   * Configuration for each lookup.
   */
  public readonly configs = input<RefLookupConfig[]>([]);

  /**
   * The icon size used for lookup items.
   */
  public readonly iconSize = input<IconSize>({ width: 24, height: 24 });

  /**
   * Emitted when the configuration changes.
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

  constructor(formBuilder: FormBuilder) {
    this.config = formBuilder.control(null);
  }

  public ngOnInit(): void {
    this._sub = this.config.valueChanges
      .pipe(distinctUntilChanged(), debounceTime(200))
      .subscribe((config) => {
        if (config) {
          this.configChange.emit(config);
        }
      });

    // set the first config as the current one if any
    if (this.configs()?.length) {
      this.config.setValue(this.configs()[0]);
    }
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private eventToItem(item: any): RefLookupSetEvent {
    return {
      configs: this.configs(),
      config: this.config.value!,
      item: item,
      itemId: this.config.value!.itemIdGetter
        ? this.config.value!.itemIdGetter(item) || (item as string)
        : (item as string),
      itemLabel: this.config.value!.itemLabelGetter
        ? this.config.value!.itemLabelGetter(item) || (item as string)
        : (item as string),
    };
  }

  public onItemChange(item: any): void {
    if (!this.config.value) {
      return;
    }
    this.itemChange.emit(this.eventToItem(item));
  }

  public onMoreRequest(item: any): void {
    if (!this.config.value) {
      return;
    }
    this.moreRequest.emit(this.eventToItem(item));
  }
}
