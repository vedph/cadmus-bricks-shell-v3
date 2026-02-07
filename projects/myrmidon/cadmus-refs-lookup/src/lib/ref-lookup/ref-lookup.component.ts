import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormControl,
  FormGroup,
} from '@angular/forms';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { RefLookupOptionsComponent } from '../ref-lookup-options/ref-lookup-options.component';

/**
 * A generic item lookup filter used by RefLookupComponent.
 * You can derive other filters from this interface, which
 * just includes the lookup limit and a text filter.
 */
export interface RefLookupFilter {
  limit: number;
  text: string | undefined;
}

/**
 * The interface to be implemented by lookup services used
 * by RefLookupComponent.
 */
export interface RefLookupService {
  /**
   * A unique identifier for this lookup service, used to match
   * against lookupProviderOptions. Examples: 'viaf', 'whg', 'biblissima'.
   */
  readonly id: string;
  /**
   * Lookup the items matching filter.
   * @param filter The filter.
   * @param options Additional options.
   */
  lookup(filter: RefLookupFilter, options?: any): Observable<any[]>;
  /**
   * Get a display name for the specified item.
   * @param item The item.
   */
  getName(item: any | undefined): string;
  /**
   * Get a single item by its native ID.
   * @param id The item's native ID as used by this service.
   * @returns Observable of the item, or undefined if not found.
   * The returned item must have the same shape as items from lookup().
   */
  getById(id: string): Observable<any | undefined>;
}

/**
 * Represents a single scope option for a lookup provider.
 * Each scope has a label for UI display and the options to apply.
 */
export interface LookupProviderOptionScope {
  /**
   * The human-friendly label to display in the scope selector.
   */
  label: string;
  /**
   * The options to apply when this scope is selected.
   * The structure depends on the specific lookup provider.
   */
  options: any;
}

/**
 * A map of scope keys to their definitions for a single provider.
 * The special key 'default' with value null indicates unlimited search is allowed.
 * If 'default' is missing, users must select a specific scope.
 */
export type LookupProviderScopesMap = {
  [scopeKey: string]: LookupProviderOptionScope | null;
};

/**
 * Configuration map for automatic lookup provider options.
 * Each key is a provider ID (matching RefLookupService.id),
 * and the value is a map of available scopes for that provider.
 *
 * @example
 * {
 *   "biblissima": {
 *     "default": null,
 *     "q168": { "label": "people", "options": { "type": "Q168" } },
 *     "q282950": { "label": "works", "options": { "type": "Q282950" } }
 *   }
 * }
 */
export type LookupProviderOptions = {
  [providerId: string]: LookupProviderScopesMap;
};

/**
 * Represents a scope entry for display in the scope selector.
 */
export interface LookupScopeEntry {
  /**
   * The scope key from the LookupProviderScopesMap.
   */
  key: string;
  /**
   * The label to display, or 'default' for null scopes.
   */
  label: string;
  /**
   * The options to apply, or undefined for default/unlimited.
   */
  options: any | undefined;
}

/**
 * Generic reference lookup component. You must set the service
 * property to the lookup service, implementing the LookupService
 * interface, and optionally the current lookup item. Optionally
 * set the label and limit, and hasMore to true if you want a
 * more button for more complex lookup.
 */
