# Signal-forms component template

Canonical shape for a component that edits a model, in the two usual flavours:
the user saves explicitly with a button, or the model autosaves on every
change. Sections that belong to only one flavour are marked
`── MANUAL SAVE ONLY ──` / `── AUTOSAVE ONLY ──`; delete the other.

Placeholders: `__PRJ__`, `__NAME__`, `__TYPE__`.

## What changed from the reactive-forms template, and why

| reactive forms                                  | signal forms                            | why                                                                                                                                                                                         |
| ----------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FormGroup` + `effect()` calling `updateForm()` | `linkedSignal` with a `previous` check  | the model→draft sync _is_ a derivation; `linkedSignal` is the primitive for it                                                                                                              |
| `_updatingForm` boolean guard                   | `isDraftInSync()`, computed on demand   | `toObservable` emits asynchronously, so a synchronously set-and-cleared flag always reads back `false` in a debounced subscriber                                                            |
| `updateForm()` / `getData()` methods            | pure `toDraft()` / `toData()` functions | the computation, the autosave guard and `save()` all need the same mapping; a pure function can be called from inside a `linkedSignal` computation, a method reading `this._draft()` cannot |
| `<form [formGroup]> (submit)="save()"`          | no `<form>` element at all              | signal forms bind via `[formField]`; a `<form>` in an embeddable widget only creates invalid nested markup and stray Enter-key submissions                                                  |
| `type="submit"` button                          | `type="button"` + `(click)="save()"`    | fires correctly at any nesting depth, with nothing to `preventDefault()`                                                                                                                    |
| `form.markAllAsTouched()`                       | `form().markAsTouched()`                | marks descendants by default                                                                                                                                                                |

---

## `__NAME__.component.ts`

```ts
import { ChangeDetectionStrategy, Component, effect, linkedSignal, model, output, untracked } from "@angular/core";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";
import { FormField, form, maxLength, required } from "@angular/forms/signals";
import { debounceTime } from "rxjs";

// material
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatTooltipModule } from "@angular/material/tooltip";

/**
 * The editable shape behind the form.
 *
 * Fields bound to a native <input> must be non-nullable: use '' as the empty
 * sentinel for text, and `number | null` only for numeric inputs. A
 * `string | null` field fails template type-checking. Fields bound to
 * CVA-based Material controls (mat-select, mat-checkbox) may still be null.
 */
interface __NAME__Controls {
  name: string;
  note: string;
  // TODO: remaining controls
}

function makeDefaultDraft(): __NAME__Controls {
  return { name: "", note: "" };
}

/**
 * Bound model -> editable draft. Pure: reads nothing but its argument, so it
 * is safe to call from inside the linkedSignal computation below.
 */
function toDraft(data: __TYPE__ | undefined): __NAME__Controls {
  return !data
    ? makeDefaultDraft()
    : {
        name: data.name || "",
        note: data.note || "",
      };
}

/**
 * Editable draft -> model. This is where normalization lives (trimming,
 * mapping '' to undefined), which is exactly why the draft and the model are
 * not interchangeable - see the echo note on _draft below.
 */
function toData(v: __NAME__Controls): __TYPE__ {
  return {
    name: v.name.trim(),
    note: v.note.trim() || undefined,
  };
}

