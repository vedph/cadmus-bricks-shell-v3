# Migration prompt: reactive forms → Angular signal forms

Reusable brief for migrating an Angular library workspace from
`@angular/forms` reactive forms to `@angular/forms/signals`. Hand this to the
agent doing the work. Everything marked **measured** was verified empirically
in a real browser during a previous migration — do not re-derive it from
first principles, and do not trust contrary reasoning without measuring again.

---

## Goal

Migrate this Angular workspace from reactive to signal-based forms. The result
must be modern, clean, idiomatic signal-forms code with **no regressions**.
This is production code: fully understand a component before changing it.

Prefer the framework primitive over hand-rolled bookkeeping. If you find
yourself adding instance fields to remember what you last wrote, stop — you are
probably re-implementing `linkedSignal` (see *Deriving state from a model*).

## Workspace facts

- Zoneless; all components standalone; state already reactive (mostly signals,
  occasionally RxJS).
- Libraries live under `projects/<scope>/`; the demo app under `src/` is **out
  of scope**.
- All library tests are currently green.
- Run one library's tests: `ng test @scope/library-name`.
  Run all: `pnpm run test:lib`.
  Do **not** run bare `ng test` — the app tests are broken and irrelevant here.
- Validators: where code uses `NgxToolsValidators`, the signal-forms equivalent
  is `NgxToolsSignalValidators` (source: `D:\Projects\Spa\ngx-tools`).

## Process

1. **One library at a time.** Migrate, run that library's tests, fix
   regressions, then move on. This keeps a long job resumable.
2. **Do not run multiple agents over the same folder.** Concurrent edits race.
3. After each library, also rebuild it **and everything downstream of it**
   (see *Know what the browser actually runs*).
4. Keep a migration log, but **only record what you verified**. A previous
   migration recorded three confidently-wrong root causes in commit messages,
   and later work built on them. If you did not measure it, write "believed"
   and say how it could be checked.

---

## Know what the browser actually runs — read this before debugging anything

The single biggest time sink in the previous migration was **not a bug**. A
reported "the form submits and reloads the page" defect was already fixed in
source; the browser was executing a build from three hours earlier. Hours went
into debugging correct code, and the resulting commits recorded false
conclusions.

In this kind of workspace a library can reach the browser through several
routes, and they can disagree:

- `tsconfig.json` `compilerOptions.paths` → `./dist/<scope>/<lib>`
- `node_modules/@scope/<lib>` — a symlink to `dist/`, **or a published npm copy
  that shadows it**
- Vite's dependency pre-bundle in `.angular/cache/**/vite/deps/`, which is
  **not invalidated when you rebuild a library into `dist/`**

**Before investigating any symptom that contradicts the source:**

```bash
# what is actually being served?
ls -la node_modules/@scope/            # symlink to dist/, or a stale npm copy?
grep -r "someStringFromYourTemplate" .angular/cache/**/vite/deps/ dist/
```

Or from the page itself: fetch each loaded script and grep it for a string you
just changed. If it is not there, you are debugging the wrong code.

**Rules:**

- A library's source change only reaches the app after `ng build @scope/<lib>`.
- Rebuilding one library is not enough — **rebuild every library that depends
  on it**, in dependency order. A `build:libs`-style script that derives the
  order from the libraries' `package.json` files is worth creating on day one.
- If a change still does not appear: `rm -rf .angular/cache` and restart
  `ng serve`.
- Local workspace libraries must **never** exist as published copies in
  `node_modules`. If they do, library-to-library imports silently resolve to
  the published build. Make resolution uniform: pick exactly one mechanism for
  every local library, and add a guard that fails the build if a local library
  turns up in `node_modules`.

---

## Conversion reference

**Imports.** Drop `FormBuilder`, `FormControl`, `FormGroup`, `FormsModule`,
`ReactiveFormsModule`, `Validators`. Add from `@angular/forms/signals` as
needed: `form`, `FormField` (directive — goes in the component's `imports`
array in place of `ReactiveFormsModule`), `required`, `email`, `minLength`,
`maxLength`, `pattern`, `min`, `max`, `validate`, `validateTree`, `disabled`,
`readonly`, `hidden`, `applyEach`, `apply`, `applyWhen`.

