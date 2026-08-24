# Migrating libraries from reactive forms to Angular signal forms

Tracks progress migrating `projects/myrmidon/*` libraries from
`@angular/forms` reactive forms (`FormBuilder`/`FormGroup`/`FormControl`/
`ReactiveFormsModule`) to `@angular/forms/signals` (Angular 22+). One library at
a time, tests must stay green after each. `src/app` (demo/playground) is out of
scope for this pass.

## Conversion pattern

**Imports**: drop `FormBuilder, FormControl, FormGroup, FormsModule,
ReactiveFormsModule, Validators` from `@angular/forms`; add from
`@angular/forms/signals` as needed: `form`, `FormField` (directive, goes in the
component's `imports` array in place of `ReactiveFormsModule`), `required`,
`email`, `minLength`, `maxLength`, `pattern`, `min`, `max`, `validate`,
`validateTree`, `disabled`, `readonly`, `hidden`, `applyEach`, `apply`,
`applyWhen`. Swap `NgxToolsValidators` (from `@myrmidon/ngx-tools`) for
`NgxToolsSignalValidators`.

**State**: keep the component's public `model()`/`input()`/`output()` API
unchanged. Replace a `FormGroup` built in the constructor + synced via
`effect()` with:
1. A private writable `signal()` holding the draft/editable value.
2. `public readonly form = form(this._draft, (path) => { ...schema rules... });`
3. An `effect()` syncing incoming `model()`/`input()` → `this._draft` (replaces
   `updateForm()`/`.reset()`/`.setValue()` calls).
4. On save/emit, read `this.form().value()` and write to the output
   `model()`/`output()`.

**Templates**: `[formControl]="x"` / `formControlName="x"` →
`[formField]="form.x"`. `x.invalid && x.touched` → `form.x().invalid()` /
`form.x().touched()`. `x.hasError('required')` → `form.x().errors()` /
`form.x().getError('required')`. `x.valueChanges` subscriptions → `effect()`
reading `form.x().value()`, or `computed()` for pure derivation.

**FormArray → array field**: mutate the array on the draft signal directly
(spread + filter, no `push`/`removeAt`); use `applyEach(path, itemSchema)` for
per-item validation instead of a `FormGroup` per item.

**Cross-field validation** ("at least one of X or Y"): use
`NgxToolsSignalValidators.atLeastOneRequired`.

**Specs**: update `.spec.ts` files that drive the form via
`component.form.get('x').setValue(...)` etc. to the signal-forms equivalent.

Angular Material inputs (`matInput`, `mat-select`, `mat-autocomplete`, ...) are
CVA-based and `[formField]` interops with CVA controls directly — no custom
`FormValueControl` wrapper needed for those.

**Form submission**: every `<form>` element gets `[formRoot]="theFieldTree"`
(the `FormRoot` directive, `@angular/forms/signals`) instead of a hand-rolled
`(submit)="onXFormSubmit($event)" { event.preventDefault(); ... }` method —
`FormRoot` sets `novalidate` and calls `preventDefault()` on the native
`submit` event automatically, with zero behavior difference from the
hand-rolled version. It does **not** replace the save button's own
`(click)="save()"` — see "Post-migration fixes" below for why the actual
save action must stay on the button's `(click)`, never on native form
submission, in a tree this deeply nested.

## Library checklist (dependency order)

- [x] 1. `cadmus-mat-physical-grid`
- [x] 2. `cadmus-refs-decorated-counts`
- [x] 3. `cadmus-ui-custom-action-bar`
- [x] 4. `cadmus-ui-flag-set`
- [x] 5. `cadmus-mat-physical-size`
- [x] 6. `cadmus-cod-location`
- [x] 7. `cadmus-geo-location`
- [x] 8. `cadmus-refs-citation`
- [x] 9. `cadmus-refs-historical-date`
- [x] 10. `cadmus-refs-doc-references` — has `FormArray`
- [x] 11. `cadmus-text-block-view`
- [x] 12. `cadmus-ui-note-set`
- [x] 13. `cadmus-text-ed-txt`
- [x] 14. `cadmus-mat-physical-state`
- [x] 15. `cadmus-refs-chronotope`
- [x] 16. `cadmus-refs-lookup`
- [x] 17. `cadmus-refs-decorated-ids` — uses `NgxToolsValidators`
- [x] 18. `cadmus-refs-assertion`
- [x] 19. `cadmus-refs-external-ids` — has `FormArray`
- [x] 20. `cadmus-refs-proper-name` — uses `NgxToolsValidators`
- [x] 21. `cadmus-refs-asserted-chronotope` — uses `NgxToolsValidators`
- [x] 22. `cadmus-refs-asserted-ids`
- [x] 23. `cadmus-text-ed-md`

## Notes log

- **`cadmus-mat-physical-grid`**: `PhysicalGridLocationComponent`'s
  `preset`/`text`/`rowCount`/`columnCount` `FormControl`s became a single
  `PhysicalGridControls` draft signal + `form()`. `min()`/`readonly()` schema
  logic replaces the static `min="1"`/`[readonly]` template attributes — the
  `[formField]` directive owns those attributes on native inputs and errors if
  they're also set manually. **Gotcha**: a private helper (`updateGrid`/
  `updateText`) called from inside an `effect()` that reads other form-field
  signals (`form.rowCount().value()`, `form.columnCount().value()`) makes the
  effect implicitly depend on them — an unrelated preset-driven update to those
  fields then re-triggered the location-sync effect, which stomped the new
  values back to their location-derived defaults. Fixed by wrapping the
  `updateGrid()`/`updateText()` calls in `untracked()` inside that effect. This
  is a general hazard when porting reactive-forms effects to signal forms:
  any helper method that used to read plain `FormControl.value` (untracked)
  now reads a signal once ported, so it can silently become an effect
  dependency unless wrapped in `untracked()`.