@Component({
  selector: "cadmus-__PRJ__-__NAME__",
  imports: [
    FormField,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    // ... etc.
  ],
  templateUrl: "./__NAME__.component.html",
  styleUrls: ["./__NAME__.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class __NAME__Component {
  /** The model being edited. */
  public readonly data = model<__TYPE__ | undefined>();

  // ── MANUAL SAVE ONLY ──────────────────────────────────────────────────
  /** Emitted when the user discards the edit. */
  public readonly cancelEdit = output<void>();
  // ──────────────────────────────────────────────────────────────────────

  /**
   * The editable draft: derived from `data`, but writable in place - the form
   * binds its controls straight to it.
   *
   * `previous` is what tells an external change apart from the echo of our own
   * save. `toData()` normalizes, so writing the model back produces a value
   * that differs from the draft; without this check the incoming echo would
   * rebuild the draft and stomp whatever the user is still typing. Concretely:
   * type "abc " (trailing space), let autosave fire, keep typing - with the
   * check you get "abc d", without it "abcd".
   *
   * The JSON comparison is fine because both sides are produced by the same
   * mapping functions, so key order is stable; a false "not equal" only causes
   * a harmless rebuild. If __TYPE__ contains Dates, Maps or class instances,
   * replace it with an explicit equality function.
   */
  private readonly _draft = linkedSignal<__TYPE__ | undefined, __NAME__Controls>({
    source: () => this.data(),
    computation: (data, previous) => (previous && JSON.stringify(data) ===
      JSON.stringify(toData(previous.value)) ? previous.value : toDraft(data)),
  });

  public readonly form = form(this._draft, (path) => {
    required(path.name);
    maxLength(path.name, 100);
    maxLength(path.note, 500);
    // TODO: remaining rules. Prefer declarative rules over imperative calls,
    // e.g. disabled(path.note, { when: () => this.readonlyMode() }).
  });

  constructor() {
    // Interaction state: once the draft mirrors the bound model again there
    // are no unsaved edits, so clear touched/dirty.
    //
    // Keyed on the DRAFT, not on `data`: on an echo of our own save the draft
    // does not change, so this does not run - which is what stops a validation
    // error from being cleared out from under the user right after autosave.
    effect(() => {
      const draft = this._draft();
      untracked(() => {
        if (this.isDraftInSync(draft)) {
          this.form().reset();
        }
      });
    });

    // ── AUTOSAVE ONLY ───────────────────────────────────────────────────
    toObservable(this._draft)
      .pipe(debounceTime(400), takeUntilDestroyed())
      .subscribe(() => {
        // Skip while the draft still mirrors what is bound: otherwise merely
        // *receiving* a model would immediately save a normalized copy of it
        // back over the original.
        if (this.isDraftInSync(this._draft()) || this.form().invalid()) {
          return;
        }
        this.save(false);
      });
    // ────────────────────────────────────────────────────────────────────
  }

  /** True when the draft still mirrors the bound model, i.e. nothing to save. */
  private isDraftInSync(draft: __NAME__Controls): boolean {
    return JSON.stringify(draft) === JSON.stringify(toDraft(this.data()));
  }

  // ── MANUAL SAVE ONLY ──────────────────────────────────────────────────
  public cancel(): void {
    this.cancelEdit.emit();
  }
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Save the current draft into the `data` model signal.
   * Called from the Save button, or from the autosave subscription above.
   * @param pristine true (default) to clear the form's interaction state
   * after saving. Autosave passes false, so the form does not flash its
   * validation state mid-typing.
   */
  public save(pristine = true): void {
    if (this.form().invalid()) {
      // surface the validation errors (descendants included by default)
      this.form().markAsTouched();
      return;
    }

    this.data.set(toData(this._draft()));

    if (pristine) {
      // resets interaction state only - it does NOT touch values
      this.form().reset();
    }
  }
}
```

## `__NAME__.component.html`

```html
<!--
  No <form> element. This component is embeddable at any nesting depth, and
  signal forms bind through [formField] on the controls themselves. Wrap in
  <form [formRoot]="form"> ONLY if this component is a real submission root,
  i.e. form() was given a `submission` action.
-->
<div>
  <!-- name -->
  <mat-form-field>
    <mat-label>name</mat-label>
    <input matInput [formField]="form.name" />
    @if (form.name().getError('required') && (form.name().dirty() || form.name().touched())) {
    <mat-error>name required</mat-error>
    } @if (form.name().getError('maxLength') && (form.name().dirty() || form.name().touched())) {
    <mat-error>name too long</mat-error>
    }
  </mat-form-field>

  <!-- note -->
  <mat-form-field>
    <mat-label>note</mat-label>
    <textarea matInput [formField]="form.note"></textarea>
    @if (form.note().getError('maxLength') && (form.note().dirty() || form.note().touched())) {
    <mat-error>note too long</mat-error>
    }
  </mat-form-field>

  <!-- TODO: remaining controls -->

  <!-- ── MANUAL SAVE ONLY: delete this block for autosave ────────────── -->
  <div>
    <button type="button" mat-icon-button matTooltip="Discard changes" (click)="cancel()">
      <mat-icon class="mat-warn">clear</mat-icon>
    </button>
    <button type="button" mat-icon-button matTooltip="Accept changes" [disabled]="form().invalid() || !form().dirty()" (click)="save()">
      <mat-icon class="mat-primary">check_circle</mat-icon>
    </button>
  </div>
  <!-- ─────────────────────────────────────────────────────────────────── -->
</div>
```

---

## Variant: this component really is a submission root

Only when the component owns a submit action (a page-level editor posting to a
server), not for embeddable widgets:

```ts
public readonly form = form(this._draft, schema, {
  submission: {
    action: async (form) => this.store.save(form().value()),
    onInvalid: (form) => this.report(form),
  },
});
```

```html
<form [formRoot]="form">
  …
  <button type="submit" mat-flat-button [disabled]="form().invalid()">Save</button>
</form>
```

`[formRoot]` sets `novalidate`, calls `preventDefault()` on the native submit
event, and runs the configured action. For any _additional_ action, keep
`type="button"` and call `submit(this.form, { action })` explicitly.

## Variant: an array of rows (former `FormArray`)

```ts
interface __NAME__Controls {
  rows: RowControls[];
}

public readonly form = form(this._draft, (path) => {
  applyEach(path.rows, (row) => {
    required(row.value);
    maxLength(row.value, 500);
  });
});

public addRow(): void {
  this._draft.update((v) => ({ ...v, rows: [...v.rows, makeEmptyRow()] }));
}

public removeRow(index: number): void {
  this._draft.update((v) => ({
    ...v,
    rows: v.rows.filter((_, i) => i !== index),
  }));
}
```

Mutate the array on the draft signal by spreading — never `push` / `removeAt`.
Map incoming rows into **fresh objects**: FieldTree tags each array item it
adopts with a hidden identity Symbol, and adopting the caller's own objects
leaks that mutation back to them (and breaks `toEqual()` in their tests).

---

## Regression tests to copy

These five pin the behaviours the old `_updatingForm` / `_lastValue` guards
used to provide. The third is the one that matters most: it fails loudly if the
`previous` check is dropped from the `linkedSignal` computation, which is
otherwise an invisible, keystroke-level regression.

```ts
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

it("populates the draft from a bound model", async () => {
  fixture.componentRef.setInput("data", { name: "a", note: "n" });
  fixture.detectChanges();
  await fixture.whenStable();

  expect(component.form.name().value()).toBe("a");
  expect(component.form().dirty()).toBe(false);
});

it("does not autosave a normalized copy back over a value it was just given", async () => {
  // an untrimmed external value: a broken guard would overwrite it
  fixture.componentRef.setInput("data", { name: "  untrimmed  " });
  fixture.detectChanges();
  await fixture.whenStable();

  await wait(600); // past the autosave debounce
  fixture.detectChanges();

  expect(component.data()?.name).toBe("  untrimmed  ");
});

it("keeps an in-progress edit when its own save echoes back normalized", async () => {
  component.form.name().value.set("abc ");
  await wait(600);
  fixture.detectChanges();

  // the model got the trimmed value...
  expect(component.data()?.name).toBe("abc");
  // ...but the draft still holds what the user typed
  expect(component.form.name().value()).toBe("abc ");

  // so continuing to type yields "abc d", not "abcd"
  component.form.name().value.set(component.form.name().value() + "d");
  await wait(600);
  fixture.detectChanges();

  expect(component.form.name().value()).toBe("abc d");
  expect(component.data()?.name).toBe("abc d");
});

it("refuses to save an invalid draft and surfaces the errors", () => {
  component.form.name().value.set("");
  component.save();

  expect(component.data()).toBeUndefined();
  expect(component.form.name().touched()).toBe(true);
});

it("renders no <form> element, so it stays valid at any nesting depth", () => {
  expect(fixture.nativeElement.querySelector("form")).toBeNull();
});
```

For a manual-save component, drop the two autosave tests and assert instead
that `save()` writes the model and that the Save button is disabled while
`form().invalid() || !form().dirty()`.

> Verified: this template (TS + HTML + spec) was compiled with strict template
> type-checking and run green under `ng build` / `ng test` in an Angular 22.0.1
> workspace before being written down.