**Structure.** Keep the component's public `model()` / `input()` / `output()`
API unchanged. Replace a constructor-built `FormGroup` synced by an `effect()`
with the canonical pattern in `signal-forms-component-template.md`:

1. pure `toDraft(model)` / `toModel(draft)` mapping functions;
2. a `linkedSignal` holding the editable draft;
3. `form(draft, schema)`;
4. an effect that clears interaction state when the draft is back in sync.

**Template.**

| reactive forms | signal forms |
| --- | --- |
| `[formControl]="x"` / `formControlName="x"` | `[formField]="form.x"` |
| `x.invalid && x.touched` | `form.x().invalid() && form.x().touched()` |
| `x.hasError('required')` | `form.x().getError('required')` |
| `x.valueChanges` subscription | `effect()` on `form.x().value()`, or `computed()` |
| `form.markAllAsTouched()` | `form().markAsTouched()` (descendants included by default) |

**FormArray → array field.** Mutate the array on the draft signal directly
(spread + filter; no `push` / `removeAt`), and use `applyEach(path.items,
itemSchema)` for per-row rules.

**Enable/disable.** Use the declarative `disabled(path, { when: () => … })`
rule in the schema rather than imperative `enable()` / `disable()` calls.

---

## Deriving state from a model: use `linkedSignal`, not an echo guard

A component with `model()` two-way binding both reads and writes the same
signal, so its own save comes back as an input change. **Do not** solve this
with instance fields:

```ts
// ✗ anti-pattern — a previous migration grew three of these per component
private _lastValue?: T;
private _hasLastValue = false;
private _lastSyncedDraft = '';
```

`linkedSignal`'s `previous` parameter makes the echo detectable with no fields
at all:

```ts
private readonly _draft = linkedSignal<T | undefined, TControls>({
  source: () => this.data(),
  computation: (data, previous) =>
    previous && JSON.stringify(data) === JSON.stringify(toModel(previous.value))
      ? previous.value        // echo of our own save: keep the live draft
      : toDraft(data),        // genuinely new value: rebuild
});
```

**Why the check is not optional.** `toModel()` normalizes — it trims strings
and maps `''` to `undefined`. So saving produces a value that differs from the
draft. Without the `previous` check, the echo rebuilds the draft and stomps
whatever the user is still typing.

**The test the existing suite will not contain:** type `"abc "` (trailing
space), wait past the autosave debounce, then keep typing. Correct behaviour:
the model receives `"abc"`, the draft still reads `"abc "`, so the next
keystroke gives `"abc d"`. Broken behaviour gives `"abcd"`. This *is* unit
testable — copy the spec from `signal-forms-component-template.md` into every
autosaving component you migrate.

**Where `reset()` goes.** `form().reset()` clears interaction state
(touched/dirty/submitted), not values. Key the effect that calls it on the
**draft**, not on the model — on an echo the draft does not change, so the
effect does not run, so a validation error is not cleared out from under the
user 300 ms after they typed it.

**When `linkedSignal` does not fit.** It models "value derived from a source,
locally overridable". If the sync also merges history (e.g. carrying notes
across a definitions change), reconciles the user's current selection, or
drives four other signals behind re-entrancy flags, it is **not** a derivation.
Leave those components alone and say why — forcing the primitive in is how you
introduce regressions.

---

## Forms and submission — corrected facts

The previous migration reasoned its way to two conclusions that are **false**.
Both were later measured in Chrome:

- **Nested `<form>` elements DO exist in the DOM.** The HTML nested-form
  elision rule is a *parser* rule: it applies when a browser parses markup
  text, not when Angular builds the tree through DOM APIs — which is always the
  case across component boundaries. *(measured: 2 nested forms in the DOM,
  inner buttons owned by the inner form.)*