- **`cadmus-refs-decorated-counts`**: two independent local forms
  (add-count controls, edited-count controls) built from two `signal()` +
  `form()` pairs. `disabled(path.id, { when: (ctx) => ctx.valueOf(path.hasCustom) })`
  replaces the old `hasCustom.valueChanges` subscription calling
  `id.disable()`/`id.enable()` — sibling-field-driven `disabled`/`readonly`/
  `hidden` logic belongs in the schema via `ctx.valueOf(otherPath)`, not in a
  component `effect()`. **Gotcha**: native `<input [formField]="...">` requires
  the field's value type to be non-nullable `string` (or `number | null` for
  numeric inputs) — a `string | null` field type errors at template
  type-check time. Fields bound to plain text inputs must use `''` as their
  "empty" sentinel, not `null` (already the case for `text` in
  `cadmus-mat-physical-grid`; here it meant widening `id`/`custom`/`batch`/
  `tag`/`note` from `string | null` to `string`). This restriction does not
  apply to fields bound to CVA-based Material controls (`mat-select`,
  `mat-checkbox`), which still interop fine with `null`. Also: removed the
  outer `[formGroup]="form"` wrapper (signal-forms `[formField]` bindings
  don't need a container directive) and replaced the inner
  `[formGroup]="editedForm" (submit)="saveCount()"` with a plain
  `(submit)="onEditedFormSubmit($event)"` handler that calls
  `event.preventDefault()` itself, since `ReactiveFormsModule`'s
  `FormGroupDirective` was silently doing that `preventDefault()` before.
- **`cadmus-ui-custom-action-bar`**: false positive — imported
  `FormsModule`/`ReactiveFormsModule` but never actually used any reactive-forms
  API (no `[formControl]`/`formGroup` anywhere). Just dropped the unused
  imports, no signal-forms conversion needed.
- **`cadmus-ui-flag-set`**: single-field `customForm` (the "add custom flag"
  text input) converted straightforwardly, no validators to port (none
  existed). The `flags$`/`checkedIds$` `BehaviorSubject`/`combineLatest`
  plumbing for `userFlags` is unrelated RxJS state, not reactive forms — left
  untouched (out of scope). README's usage example shows a *consumer*
  component storing `checkedIds` in a reactive-forms `FormControl` — that's
  external/app-side code, not this library's own forms, so left as-is per the
  libraries-only scope.
- **`cadmus-mat-physical-size`** (3 components): the hardest one so far.
  - `physical-dimension`: sibling-driven `disabled`/`readonly` cascades
    (`disabled`, `unitDisabled` inputs) became pure schema `disabled(path.x,
    {when})` declarations instead of imperative `form.disable()`/
    `unit.disable()` effects — much cleaner. `[formField]` on a native numeric
    `<input>` reserves the `min` attribute even with **no** `min()` validator
    declared, so a static `min="0"` HTML attribute always conflicts; added
    `min(path.value, 0)` schema validators everywhere a dimension value input
    had one, across all 3 components in this library.
  - `physical-size`: the FormGroup's cross-field custom validator
    (`validateUnit`) became a root-level `validateTree(path, ctx => ...)`
    using `ctx.valueOf(path.x)` to read sibling fields. The debounced
    `form.valueChanges` → model sync (`distinctUntilChanged, debounceTime(400)`)
    was ported via `toObservable(this._draft).pipe(...)` from
    `@angular/core/rxjs-interop` — same Subscription-based lifecycle,
    `ngOnDestroy` still unsubscribes. **Real correctness gotcha**: reactive
    forms' `{emitEvent: false}` on every programmatic `setValue()` call had no
    signal-forms equivalent — `.value.set()` always notifies. Without it, the
    debounced model-sync pipeline re-triggered itself forever (model→form
    effect writes `_draft` → debounce fires → writes `size` → model→form
    effect fires again → ...), a slow ~400ms-cadence infinite loop. Fixed by
    comparing the newly computed model to the current one (structural
    equality) before calling `.set()` in the debounced handler, so no genuine
    change means no signal write, breaking the cycle. Also simplified the
    `label` computed: it used to read plain (non-reactive) `FormControl.value`
    behind a manual `formChanged` signal bumped by the debounced sync; since
    signal-form field reads are themselves reactive, `label` now reads
    `this.form.wValue().value()` etc. directly and updates immediately,
    letting the `formChanged` trick be deleted entirely.
  - `physical-measurement-set`: same add-form/edited-form shape as
    `cadmus-refs-decorated-counts`. Removing the outer `[formGroup]` wrapper
    also removes `FormGroupDirective`'s implicit `preventDefault()` on
    `submit` events bubbling from any `type="submit"` button inside the
    `<form>` — added an explicit `(submit)="onFormSubmit($event)"` handler
    that calls `event.preventDefault()` since a `type="submit"` "Save
    measurement" button lives inside this form. **Test gotcha**: an
    `effect()` reacting to a field's value (e.g. hasCustom → focus) does not
    flush synchronously or on a bare `setTimeout(...,0)` await in a test —
    the test must `fixture.detectChanges()`/`await fixture.whenStable()`
    after the field write for Angular to actually run the effect.
- **`cadmus-cod-location`**: single-field form, but with two notable
  patterns:
  - Dynamic `required`/`pattern` validators toggled imperatively via
    `clearValidators()`/`addValidators()` in the original became declarative:
    `required(path.text, { when: () => !!this.required() })` and
    `pattern(path.text, () => this.single() ? PATTERN_A : PATTERN_B)` — the
    `pattern()`/`required()` validators accept a `LogicFn` in place of a
    static value/condition, so no manual re-validation call (the old
    `updateValueAndValidity()` effect) is needed at all.
  - The original imperatively called `text.setErrors({invalidLocation: true})`
    on parse failure — reactive forms' `setErrors()` *replaces* all of a
    control's errors, which has no signal-forms equivalent (errors are always
    the union of every declared `validate()`/`pattern()`/etc. rule for that
    field, never imperatively cleared). Ported as a real `validate()` schema
    rule that independently recomputes parseability, so `invalidLocation` is
    now a live/reactive error rather than a one-shot imperative one; the
    debounced handler still calls `markAsTouched()` itself so the template's
    `dirty()||touched()` display guard still works. A `_changeFrozen` boolean
    guard in the original never actually did anything (it was reset
    synchronously, long before the 300ms-debounced RxJS callback it was meant
    to gate could fire) — convergence in both the old and new code actually
    comes from `distinctUntilChanged()` on the debounced pipeline; the
    (equally inert) guard was dropped rather than ported.