@Component({
  selector: 'cadmus-refs-lookup',
  templateUrl: './ref-lookup.component.html',
  styleUrls: ['./ref-lookup.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    // material
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefLookupComponent {
  public readonly lookupActive = signal<boolean>(false);
  public invalid$: BehaviorSubject<boolean>;

  /**
   * The label to be displayed in the lookup control.
   */
  public readonly label = input<string>();

  /**
   * The maximum number of items to retrieve at each lookup.
   * Default is 10.
   */
  public readonly limit = input<number>(10);

  /**
   * The base filter object to supply when filtering data
   * in this lookup. If you have more filtering criteria
   * set by your client code, set this property to an object
   * representing the filter criteria. This object will be
   * used as the base object when invoking the lookup service.
   */
  public readonly baseFilter = input<unknown>();

  /**
   * The lookup service to use.
   */
  public readonly service = input.required<RefLookupService>();

  /**
   * The current lookup item or undefined.
   */
  public readonly item = model<unknown>();

  /**
   * The optional item ID to resolve via service.getById().
   * When set (and item is not), the component calls getById()
   * to resolve the full item object. This is the raw service-native
   * ID (not decorated). Use itemIdParser on RefLookupConfig to
   * strip consumer-level decoration before passing to this input.
   */
  public readonly itemId = input<string | undefined>();

  /**
   * True if a value is required.
   */
  public readonly required = input<boolean>();

  /**
   * True to add a More button for more complex lookup.
   * When the user clicks it, the corresponding moreRequest
   * event will be emitted.
   */
  public readonly hasMore = input<boolean>();

  /**
   * The optional template to be used when building the
   * URI pointing to the external resource and linked by
   * the Link button. The ID placeholder is represented by
   * a property path included in {}, e.g. {id} or {some.id}.
   * If undefined, no link button will be displayed.
   */
  public readonly linkTemplate = input<string>();

  /**
   * When using quick options, this is a component used to
   * customize the options bound to options.
   */
  public readonly optDialog = input<unknown>();

  /**
   * The quick options for the lookup service.
   */
  public readonly options = model<unknown>();

  /**
   * Optional configuration for automatic lookup provider options.
   * When defined with scopes for the current service, enables automatic
   * options selection via a scope selector UI.
   */
  public readonly lookupProviderOptions = input<LookupProviderOptions>();

  /**
   * The request for a more complex lookup, getting the
   * current item if any.
   */
  public readonly moreRequest = output<unknown | undefined>();

  public readonly loading = signal<boolean>(false);

  /**
   * The currently selected scope key, if scopes are available.
   */
  public readonly selectedScopeKey = signal<string | undefined>(undefined);

  /**
   * Available scopes for the current service, derived from lookupProviderOptions.
   */
  public readonly availableScopes = computed<LookupScopeEntry[]>(() => {
    const providerOptions = this.lookupProviderOptions();
    const service = this.service();
    if (!providerOptions || !service?.id) {
      return [];
    }
    const scopesMap = providerOptions[service.id];
    if (!scopesMap) {
      return [];
    }
    const entries: LookupScopeEntry[] = [];
    for (const key of Object.keys(scopesMap)) {
      const scope = scopesMap[key];
      entries.push({
        key,
        label: scope?.label || 'default',
        options: scope?.options,
      });
    }
    return entries;
  });

  public form: FormGroup;
  public lookup: FormControl;
  public items$: Observable<any[]>;

  constructor(formBuilder: FormBuilder, private _dialog: MatDialog) {
    this.invalid$ = new BehaviorSubject<boolean>(false);
    this.lookup = formBuilder.control(null);
    this.form = formBuilder.group({
      lookup: this.lookup,
    });

    this.items$ = this.lookup.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value: any | string) => {
        if (typeof value === 'string' && this.service()) {
          this.loading.set(true);
          return this.service()!
            .lookup(
              {
                ...(this.baseFilter() || {}),
                limit: this.limit(),
                text: value,
              },
              this.options()
            )
            .pipe(
              tap((v) => {
                this.invalid$.next(this.required() && !v ? true : false);
                this.loading.set(false);
              })
            );
        } else {
          this.loading.set(false);
          this.invalid$.next(value ? false : true);
          return of([value]);
        }
      })
    );

    // when service changes, clear and reset scopes
    effect(() => {
      console.log('service changed', this.service());
      this.clear();
      this.applyInitialScope();
    });

    // when item changes, update validity
    effect(() => {
      const item = this.item();
      this.updateValidity();
      this.lookup.setValue(item);
    });

    // when required changes, update validity
    effect(() => {
      this.updateValidity();
    });

    // when itemId changes, resolve the item via getById
    effect(() => {
      const id = this.itemId();
      const svc = this.service();
      if (id && svc) {
        svc
          .getById(id)
          .pipe(take(1))
          .subscribe((resolved) => {
            if (resolved) {
              this.item.set(resolved);
            }
          });
      }
    });
  }

  private updateValidity(): void {
    this.invalid$.next(this.required() && !this.item() ? true : false);
  }

  public getLookupName(item: any): string {
    const service: RefLookupService | undefined = this.service
      ? this.service()
      : undefined;
    if (service) {
      return service.getName(item) || '';
    } else {
      return '';
    }
  }

  public clear(): void {
    this.item.set(undefined);
    this.lookup.reset();
    this.lookupActive.set(false);
  }

  public pickItem(item: any): void {
    this.item.set(item);
    this.lookupActive.set(false);
  }

  public requestMore(): void {
    this.lookupActive.set(false);
    this.moreRequest.emit(this.item());
  }

  private resolvePlaceholder(value: string): string | null {
    const steps = value.split('.');
    let p: any = this.item();
    for (let i = 0; i < steps.length; i++) {
      p = p[steps[i]];
      if (!p) {
        return null;
      }
    }
    return p?.toString() || null;
  }

  public openLink(): void {
    if (!this.item() || !this.linkTemplate()) {
      return;
    }

    // find the 1st '{' (there must be one)
    let i = this.linkTemplate()!.indexOf('{');
    if (i === -1) {
      return;
    }
    const sb: string[] = [];
    let prev = 0;

    while (i > -1) {
      // '{' found: first append left stuff if any
      const start = i + 1;
      if (prev < i) {
        sb.push(this.linkTemplate()!.substring(prev, i));
      }
      // then find closing '}', assuming it at end
      // if not found (defensive)
      i = this.linkTemplate()!.indexOf('}', i + 1);
      if (i === -1) {
        i = this.linkTemplate()!.length;
        break;
      }
      // append the resolved placeholder
      const resolved = this.resolvePlaceholder(
        this.linkTemplate()!.substring(start, i)
      );
      if (resolved) {
        sb.push(resolved);
      }
      // move to next placeholder
      prev = ++i;
      i = this.linkTemplate()!.indexOf('{', i);
    }
    const uri = sb.join('');
    if (uri) {
      window.open(uri, '_blank');
    }
  }

  public showOptions(): void {
    if (!this.optDialog()) {
      return;
    }
    // open the lookup options dialog using optDialog as its content
    // and passing the options via data
    this._dialog
      .open(RefLookupOptionsComponent, {
        data: {
          component: this.optDialog(),
          options: this.options(),
        },
      })
      .afterClosed()
      .subscribe((result) => {
        // defensive: always set a new object reference, in case the dialog
        // has modified the options object in place
        this.options.set(result ? { ...result } : result);
      });
  }

  /**
   * Apply the initial scope when service or lookupProviderOptions change.
   * If there's only one scope, apply it automatically.
   * If there are multiple scopes, select the first one.
   * If there are no scopes, reset the selected scope.
   */
  private applyInitialScope(): void {
    const scopes = this.availableScopes();
    if (scopes.length === 0) {
      // No scopes defined for this provider, reset
      this.selectedScopeKey.set(undefined);
      return;
    }

    if (scopes.length === 1) {
      // Single scope: apply it automatically
      const scope = scopes[0];
      this.selectedScopeKey.set(scope.key);
      this.options.set(scope.options ? { ...scope.options } : undefined);
    } else {
      // Multiple scopes: select the first one
      const scope = scopes[0];
      this.selectedScopeKey.set(scope.key);
      this.options.set(scope.options ? { ...scope.options } : undefined);
    }
  }

  /**
   * Handle scope selection change from the UI.
   * @param scopeKey The selected scope key.
   */
  public onScopeChange(scopeKey: string): void {
    this.selectedScopeKey.set(scopeKey);
    const scopes = this.availableScopes();
    const scope = scopes.find((s) => s.key === scopeKey);
    if (scope) {
      this.options.set(scope.options ? { ...scope.options } : undefined);
    }
  }
}