- **`submit` and `reset` events never reach an ancestor form.** The DOM
  dispatch algorithm stops them at their own `form` element. An inner form can
  never trigger an outer form's handler. *(measured: propagation stopped
  exactly one node before the ancestor `<form>`.)*

### What to actually do

**Reusable/embeddable components should render no `<form>` element at all.**
Signal forms bind through `[formField]` on the individual controls; the
`<form>` tag is a reactive-forms leftover with no role. `[formRoot]` exists to
set `novalidate`, call `preventDefault()` on submit, and run a
`submission.action` configured on `form()`. A widget that declares no
`submission` action has nothing for it to do — and a `<form>` in a component
embeddable at any depth only creates invalid nested markup and stray Enter-key
submissions.

- Action buttons: **`type="button"` with an explicit `(click)="save()"`** —
  never `type="submit"` relying on form submission.
- Reserve `<form [formRoot]="tree">` for a component that genuinely *is* a
  submission root with a `submission.action`.
- Where a component legitimately wants Enter-to-confirm, use
  `(keydown.enter)` on the input rather than implicit form submission.

Background reading (note it describes the submission-root case, which most
widgets are not):
<https://www.angulararchitects.io/blog/all-about-angulars-new-signal-forms/#how-to-submit-signal-forms>

---

## Other verified hazards

- **`untracked()` and ported helpers.** A helper that used to read
  `FormControl.value` (untracked) now reads a signal, so it silently becomes a
  dependency of any effect that calls it. Wrap such reads in `untracked()`.
- **`toObservable()` emission is deferred** (it runs its own internal effect).
  A flag set and cleared synchronously inside an update method therefore always
  reads back `false` by the time a debounced subscriber sees it. Snapshot- or
  flag-based guards around `toObservable` pipelines do not work; compute the
  answer instead (`isDraftInSync()`).
- **Native input nullability.** `<input [formField]="…">` requires a
  non-nullable `string` (or `number | null` for numeric inputs). A
  `string | null` field errors at template type-check time. Use `''` as the
  empty sentinel for text fields. This does **not** apply to CVA-based Material
  controls (`mat-select`, `mat-checkbox`), which interop fine with `null`.
- **`required()` on an object field passes for any non-null object.** A target
  like `{ id: '', label: '' }` satisfies `required`. Validate the meaningful
  inner property instead.
- **FieldTree tags array-of-object items with a hidden identity Symbol** for
  its own reordering support. It shows up as an extra own property under
  `toEqual()`. In tests, compare through a JSON round-trip. In code, map
  incoming arrays into fresh objects rather than adopting the caller's own
  object references, or the tagging leaks back to them.
- **ng-packagr:** `"types": []` in a library tsconfig blocks *all* `@types` —
  list the ones you need explicitly. Non-peer dependencies need
  `allowedNonPeerDependencies` in `ng-package.json`. `TS2742` ("inferred type
  cannot be named") means a types package must be added as a dependency *and*
  to the `types` array.
- **Test-support symbols must be added to shared `TEST_IMPORTS` arrays** —
  every new signal-forms symbol used in a template will otherwise fail with
  `NG0303: Can't bind to '…'` across dozens of specs.

---

## Verification — required before declaring a library done

1. `ng test @scope/<library>` green.
2. `ng build @scope/<library>` clean, plus every downstream library.
3. **Green tests are not sufficient.** In the previous migration the whole
   suite was green while the app was visibly broken in the browser. Once per
   library group, actually run the app and exercise one representative flow —
   including a nested-widget flow, since nesting is where this class of bug
   lives.
4. When a symptom does not match the source, reproduce it before theorising.
   Driving headless Chrome over CDP (`--remote-debugging-port`, then
   `Runtime.evaluate`) is enough to script a click and read back the DOM, and
   it settles in minutes what reasoning gets wrong.

## Housekeeping

Report, but do not silently fix, anything outside the migration's scope —
leftover `console.log` calls in library code, pre-existing crashes, workspace
resolution problems. List them and let the owner decide.