- **`cadmus-geo-location`**: largest/most complex conversion so far
  (`GeoLocationEditor`, 8-field form + MapLibre map integration, ~90-test
  spec). Key points:
  - Reactive forms' `setValue()` never marks a control dirty by itself; this
    was already known, but this component leans on it heavily —
    `handlePointClick`/`onMarkerDragEnd`/`setPointFromGeometry`/`locateUser`/
    `clearDrawing`/`toggleDrawingMode` all call `.markAsDirty()` explicitly
    right after `.value.set()` so the save button's `!form().dirty()` check
    reflects programmatic (map-driven) edits, not just typing. Confirmed
    (via the full test run) that marking a **child** field dirty does
    propagate up to the root `form().dirty()`, same as `FormGroup`.
  - The original combined `filter(() => !this._updatingForm)` +
    `debounceTime(600)` on `form.valueChanges` to suppress a debounced
    map-overlay-refresh effect during programmatic (non-user) form updates —
    this relies on reactive-forms' `valueChanges` emitting *synchronously*
    inside each `setValue()` call, so the filter's synchronous flag check is
    still accurate at emission time. `toObservable()` bridges signals to
    RxJS via a deferred internal `effect()`, so the same flag would already
    be reset by the time it's checked — an unreliable port, not just a
    simplification. Investigated what the flag actually protected: only one
    of the four synced side effects (`syncMapCenter`) had a real,
    documented risk ("avoid a duplicate flyTo that interrupts the
    animation"); the other three are harmless to recompute redundantly.
    Fixed at the output instead of the source: `syncMapCenter()` now skips
    `mapCenter.set(...)` if the computed `[lng, lat]` already equals the
    current value, which prevents the duplicate flyTo regardless of *why*
    the debounced sync fired. `_updatingForm` itself was removed entirely.
  - Test setup gotcha: this spec uses `TestBed.overrideComponent(..., {set:
    {imports: TEST_IMPORTS}})` to swap in fake MapLibre stub components for
    jsdom. `overrideComponent` **replaces** the imports array rather than
    merging with it, so the original `TEST_IMPORTS` array had to list
    `ReactiveFormsModule` itself for `[formControl]` to resolve — easy to
    miss that the signal-forms port needs `FormField` added to that same
    array (all 71 component-level tests fail with a single
    `NG0303: Can't bind to 'formField'` error otherwise, which does not
    point at the fixed array in the stack trace).
- **`cadmus-refs-citation`** (3 components using forms; `citation-set` was a
  false positive, just an unused `ReactiveFormsModule` import removed).
  - `citation`: 5 independent local forms (scheme+lastStep, free-text,
    set-editor, number-editor, string-editor). The number/string editors'
    validators (min/max range, suffix pattern, mask pattern) are resolved
    **at runtime** per edited step (looked up from the citation scheme), not
    known statically — originally done by imperatively calling
    `setValidators()`/`clearValidators()`/`updateValueAndValidity()` inside
    `editStep()`. Ported to declarative `min(path, () => this.minNrValue())`
    / `pattern(path, () => this._maskPattern())` schema rules that read
    signals `editStep()` updates — the signal read makes the validator
    reactive without any imperative re-validation call needed. **Found and
    fixed a latent bug** doing this: the original only pushed
    `Validators.min`/`Validators.max` when `stepDef.domain.range` was
    truthy, leaving `minNrValue`/`maxNrValue` signals *stale* from a
    previous step when it wasn't (harmless there, since the validators array
    simply excluded them that time) — the signal-forms port had to
    explicitly reset those signals to `undefined` when `!stepDef.domain.range`,
    since the new validators are always-live LogicFns that would otherwise
    keep enforcing the stale range. `toObservable()` was called inside
    `ngOnInit()` (not the constructor) for the scheme/lastStep watchers —
    `NG0203: toObservable() can only be used within an injection context`;
    fixed by injecting `Injector` in the constructor and passing
    `{ injector: this._injector }` explicitly.
  - `compact-citation`: single-field `range` toggle form. **Important,
    generalizable finding**, found by debugging two failing tests: an
    `effect()` reading a signal can be **re-invoked with the exact same
    (reference-equal) tracked value** — confirmed empirically here (logged
    `citation() === lastSeenCitation` and saw `true` on a second,
    unexplained re-run) — apparently whenever other signal writes happen in
    the same view/CD cycle. `citation.component.ts` already guarded against
    this with a `_lastParentCitation` reference check (inherited from before
    this migration); `compact-citation` lacked the equivalent guard, and
    without `{emitEvent:false}` to mask it, the spurious re-run's
    model-driven `updateAB()` call clobbered a just-made interactive change
    to `range`. **The general lesson: any `effect()` whose body has
    non-idempotent side effects (not just "recompute the same derived
    value") needs a `last-processed-value !== current` guard, even when the
    tracked signal is a plain object/model reference that "shouldn't" have
    changed.** Beyond that guard, reactively *watching* a field's value to
    react to "the user toggled this" (as the original did via
    `valueChanges`, relying on `{emitEvent:false}` to ignore programmatic
    writes) doesn't have a clean signal-forms equivalent — the fix was to
    stop watching reactively and instead handle the toggle's own `(change)`
    DOM event explicitly (`onRangeToggle($event.checked)`), which by
    construction only fires for genuine user interaction. This is the same
    "explicit event handler instead of implicit reactive watch" idiom used
    for `RefLookupComponent.onScopeChange` and the various `onXFormSubmit`
    handlers elsewhere in this migration — worth reaching for by default
    whenever a value-watching effect exists only to react to *user*
    changes, not model-driven ones.
- **`cadmus-refs-historical-date`** (3 components): applied the accumulated
  patterns cleanly — all 177 tests passed on the first full run.
  `datation`/`asserted-historical-date` both have a debounced
  form-field-changes → model `.set()` autosave (the same shape as
  `cadmus-mat-physical-size`'s), so both got (a) a `_lastX`
  reference-equality guard on the model→form sync `effect()` and (b) a
  content-equality check before the debounced handler's `.set()` back to
  the model — the two defenses established in the previous two libraries,
  applied proactively this time instead of discovered by a failing test.
  `historical-date` itself has no debounced watcher (only two fields,
  `dateText`/`range`, driven by explicit method calls), so it needed
  neither. `asserted-historical-date`'s spec is a smoke test only.
- **`cadmus-refs-doc-references`** — first `FormArray` case, and where the
  "last-processed" guard pattern was finally nailed down correctly.
  `FormArray`-of-`FormGroup`s (dynamically built rows, each with its own
  debounced `valueChanges` subscription + manual subscription-realignment
  on reorder) becomes a single array-valued field, `applyEach()` for
  per-row validators, and ONE `toObservable(draft).pipe(debounceTime())`
  autosave for the whole array — the entire per-row-subscription apparatus
  (`_subs`, `swapArrElems`, `unsubscribeIds`) disappears, since reordering
  a plain array needs no subscription bookkeeping. A `FieldTree` over an
  array type is itself array-like (`length`, numeric indexing, iterable),
  so `@for (item of form.someArrayField; track $index)` works directly and
  each `item` is the per-row `FieldTree`.
  **The "last-processed" guard, done right** (found via two more failing
  tests after the array conversion itself already worked): earlier
  libraries (`datation`, `asserted-historical-date`, `compact-citation`)
  set their `_lastX` guard *inside* the model-sync `effect()`, right before
  calling `updateForm()`. That is too late — the effect is deferred, so a
  synchronous save can legitimately be followed by *further* draft edits
  before the effect ever runs, and the guard is being compared against a
  value that is now stale relative to the draft. Comparing against the
  *current* draft content instead (via `getReferences()`) doesn't work
  either: reading the draft inside the effect makes the draft itself a
  tracked dependency (the untracked() hazard from `cadmus-mat-physical-grid`,
  recurring), so the effect re-fires on every keystroke and reverts each
  one to the last-saved snapshot. **The fix that actually works**: set the
  guard *synchronously inside the save function itself*, at the exact
  moment it calls `.set()` on the model (not inside the effect that reacts
  to the model) — then the effect's reference check is comparing against a
  value that was captured at the true source of truth, immune to whatever
  happens afterward. Also needed a separate `_hasLastX` boolean alongside
  the guard, since `undefined` is both "never saved anything yet" and a
  legitimate real value (e.g. "references reset to `undefined`"), and a
  bare `_lastX === undefined` collides the two.
  **Follow-up (done)**: retrofitted `datation`, `asserted-historical-date`,
  `compact-citation`, `citation` (all in `cadmus-refs-historical-date`/
  `cadmus-refs-citation`), and `cadmus-mat-physical-size`,
  `cadmus-cod-location`, `cadmus-geo-location` from earlier in the
  migration. The final, correct shape needs **both** halves, not just one:
  1. The model-sync `effect()` records, unconditionally, whatever value it
     actually processes (`_lastX = value; _hasLastX = true;` right before
     calling `updateForm()`) - guards against the effect being spuriously
     re-invoked with an unchanged *external* value (confirmed to really
     happen - see the `compact-citation` entry above).
  2. Every site that writes the model (debounced autosave, explicit
     save()/parse() actions) ALSO sets the same `_lastX`/`_hasLastX`
     synchronously, at the point of writing - guards against the effect
     processing its own echo *after* further local draft edits already
     happened (effects are deferred, so this really can interleave).
  Either guard alone is insuffient: effect-only reintroduces the
  `compact-citation` stomp (confirmed by re-running its tests with only the
  save-site guard - 2 failures came back); save-site-only reintroduces the
  spurious-external-refire risk. A separate `_hasLastX` boolean is
  required alongside `_lastX` in every case, since `undefined`/`null` is
  usually both "nothing saved yet" and a legitimate real value. All 6
  retrofitted libraries' full test suites stayed green throughout.
- **`cadmus-ui-note-set`**: applied the by-now-established patterns
  proactively (combined effect+save-site guard on the `set` model sync) —
  all 36 tests passed on the first run. Notable simplification: the
  per-note-definition `required`/`maxLength` validators, previously applied
  imperatively (`setValidators`/`clearValidators`/`updateValueAndValidity`
  inside `editNote()`) every time the selected key changed, became pure
  declarative schema rules reading the `currentDef()` signal
  (`required(path.text, {when: () => !!this.currentDef()?.required})`,
  `maxLength(path.text, () => this.currentDef()?.maxLength)`) — `editNote()`
  no longer needs to touch validators at all, it just updates `currentDef`
  and the schema reactively re-validates. The vestigial, never-read
  `reqNotes` control (a `Validators.requiredTrue`-guarded field with no
  template binding and no internal reader, likely meant for an external
  consumer checking overall `form.valid`) was preserved via a `validate()`
  rule for behavioral fidelity even though nothing in this codebase
  exercises it.
- **`cadmus-text-ed-txt`**: `EmojiImeComponent`'s single `name` field —
  simplest conversion so far, and no model→form/autosave shape at all (the
  form's only consumer is a pure derived side effect, `lookupEmoji()`, not a
  write-back to a `model()`), so none of the last-processed guard machinery
  applied here. Moved the `toObservable(this.form.name().value).pipe(
  distinctUntilChanged(), debounceTime(300))` lookup subscription from
  `ngOnInit()` into the constructor (no other reason remained to implement
  `OnInit`), confirmed `toObservable()` + `debounceTime()` still works fine
  under `vi.useFakeTimers()`/`vi.advanceTimersByTimeAsync()`. Replaced the
  removed `[formGroup]` wrapper's implicit submit handling with an explicit
  `(submit)="onFormSubmit($event)"` calling `event.preventDefault()` then
  picking the first matching emoji, matching the established idiom.
- **`cadmus-mat-physical-state`**: `PhysicalStateComponent`'s 6-field form
  (`type`/`features`/`hasDate`/`date`/`reporter`/`note`), no debounced
  autosave, save is only explicit (button/submit), so no last-processed
  guard was needed. Confirmed `[matDatepicker]` on a native `<input>` still
  goes through the CVA path (`MatDatepickerInput` registers
  `NG_VALUE_ACCESSOR`), so the `date` field could stay `string | null`
  despite being a native `<input>` tag — the "native input needs
  non-nullable string" rule is actually about whether a `ControlValueAccessor`
  is registered on the element, not about the tag name. By contrast
  `reporter`/`note` bind to plain `matInput` (no CVA) in their free-text
  branches, so both were widened to non-nullable `string` with `''` as the
  empty sentinel, same as `type` already was. **Correctness nuance**:
  widening `reporter`/`note` from `string | null` to `string` silently
  changes `getState()`'s `?.trim()` behavior — `null?.trim()` short-circuits
  to `undefined` via optional chaining, but `''.trim()` evaluates to `''`
  (a defined empty string), so `?.trim()` alone no longer reproduces
  "empty means absent from the saved model" once the field can't be null;
  fixed by explicitly falling back with `.trim() || undefined` for the two
  fields that used to rely on `null` for that behavior (not needed for
  `type`, which was always non-nullable and never had that behavior).
  Adopted the `cadmus-geo-location` idiom for model→form sync: overwrite
  the whole draft object via `this._draft.set({...})` and then call
  `this.form().reset()` afterward purely to clear dirty/touched state —
  `reset()` does not restore values (those come from the draft signal
  itself), only pristine/untouched flags. **Test-writing gotcha,
  reconfirmed**: `field().value.set(x)` alone does not mark a field dirty,
  same as reactive forms' `setValue()` — a test asserting "valid and dirty"
  behavior needs an explicit `field().markAsDirty()` call alongside the
  `value.set()`, or it will observe `dirty() === false`.
- **`cadmus-refs-chronotope`**: `ChronotopeComponent`'s 4-field form
  (`tag`/`place`/`hasDate`/`date`), debounced autosave shape — applied the
  `datation`-style combined guard proactively (effect-side reference
  guard + save-site guard on the `chronotope` model, plus a
  `chronotopesEqual()` content check before the debounced handler writes)
  and all 33 tests passed on the first run. `date` holds a
  `HistoricalDateModel | null` object but is never bound via `[formField]`
  (it's passed to the nested `HistoricalDateComponent` through plain
  `[date]`/`(dateChange)` bindings instead), so it was exempt from the
  native-input non-nullable-string rule entirely. **Newly confirmed
  API**: the root `FieldState` (`this.form()`) exposes `markAsTouched()`,
  `markAsDirty()`, and `markAsPristine()` directly — and critically,
  `markAsTouched()` called with no options **cascades to every descendant
  field** by default (only `{ skipDescendants: true }` stops it), making
  `this.form().markAsTouched()` the exact equivalent of reactive forms'
  `FormGroup.markAllAsTouched()`. **Found and fixed another latent bug**
  while porting the template: the original error checks used
  `tag.hasError('max-length')`/`place.hasError('max-length')`, but
  `Validators.maxLength`'s actual error key is `'maxlength'` — a typo that
  silently meant the "too long" error messages never rendered in the
  original component. Ported to the correct `getError('maxLength')` (the
  signal-forms key, confirmed camelCase from `cadmus-mat-physical-state`),
  which now genuinely displays the error — a behavior change from the
  original, but a bugfix in the same spirit as the `citation.component.ts`
  latent-bug fix earlier in this migration.
- **`cadmus-refs-lookup`** (4 components; `ref-lookup-doc-references` was a
  false positive, unused `FormsModule`/`ReactiveFormsModule` imports
  removed). The other 3 all use signal forms now.
  - `ref-lookup`: the trickiest field type so far — `lookup` holds `any`
    (a typed string while the user is searching, OR a full picked-item
    object once selected, OR `null` when cleared), bound to a plain native
    `<input matInput [matAutocomplete]="lookupAuto">`. Confirmed
    `MatAutocompleteTrigger` itself registers `NG_VALUE_ACCESSOR`, so this
    native `<input>` goes through the CVA path despite `matInput` alone
    having no CVA — same "CVA presence, not tag name" rule found in
    `cadmus-mat-physical-state`'s `matDatepicker` case. **Major new
    finding, cost a debug cycle**: setting a signal-forms leaf field's
    value to `undefined` (`field().value.set(undefined)`) silently
    unmaps that field's `FieldTree` accessor — the *next* read of
    `this.form.someField` throws `TypeError: ... is not a function`,
    even though the exact same expression worked fine moments earlier.
    Reproduced by porting `item.set(undefined)` / `lookup.reset()`
    (which reactive forms treats as "clear to null/undefined"
    interchangeably) too literally. **Fix: always use `null`, never
    `undefined`, as the "empty" sentinel for a signal-forms field's
    value** — matches the sentinel convention already used everywhere
    else in this migration (`''` for strings, `null` for nullable
    objects), now confirmed load-bearing rather than just a style
    preference. `toObservable(this.form.lookup().value)` replaced
    `this.lookup.valueChanges` directly with no guard needed — unlike
    the debounced-autosave components elsewhere in this migration, this
    field's debounce pipeline (`items$`) never writes back to any model
    signal, so there's no model↔form echo loop to guard against.
  - `ref-lookup-set`: single `config: RefLookupConfig | null` field
    (a plain object value, bound only to a CVA `mat-select`, never to a
    native input) — confirmed object-valued leaf fields work fine
    (only `undefined` is the hazard, not "object" per se). `ngOnInit()`
    needed `toObservable(..., { injector })` (the citation.component.ts
    fix) since it's not the constructor; swapped the manual
    `Subscription`/`ngOnDestroy` for `takeUntilDestroyed(destroyRef)` —
    note `takeUntilDestroyed()` wants a `DestroyRef`, not the `Injector`
    already on hand for `toObservable()`, so both had to be injected
    separately.
  - `ref-lookup-doc-reference`: two independent local forms in one
    component (the 4-field `type`/`tag`/`citation`/`note` form, and a
    standalone single-field `pickerType` form) — kept them as two
    separate `signal()`+`form()` pairs rather than merging `pickerType`
    into the main draft, specifically so that `form().reset()` (called
    whenever the `reference` model resyncs) cannot cascade and clear
    `pickerType`'s independent dirty/touched state, matching the
    original's two-separate-`FormControl`s behavior exactly. Preserved
    (did not fix) a pre-existing latent bug: `tag` never actually had a
    `required` validator in the original, only `maxLength`, so the
    template's "tag required" error check was always-dead code before
    and remains always-dead code now — unlike the `chronotope` typo case,
    this isn't a wrong error-key typo, it's a validator that was simply
    never declared, so adding one would be a scope-creeping behavior
    change rather than a bugfix.
- **`cadmus-refs-decorated-ids`** — first `NgxToolsValidators` case;
  `NgxToolsSignalValidators.strictMinLength(path.editedIds, 1)` (from
  `@myrmidon/ngx-tools`, already built/exported in the installed package)
  is a schema-registering call, used exactly like `required`/`maxLength`
  inside the `form(this._draft, (path) => {...})` callback — no different
  from any other validator here. Two independent local forms: `idForm`
  (single-item editor: id/rank/tag/sources) and `form` (wraps the whole
  `editedIds` array with the strict-min-length rule). `idForm`'s
  enable/disable toggle (open vs. closed editor) has no imperative
  `.enable()`/`.disable()` equivalent in signal forms — confirmed
  `disabled` is 100% derived from schema-declared `disabled(path, {when})`
  logic (no settable state, unlike `dirty`/`touched`/`pristine` which
  are genuinely mutable via `markAsDirty()` etc.), and a `disabled()` set
  on a parent path cascades to every descendant field automatically (its
  `disabledReasons` computed explicitly folds in the parent's). Modeled
  the toggle as a `_idEditorOpen` signal read by `disabled(path, {when:
  () => !this._idEditorOpen()})` at the form root.
  **Major new finding, cost a second debug cycle**: assigning an
  externally-owned array of plain objects directly into a signal-forms
  draft (`this._draft.set({editedIds: incomingArray})`) causes the
  FieldTree to tag each array item with a hidden identity Symbol -
  **mutating the caller's own objects in place**, not just the
  internally-stored copies, and not lazily on `.value()` read but as soon
  as the array is adopted. Caught by a test that set `ids` from a literal
  array and later found that same literal array's objects carrying an
  extra `Symbol()` key. Two-sided fix, matching a pattern
  `cadmus-refs-doc-references` had already established (its `toControls()`
  on the way in, `getReferences()`'s `.map()` rebuild on the way out,
  neither previously called out in this log): (1) in `updateForm()`,
  `.map()` incoming array items into fresh plain objects before ever
  calling `_draft.set()`, so only *our own* copies can be mutated, never
  the caller's; (2) in every place data crosses back out to the `ids`
  model (`save()`, the debounced autosave), read the plain `_draft()`
  signal and `.map()` fresh objects again rather than reading
  `this.form.editedIds().value()` directly. Internal array mutation
  helpers (`moveIdUp`/`moveIdDown`/`deleteId`/`saveEditedId`) were also
  switched from `this.form.editedIds().value.set(...)` to
  `this._draft.update(...)`, mirroring `doc-references`' existing style,
  since there's no reason to route purely-internal array bookkeeping
  through the FieldTree accessor at all. Tests that still assert on
  `component.form.editedIds().value()` directly (legitimate - they are
  testing the field itself, not the emitted model) needed a
  `JSON.parse(JSON.stringify(...))` round-trip helper to strip the
  Symbol before `toEqual()`, since `toEqual` **does** include Symbol-keyed
  own properties in its comparison. **General lesson for any future
  array-of-objects field**: never adopt a caller-supplied object array
  reference directly into a draft signal - always `.map()` it into fresh
  objects first, both coming in and going back out.
  **Post-migration audit**: dispatched a research pass over all 16
  previously-migrated libraries specifically checking for this same
  array-of-objects-adopted-by-reference hazard - none found (every other
  array-of-object field either lives only on the external model, never
  entering a draft signal, or `cadmus-refs-doc-references`, which already
  had the map-in/map-out defense independently, just not previously
  called out in this log). One adjacent, narrower-scope finding flagged
  but not fixed: `cadmus-refs-lookup`'s `ref-lookup-set.component.ts`
  passes a single external `RefLookupConfig` object (not an array) by
  reference into its draft field - unconfirmed whether the same
  Symbol-tagging mutation applies to single-object (non-array) fields;
  worth a follow-up look if it ever causes a visible issue, but no test
  currently exercises it and single-object identity tracking has no
  obvious reason to need the same reordering-support machinery arrays do.
- **`cadmus-refs-assertion`**: 4-field form (`tag`/`rank`/`note`/
  `references`) with both a debounced autosave AND a `references` array
  managed by the same map-in/map-out defense as `decorated-ids`.
  **Real correctness subtlety, caught by an existing test** (`should not
  autosave a debounced no-op after an externally set assertion`): this
  component trims `tag`/`note` on the way OUT (`getAssertion()`) but not
  on the way IN (`updateForm()`), so a content-equality guard comparing
  "freshly computed output" against "current model" (the pattern that
  worked fine for `datation`/`chronotope`) does NOT work here - an
  external `assertion.set({tag: '  untrimmed  ', ...})` produces a
  draft whose computed output (`'untrimmed'`, trimmed) genuinely differs
  from the current model (`'  untrimmed  '`, untrimmed), so a naive
  equality check would wrongly treat the post-sync debounce firing as a
  real edit and stomp the untrimmed model value. The original reactive-
  forms code solved this with an `_updatingForm` boolean checked via
  `filter()` placed before `debounceTime()` in the pipe - reactive
  forms' `valueChanges` fires synchronously inside `setValue()`, so the
  flag is still `true` at the moment the filter checks it, even though
  it's reset to `false` immediately afterward. Porting that flag naively
  to `toObservable()` fails exactly as documented in the
  `cadmus-geo-location` entry above: `toObservable()`'s emission is
  deferred through its own internal `effect()`, so by the time the
  debounced subscriber's callback runs, a synchronously-cleared flag has
  long since flipped back to `false`. **Fix**: replace the flag with a
  `_lastSyncedDraft` JSON snapshot, captured whenever `updateForm()`
  writes the draft (both from an external sync and, redundantly but
  harmlessly, at the end of `saveAssertion()`) and compared against the
  current draft's JSON at the moment the debounce fires - if they
  match, nothing has genuinely changed since the last sync/save, so skip;
  this sidesteps the trim-asymmetry entirely because it compares the raw
  draft against its own prior raw snapshot, never against the
  differently-shaped (trimmed) output. Combined with the usual effect-side
  `_lastAssertion`/`_hasLastAssertion` reference guard on the model.
- **`cadmus-refs-external-ids`** - second `FormArray` case, an array of
  rows each with a nested `Assertion` object (edited via a separate
  `cadmus-refs-assertion` instance, never through `[formField]`). Applied
  the `doc-references` architecture directly: `applyEach(path.idsArr,
  (row) => {...})` for per-row `required`/`maxLength` validators, one
  unified `toObservable(this._draft).pipe(debounceTime(300))` autosave,
  and the `_lastSyncedDraft` JSON-snapshot guard (from
  `cadmus-refs-assertion`) to distinguish a real edit from the debounce
  re-firing after `updateForm()`'s own write. **Kept a deliberate
  hybrid**, unlike every array-field component so far: structural
  mutations (`addId`/`removeId`/`moveIdUp`/`moveIdDown`/`clearIds`/
  `saveAssertion`) call `emitIdsChange()` *immediately*, synchronously,
  in addition to going through the debounced pipeline - the original
  reactive-forms version emitted structural changes immediately (via
  direct `ids.set()` calls) while only per-field *edits* went through a
  debounced `valueChanges` subscription, and several tests assert on the
  model synchronously right after calling `addId()`/`removeId()`/etc.
  with no `await`. `emitIdsChange()` also updates `_lastSyncedDraft` to
  the just-emitted state, so the debounce firing ~300ms later for the
  same structural change is a correctly-recognized no-op rather than a
  redundant duplicate save.
  **Major new finding**: a per-row field write reached through
  `applyEach()` (e.g. `component.idsArr[0].value().value.set(x)`) does
  update the draft correctly - reading `this._draft()` immediately
  afterward shows the new value - but the `toObservable(this._draft)`
  pipeline's internal effect **does not fire under
  `vi.useFakeTimers()`/`vi.advanceTimersByTimeAsync()`** for this
  specific case, even though the exact same `toObservable()` +
  `debounceTime()` + fake-timers combination was already confirmed
  working (in `cadmus-text-ed-txt`'s spec, and elsewhere) for *scalar*
  (non-array) fields. Confirmed by switching two failing tests from fake
  timers to real timers (`await new Promise(resolve =>
  setTimeout(resolve, 400))`) with no other change - they passed
  immediately. Root cause not fully isolated (plausibly `applyEach`'s
  per-item change propagation schedules its notification differently
  than a top-level field write, in a way fake timers' clock don't
  advance past), but the practical rule going forward: **when a test
  needs to observe a debounced autosave triggered by a write to a field
  reached through `applyEach()`/an array item, use real timers
  (`setTimeout` + `await`), not `vi.useFakeTimers()`** - reserve fake
  timers for debounces on top-level scalar fields, where they're already
  proven reliable.
  Also ported the `ngAfterViewInit` "focus the newly added row" QueryList
  subscription using a `_suppressFocus` flag that is set by
  `updateForm()` but deliberately *not* reset synchronously at the end
  of it - `idQueryList.changes` only fires once change detection has
  actually re-rendered the `@for` loop, well after `updateForm()`
  returns, so the flag must survive until the subscription itself
  consumes (clears) it - the same category of hazard as the
  `toObservable()`-vs-synchronous-flag timing issues elsewhere in this
  migration, just applied to `QueryList.changes` instead of an
  Observable bridge.
- **`cadmus-refs-proper-name`** (2 components) — second `NgxToolsValidators`
  case.
  - `proper-name-piece`: `type`/`value` fields can hold EITHER a plain
    string OR a full thesaurus-entry object
    (`TypeThesaurusEntry | ThesaurusEntry | string | null`), and are bound
    to a `mat-select` in one template branch and a **plain, non-CVA**
    `<input matInput>` in the other. This is a genuinely new situation:
    `[formField]` on the native-input branch requires the field's static
    type to be string-compatible (confirmed via a compile error), and a
    union that includes a bare object type fails that check outright,
    regardless of nullability - unlike `cadmus-refs-lookup`'s `any`-typed
    `lookup` field, which got a pass specifically because
    `MatAutocompleteTrigger` registers a CVA on that same native input.
    No CVA exists here, so `[formField]` genuinely cannot bind the
    free-text branch. **Fix**: keep `[formField]` on the `mat-select`
    branch only (CVA tolerates any type); bind the free-text `<input>`
    manually via `[value]`/`(input)`/`(blur)`, calling
    `field().value.set(...)`, `field().markAsDirty()`, and
    `field().markAsTouched()` by hand - `required()`/`getError()`/
    `dirty()`/`touched()` all keep working normally on the field
    regardless of which path wrote to it. Also simplified away the
    original's manual `BehaviorSubject` + `combineLatest` bridge (used to
    combine `piece()` and `types()` before calling `updateForm()`) into a
    single `effect()` reading both signals directly - proven safe here
    (and in the sibling `proper-name` component below) because
    `updateForm()` never writes back to `piece`/`types`, so there is no
    stomping or infinite-loop risk to guard against, unlike the
    debounced-autosave components elsewhere in this migration where an
    unconditional resync effect **would** stomp in-progress edits.
  - `proper-name`: `pieces: ProperNamePiece[]` is a top-level array-of-
    objects field (no `applyEach`, same shape as `decorated-ids`/
    `assertion`), given the same map-in/map-out defense
    (`updateForm()`/`getName()` both rebuild fresh `{type, value}`
    objects rather than adopting/returning the live array). Also
    collapsed the original's `combineLatest({typeEntries, name})` into a
    single effect, and converted the imperative `updatePurgedTypeEntries()`
    signal-setter into a plain `computed()` derived from `typeEntries()`
    directly, removing an entire effect. **Two independent debounced
    autosave watchers** (`language`, `tag`, matching the original's two
    separate `valueChanges` subscriptions) both use a plain
    content-equality check (`JSON.stringify` comparison against the
    current `name()`) rather than `cadmus-refs-assertion`'s
    `_lastSyncedDraft` snapshot technique - confirmed safe here because,
    unlike `assertion`, `getName()` performs no transformation
    (trimming, etc.) that isn't already reflected in what `updateForm()`
    wrote, so "freshly computed output equals current model" is a
    reliable proxy for "nothing changed since the last sync," with no
    trim-asymmetry trap to fall into.
- **`cadmus-refs-asserted-chronotope`** (2 components) — third
  `NgxToolsValidators` case.
  - `asserted-chronotope`: `hasPlace`/`hasDate` were never part of either
    reactive-forms `FormGroup` in the original (two standalone
    `FormControl`s outside `plForm`/`dtForm`), so they became plain
    `signal<boolean>()`s rather than signal-forms fields - no
    `[formField]` binding possible for a lone boolean outside a
    `form()` tree anyway. **Major simplification**: the original's
    "auto-open the editor when the checkbox is checked" behavior was
    driven by a debounced `hasPlace.valueChanges` subscription gated by
    an `_updatingForm` flag (checked via `filter()` before
    `debounceTime()`, relying on reactive-forms' synchronous emission -
    the same hazard already documented for `toObservable()` elsewhere)
    plus a second `_hasPlaceChangeFrozen` consume-once flag whose only
    job was to swallow the emission `updateValueAndValidity()` produced
    despite the preceding `setValue(..., {emitEvent:false})`. Replaced
    both mechanisms entirely by moving the reaction into the
    `mat-checkbox`'s own `(change)` handler - `(change)` only ever fires
    for genuine user interaction, never for programmatic
    `hasPlace.set()` calls, so there is no "was this our own echo"
    question left to answer. This is the same "explicit event handler
    instead of implicit reactive watch" idiom used repeatedly earlier in
    this migration (`compact-citation`'s `onRangeToggle`,
    `RefLookupComponent.onScopeChange`), here eliminating an entire
    two-flag apparatus rather than just one guard. `plAssertion`/
    `dtAssertion`/`date` are, as usual, plain fields not bound via
    `[formField]` (edited through nested components instead), so the
    "native input needs a string-compatible type" rule never applied to
    them despite holding objects.
  - `asserted-chronotope-set`: `entries: AssertedChronotope[]` is a
    top-level array-of-objects field (no `applyEach`, not bound via
    `[formField]` anywhere - rows are display-only, edited through a
    nested `AssertedChronotopeComponent`), given the same map-in/map-out
    defense as `decorated-ids`/`proper-name`. `NgxToolsSignalValidators
    .strictMinLength(path.entries, 1)` used exactly like the other two
    occurrences of this validator. Dropped a redundant `ngOnInit()` that
    called `updateForm()` a second time on init (already covered by the
    constructor's model-sync `effect()`, which runs once on init
    regardless), matching the "no OnInit/OnDestroy needed" simplification
    already applied to several other components in this migration.
- **`cadmus-refs-asserted-ids`** (6 components) — final complex library
  before `cadmus-text-ed-md`, and the source of the most significant
  finding of the whole migration: a genuine **infinite synchronous loop**,
  not just a stomping risk.
  - `scoped-pin-lookup`: two independent trivial forms (`keyForm: {key:
    string | null}`, `idForm: {id: string}` with `required`+
    `maxLength(300)`). Simplified by moving "pre-select the unique key"
    logic from `ngOnInit()` into the constructor, since the `keys()`
    signal it depends on was already built there — removed the need for
    `OnInit` entirely, matching the by-now-standard simplification applied
    throughout this migration.
  - `pin-target-lookup` — the largest/most complex component in this
    migration. Three debounced `toObservable()` watchers (`item`,
    `itemPart`, `partTypeKey`) all needed `inject(Injector)`/
    `inject(DestroyRef)` in the constructor, passed explicitly
    (`{ injector: this._injector }`, `takeUntilDestroyed(this._destroyRef)`)
    since they're set up in `ngOnInit()`. `required(path.label, {when:
    (ctx) => ctx.valueOf(path.external)})` replaced an imperative
    `setValidators()`/`updateValueAndValidity()` dance driven by a
    (deleted) debounced `external` watcher. A `_suppressItemPartWatch`
    consume-once flag replaced `{emitEvent:false}` on the original's
    `itemPart.setValue(null)` inside the `item`-changed watcher, same
    "consume-once, not synchronously-reset" idiom as `external-ids`'
    `_suppressFocus`.
    **THE INFINITE LOOP**: `updateForm()`'s "no target" branch originally
    read `this._draft()` directly *while already running inside* the
    "target changed" `effect()`, then called `_draft.set(...)` in that
    same call — a tracked self-dependency that re-triggers the effect on
    its own write, forever. This is a **sharper, more dangerous variant**
    of the `cadmus-mat-physical-grid` `untracked()` hazard documented at
    the top of this log: that one caused values to be silently stomped;
    this one hangs the process — `ng test` ran for 3+ minutes producing
    zero output (confirmed via two separate background-task runs) versus
    ~8-12s for a normal (even a failing) run. **Root cause**: any signal
    read inside an `effect()` that *also writes to that same signal*
    (directly, or via a helper the effect calls) becomes a tracked
    dependency of that effect — reading `_draft()` then calling
    `_draft.set()` in the same execution path is the write re-triggering
    its own read. **Fix**: switch to `.update(currentValue => ...)` —
    the callback parameter is not a tracked read, so no self-dependency
    forms:
    ```ts
    this._draft.update((v) => ({
      item: null, itemPart: null, partTypeKey: v.partTypeKey,
      gid: '', label: '', byTypeMode: v.byTypeMode, external: v.external,
    }));
    ```
    Then proactively grepped the whole file for `this\._draft()\.` and
    found two more latent instances of the identical hazard in
    `updateTarget()`/`updateTargetFromData()` (both callable synchronously
    from inside the same effect's call graph) — fixed by wrapping those
    reads in `untracked(() => this._draft().external)` rather than
    switching to `.update()`, since those call sites needed the value
    read-out, not a full draft rewrite. **General rule going forward,
    stronger than the earlier `untracked()` guidance**: any `_draft()`
    read reachable from inside an effect that writes `_draft` is a
    potential infinite loop, not just a potential stomp — prefer
    `.update((v) => ...)` over `.set()` whenever the new value depends on
    the current one, and audit every remaining direct read via grep after
    any effect-based rewrite, not just the one that failed a test (the
    other two instances here had no failing test pointing at them; they
    were caught by inspection alone, after the first one's fix, before
    they could bite).
  - `asserted-id`: debounced autosave with a trim asymmetry
    (`getId()` trims, `updateForm()` doesn't) — used the
    `_lastSyncedDraft` JSON-snapshot technique from `cadmus-refs-
    assertion` rather than a plain content-equality check. Confirmed
    convention: `save()` does **not** update `_lastId`/`_lastSyncedDraft`
    itself (mirroring the original, which always resynced the form after
    any `id` write including from `save()`) — only the model-sync effect
    and `emitIdChange()` update those two.
  - `asserted-composite-id`: same `_lastId`/`_hasLastId`/
    `_lastSyncedDraft` shape as `asserted-id`. `features: string[]` is a
    primitive array, so no array-of-objects hazard. Proactively wrapped
    every `_draft()` read reachable from a tracked effect context
    (`onTargetModeChange`, `onTaxoConfigChange`, `onExtLookupConfigChange`)
    in `untracked()`, and rewrote `resetTarget()` to use `.update()` with
    a captured-result variable instead of a direct read-then-`.set()`:
    ```ts
    private resetTarget(): void {
      let draft!: AssertedCompositeIdControls;
      this._draft.update((v) => {
        draft = { ...v, target: { gid: '', label: '' } };
        return draft;
      });
      this._lastSyncedDraft = JSON.stringify(draft);
      this.form.target().markAsDirty();
    }
    ```
    **Found and fixed a genuine latent bug**, not just ported: the
    original `idFeatures` computed read `this.features.value` — a plain
    reactive-forms `FormControl.value`, not itself a signal — so it never
    actually re-ran when `features` changed in isolation (only when
    `featureEntries()` also changed, dragging the whole computed along).
    Ported as `this.form.features().value()`, a genuine tracked signal
    read, which is now correctly reactive — the same category of
    "declarative validator/computed becomes genuinely reactive" fix as
    `chronotope`'s `maxLength`/`max-length` error-key typo earlier in
    this migration.
  - `asserted-ids` / `asserted-composite-ids`: both false positives — pure
    list-manager wrapper components (add/edit/delete/move rows, open a
    nested editor) that only imported `FormsModule`/`ReactiveFormsModule`
    without ever using any reactive-forms API. Dropped the unused
    imports; no signal-forms conversion needed, same category as
    `cadmus-ui-custom-action-bar` earlier in this migration.
  All 96 tests across the library's 8 spec files passed after every
  component, including two full-library reruns after the infinite-loop
  fix (once standalone, once again after `asserted-composite-id`) to
  confirm the fix held and wasn't reintroduced.
- **`cadmus-text-ed-md`** — final library, false positive: `LinkEditorComponent`
  only imported `FormsModule`/`ReactiveFormsModule` without using any
  reactive-forms API — it just hosts a nested `AssertedCompositeIdComponent`
  (already migrated as part of `cadmus-refs-asserted-ids`) via plain
  `[id]`/`(idChange)` bindings. Dropped the unused imports; no signal-forms
  conversion needed, same category as `cadmus-ui-custom-action-bar` and
  `asserted-ids`/`asserted-composite-ids` earlier in this migration. All 57
  tests passed. **This completes the 23-library migration** — every
  library under `projects/myrmidon/` is now free of reactive-forms usage
  (confirmed by a workspace-wide grep for `ReactiveFormsModule|FormBuilder|
  FormGroup|FormControl` returning zero matches under `projects/myrmidon`),
  and `pnpm run test:lib` is green across the whole workspace. `src/app`
  (the demo/playground app) remains on reactive forms by design — its
  tests were already broken before this migration and it was explicitly
  out of scope throughout; the libraries' public `model()`/`input()`/
  `output()` signatures are unchanged, so the app still compiles against
  them.

## Post-migration fixes (found via real-app usage, not caught by tests)

- **`cadmus-refs-citation`**: `CitationComponent.editStep()`'s numeric
  branch called `this.nrEditorForm.value().value.set(step.n!)`. For any
  freshly created step (e.g. `createEmptyCitation()`'s steps, which only
  set `value: ''`, never `n`), `step.n` is `undefined` — setting a
  signal-forms field's value to `undefined` unmaps its `FieldTree`
  accessor (the sentinel hazard documented under `cadmus-refs-lookup`
  above), so the *next* read of `nrEditorForm.value` threw `TypeError:
  ... is not a function`. Reproduced by: pick a `set`-type step first
  (e.g. Divine Comedy's `cantica`, always has a defined `value`, so no
  crash) then a `numeric` step (`canto`) on a brand-new citation. Fixed
  by defaulting to `0` (`step.n ?? 0`), matching the field's non-nullable
  `number` type. Added a regression test that reproduces the exact
  scenario; confirmed it fails with the original code
  (`component.nrEditorForm.value is not a function`) and passes with the
  fix. **`citation.component.spec.ts` was a smoke test only** before this
  — it never called `editStep()` at all, which is why the bug shipped
  silently through the whole migration.
- **Systemic: missing `event.preventDefault()` on `(submit)` handlers,
  9 forms across 7 libraries.** The established idiom throughout this
  migration was `(submit)="onXFormSubmit($event)"` with the handler
  calling `event.preventDefault()` before delegating to the real save
  method — necessary because removing `[formGroup]` also removes
  `FormGroupDirective`'s *implicit* `preventDefault()` on native form
  submit. That idiom was applied inconsistently: 9 forms were ported as
  bare `(submit)="save()"` (no `$event`, no `preventDefault()`), which
  compiles and passes every unit test (jsdom doesn't perform a real page
  navigation on an unprevented submit) but causes a genuine full-page
  reload in a real browser the moment the form is actually submitted —
  invisible to the whole test suite. Found via live app usage (clicking
  "target" in `AssertedCompositeIdComponent`'s external-link editor
  reloaded the page instead of just setting the target). Root cause
  compounds with the HTML nested-`<form>`-is-invalid rule: `<cadmus-
  pin-target-lookup>`'s own `<form>` sits inside `AssertedCompositeId
  Component`'s `<form (submit)="save()">` in the DOM; per the HTML
  parsing spec a `<form>` start tag is dropped (no element created) when
  one is already open, so `pin-target-lookup`'s submit button actually
  submitted the *outer* `asserted-composite-id` form — meaning fixing
  only the inner form would not have fixed the reported symptom; both
  needed the fix, and this is generally true for any signal-forms
  component nested inside another `<form>`.
  Fixed all 9: `cadmus-refs-asserted-ids` (`pin-target-lookup`,
  `asserted-composite-id`, `asserted-id`, `scoped-pin-lookup`),
  `cadmus-mat-physical-state` (`physical-state`), `cadmus-refs-asserted-
  chronotope` (`asserted-chronotope`, both the place and date forms),
  `cadmus-refs-decorated-ids` (`decorated-ids`), `cadmus-refs-lookup`
  (`ref-lookup-doc-reference`), `cadmus-refs-proper-name` (`proper-name-
  piece`) — each got an `onFormSubmit`/`onEditedFormSubmit`/
  `onPlaceFormSubmit`/`onDateFormSubmit` method matching the naming
  already used elsewhere, calling `event.preventDefault()` then the
  existing save method, with the template's `(submit)` updated to pass
  `$event`.
  **Bonus find while fixing `asserted-chronotope`'s date form**: its
  `(submit)="saveDate()"` was bound to the *`mat-expansion-panel`*
  wrapper, not the `<form>` element inside it — `mat-expansion-panel`
  never emits a native `submit` event, so `saveDate()` was never called
  by form submission at all (only by the explicit save button's
  presence being irrelevant — the browser's default unhandled submit
  behavior, i.e. full reload, was the *only* thing that ever fired).
  Moved the binding onto the actual `<form>`.
  **General lesson**: after converting a `<form (submit)="...">` away
  from `[formGroup]`, grep the whole workspace for `(submit)="[a-zA-Z]+
  \(\)"` (a submit handler that does *not* take `$event`) — that pattern
  reliably identifies a missing `preventDefault()`, since every
  correctly-ported handler in this migration takes `$event` specifically
  to call it. This check should have been run once at the end of the
  main migration pass, not discovered library-by-library through live
  bug reports afterward.
- **Follow-up, found via a second live bug report** (`cadmus-refs-doc-
  references`'s "save" appeared to full-page-reload): the fix above only
  covered `<form (submit)="foo()">` — a bare `<form>` with **no**
  `(submit)` binding *at all* is exactly as vulnerable (a real browser
  still performs the native submit-and-reload on Enter/an implicit
  submit even with zero JS listeners attached), and grepping for that
  pattern specifically misses it. Grepped instead for every `<form`
  opening tag directly and found **14 more** bare, completely unhandled
  forms: `cadmus-refs-decorated-counts` (`decorated-counts`, outer
  add-form), `cadmus-refs-decorated-ids` (`decorated-ids`, outer list
  form), `cadmus-refs-doc-references` (`doc-references`), `cadmus-refs-
  assertion` (`assertion`), `cadmus-refs-asserted-chronotope`
  (`asserted-chronotope-set`), `cadmus-mat-physical-size`
  (`physical-size`'s inner visual-editor form), `cadmus-refs-asserted-
  ids` (`scoped-pin-lookup`'s outer key-selection form), `cadmus-refs-
  external-ids` (`external-ids`), `cadmus-refs-proper-name`
  (`proper-name`), `cadmus-refs-chronotope` (`chronotope`), `cadmus-cod-
  location` (`cod-location`), `cadmus-refs-historical-date` (`datation`,
  `asserted-historical-date`), `cadmus-refs-lookup` (`ref-lookup`). None
  of these components has an actual "save on submit" action — they're
  all autosave/debounce-only or the array-wrapper case — so each just
  got a no-op `onFormSubmit(event) { event.preventDefault(); }` (or a
  distinctly-named sibling, e.g. `onKeyFormSubmit`, where the component
  already had an `onFormSubmit` for a *different* nested form, as in
  `scoped-pin-lookup`).
  **A second, more important discovery from tracing this one down**:
  fixing an inner form's own `preventDefault()` is not sufficient once
  it is nested inside an ancestor's `<form>` — confirmed concretely with
  `asserted-chronotope-set`, whose template embeds `<cadmus-refs-
  asserted-chronotope>` (both of *its* forms already had correct
  `onPlaceFormSubmit`/`onDateFormSubmit` handlers) directly inside its
  own outer `<form>`. Per the HTML parsing spec, a `<form>` start tag
  encountered while a form is already open is dropped outright (no
  element is created for it) — so `asserted-chronotope`'s inner `<form>`
  elements never actually exist in the rendered DOM when used this way,
  and their `(submit)` bindings can never fire. The place/date "submit"
  buttons instead submit whatever the nearest *real* ancestor `<form>`
  is — here, `asserted-chronotope-set`'s own outer form, which (before
  this fix) had no handler either. **This means every `<form>`-bearing
  component in this library tree needs its own `preventDefault()`
  regardless of whether it is ever expected to be the "real" form in a
  given composition** — an inner form's handler is not wasted when the
  component is used standalone (a demo page, a dialog), and an outer
  form's handler is what actually fires when it is nested. Both ends of
  every such pairing needed the fix independently; neither one alone
  would have been sufficient. Re-verified `asserted-composite-ids` and
  `asserted-ids` (the two other list-wrapper components already fixed
  earlier) do **not** have this problem — neither wraps its child editor
  in a `<form>` of its own, so their single already-fixed inner form is
  the only one in the DOM either way.
  Confirmed via a full grep of `projects/myrmidon` for every `<form`
  opening tag: **all now have a `(submit)` binding**, zero remaining
  bare forms. All 13 touched libraries build and test clean (build +
  `ng test` individually, zero regressions).
- **Third live bug report, and the fix that actually settles this
  class of bug for good**: `cadmus-refs-lookup-doc-references`' child
  editor, when used inside `cadmus-refs-assertion`, submitted the
  *outer* assertion form instead of saving the individual reference —
  and separately, `asserted-composite-id.component.html`'s own submit
  button was flagged as a `type="submit"` button with no explicit
  `(click)` handler, "worth checking for potential issues." Both point
  at the same root cause, one level deeper than the two previous fixes:
  **relying on `type="submit"` + a `<form>`'s `(submit)` handler to
  trigger the actual save is fundamentally unreliable in this component
  tree**, because nesting is the norm here (editors embed editors embed
  lookups), and per the HTML nested-`<form>`-elision rule (documented in
  the previous two entries), only the single outermost `<form>` in any
  given composition ever actually exists in the DOM. Every inner
  `<form>`'s own `(submit)` handler - even a correctly-written one with
  `preventDefault()` - can simply never fire, no matter how many levels
  deep the fix was applied at each individual component. The
  `assertion`/`ref-lookup-doc-references`/`ref-lookup-doc-reference`
  chain is three levels deep; the earlier `asserted-composite-id`/
  `pin-target-lookup` fix only went two levels deep and was still
  incomplete in principle - `asserted-composite-id` is itself nested
  inside `asserted-composite-ids`' editor slot in some call sites, and
  every additional level of nesting anywhere in the tree reopens the
  same hazard at that ancestor.
  **The real fix**: stop routing the save action through native
  form-submission bubbling at all. Grepped for every remaining
  `type="submit"` button across `projects/myrmidon` (18 files, 3 of
  them test-only false positives) and converted all **15** real
  instances to `type="button"` with an explicit `(click)="save()"` (or
  the component's equivalent save method) directly on the button,
  exactly matching the pattern every cancel/close/array-management
  button in this migration already used. This makes the save action
  fire correctly regardless of nesting depth, since it no longer depends
  on which `<form>` element the browser happened to keep. The `<form
  (submit)="onXFormSubmit($event)">` handlers added in the two earlier
  fixes were **kept**, not removed - they remain a valid defensive
  backstop against a native Enter-key-triggered submit when a given
  component's own form *is* the one that survives parsing (e.g. used
  standalone, in a dialog, or as the outermost nesting level), and are
  harmless no-ops otherwise.
  One button (`physical-measurement-set`'s) already had `(click)=
  "saveMeasurement()"` *alongside* `type="submit"` from earlier in the
  migration - already immune to this bug by accident, confirming the
  `(click)`-based pattern is the right one; just dropped the now-inert
  `type="submit"`.
  Fixed across 12 libraries: `cadmus-refs-decorated-ids`,
  `cadmus-refs-decorated-counts`, `cadmus-refs-lookup` (`ref-lookup-doc-
  reference`), `cadmus-refs-proper-name` (`proper-name-piece`),
  `cadmus-ui-note-set`, `cadmus-refs-asserted-ids` (`pin-target-lookup`,
  `asserted-composite-id`, `asserted-id`), `cadmus-ui-flag-set`,
  `cadmus-mat-physical-state`, `cadmus-refs-asserted-chronotope`
  (`asserted-chronotope`, both forms), `cadmus-geo-location`,
  `cadmus-mat-physical-size` (`physical-dimension`,
  `physical-measurement-set`), `cadmus-refs-citation` (4 submit buttons:
  free-text, set/number/string step editors).
  **Test fallout, all fixed**: 3 spec files across
  `cadmus-mat-physical-state`, `cadmus-geo-location`, and
  `cadmus-mat-physical-size` queried the submit button via
  `By.css('button[type="submit"]')`/`querySelector('button[type=
  "submit"]')` to assert its `disabled` state - now-meaningless
  selectors since the button is no longer `type="submit"`. Updated each
  to select by the button's `matTooltip` instead (a stable identity
  attribute unrelated to the submission mechanism). Grepped for any
  other spec using the same selector pattern - none found.
  Full grep confirms **zero** remaining `type="submit"` buttons in any
  `.html` file under `projects/myrmidon`. All 12 touched libraries
  build and test clean; the 3 with selector fallout are green again
  after the spec fix.
- **Fourth pass: adopting `FormRoot`, the actual idiomatic API, in place
  of the hand-rolled `onXFormSubmit(event){preventDefault();...}`
  boilerplate.** Prompted by a pointer to Angular's own docs for signal
  forms submission (`@angular/forms/signals` exports a `FormRoot`
  directive and a `submit()`/`FormSubmitOptions` API, confirmed present
  in this workspace's installed Angular 22.0.1 via the `.d.ts` files,
  not just a blog post). Investigated both pieces before adopting
  either:
  - **`[formRoot]="fieldTree"`** (selector `form[formRoot]`) is a
    drop-in, framework-authored replacement for exactly the boilerplate
    this migration had been hand-rolling three times over: per its own
    doc comment, it "sets `novalidate` on the form element" and
    "listens for the `submit` event, prevents the default behavior, and
    calls `submit()` on the `FieldTree` if it defines its own
    submission options." With no `submission` option passed to `form()`
    (this workspace doesn't use one), that reduces to exactly
    `event.preventDefault()` - byte-for-byte the same behavior as every
    `onXFormSubmit` method in this log, just declarative.
  - **`submit(fieldTree, options)`** is a standalone function for
    triggering a submission imperatively (e.g. from a button's
    `(click)`), used in Angular's own docs for a *secondary* action
    button alongside a primary submit. **Investigated and deliberately
    not adopted**: its `action` callback must be `async` and return a
    `TreeValidationResult` (typically `null` on success), a different
    shape from every synchronous `save(): void` method across ~25
    already-tested components - full adoption would mean touching every
    one of them, a much larger and riskier rewrite than swapping in a
    directive. Asked the user which scope to commit to; "FormRoot only"
    was chosen. Save buttons keep their plain `(click)="save()")`.
  - **Critically, neither piece changes the earlier fixes' actual
    conclusion.** `[formRoot]`'s automatic submit-capture is still a
    native DOM `submit`-event listener under the hood, so it is subject
    to the *exact same* nested-`<form>`-elision hazard already proven
    twice in this log - an inner `[formRoot]` on a `<form>` that gets
    elided by an ancestor form never activates at all, same as the
    hand-rolled `(submit)` handler it replaces. Only an imperative
    `submit()` call from a button's `(click)`, bypassing the DOM event
    entirely, would sidestep that - which is structurally what the
    already-committed `type="button" (click)="save()"` fix does today,
    just without the framework's `submit()` wrapper around it. So save
    buttons were **not** touched in this pass; only the `<form>` tag's
    own attribute changed.
  Converted every `(submit)="onXFormSubmit($event)")`-style form (32
  forms across 21 libraries, including citation's 4 independent
  mini-forms and every two-form component: `scoped-pin-lookup`,
  `asserted-chronotope`, `decorated-ids`, `decorated-counts`) to
  `[formRoot]="theFieldTree"`, deleting the now-fully-redundant
  `onFormSubmit`/`onEditedFormSubmit`/`onPlaceFormSubmit`/
  `onDateFormSubmit`/`onKeyFormSubmit`/`onCustomFormSubmit`/
  `onFreeFormSubmit`/`onSetFormSubmit`/`onNumberFormSubmit`/
  `onStringFormSubmit` methods entirely, and adding `FormRoot` to each
  component's `imports` array alongside `FormField`.
  **Deliberately left one form unconverted**: `cadmus-text-ed-txt`'s
  `EmojiImeComponent` (a `MatDialog`, so CDK portals it to an overlay
  outside any ancestor's DOM subtree - immune to the nesting hazard by
  construction) uses `(submit)` specifically to let Enter-in-the-search-
  field pick the first matching emoji, with **no button in the tree at
  all** for that action. Since `[formRoot]` only calls a save action
  when `form()` was given `submission` options (the scope explicitly
  not adopted here), converting this one would have silently dropped
  real, load-bearing Enter-to-pick UX rather than just removing
  boilerplate - correctly left as the one exception.
  **Test fallout, both intentional and fixed, not bugs**: two specs
  (`cadmus-mat-physical-state`, `cadmus-ui-flag-set`) asserted that
  dispatching a native `submit` event on the form (`triggerEventHandler
  ('submit', ...)`) caused the save/add action to run - true under the
  old hand-rolled handler, no longer true under `[formRoot]` alone by
  design (only the button's `(click)` triggers the action now).
  Rewrote both to assert the *new*, intended behavior instead (no
  action fires, no error/reload either) with a comment pointing back
  here, rather than deleting the coverage. Separately, `cadmus-geo-
  location`'s spec uses `TestBed.overrideComponent(..., {set: {imports:
  TEST_IMPORTS}})` to stub MapLibre for jsdom - `overrideComponent`
  **replaces** the imports array rather than merging with it, the exact
  same gotcha already documented in this log for `FormField` itself
  when this library was first migrated; needed `FormRoot` added to that
  same `TEST_IMPORTS` array (71 of that spec's tests failed with
  `NG0303: Can't bind to 'formRoot'` until this was found - a good
  reminder that this specific gotcha reliably recurs for *any* new
  signals-forms symbol used in a template, not just the ones already
  seen).
  All 21 touched libraries build clean; full `pnpm run test:lib`
  workspace run green after the two intentional spec rewrites and the
  `TEST_IMPORTS` fix.
