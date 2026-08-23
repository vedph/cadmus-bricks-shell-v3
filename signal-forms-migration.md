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
- [ ] 8. `cadmus-refs-citation`
- [ ] 9. `cadmus-refs-historical-date`
- [ ] 10. `cadmus-refs-doc-references` — has `FormArray`
- [ ] 11. `cadmus-text-block-view`
- [ ] 12. `cadmus-ui-note-set`
- [ ] 13. `cadmus-text-ed-txt`
- [ ] 14. `cadmus-mat-physical-state`
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
