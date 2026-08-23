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
- [ ] 15. `cadmus-refs-chronotope`
- [ ] 16. `cadmus-refs-lookup`
- [ ] 17. `cadmus-refs-decorated-ids` — uses `NgxToolsValidators`
- [ ] 18. `cadmus-refs-assertion`
- [ ] 19. `cadmus-refs-external-ids` — has `FormArray`
- [ ] 20. `cadmus-refs-proper-name` — uses `NgxToolsValidators`
- [ ] 21. `cadmus-refs-asserted-chronotope` — uses `NgxToolsValidators`
- [ ] 22. `cadmus-refs-asserted-ids`
- [ ] 23. `cadmus-text-ed-md`

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
