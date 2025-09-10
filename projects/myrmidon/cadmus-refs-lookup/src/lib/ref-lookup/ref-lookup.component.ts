import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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
  tap,
} from 'rxjs/operators';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
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
   * The request for a more complex lookup, getting the
   * current item if any.
   */
  public readonly moreRequest = output<unknown | undefined>();

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
              })
            );
        } else {
          this.invalid$.next(value ? false : true);
          return of([value]);
        }
      })
    );

    // when service changes, clear
    effect(() => {
      console.log('service changed', this.service());
      this.clear();
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
}
