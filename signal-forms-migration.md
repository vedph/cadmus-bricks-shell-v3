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
- [ ] 3. `cadmus-ui-custom-action-bar`
- [ ] 4. `cadmus-ui-flag-set`
- [ ] 5. `cadmus-mat-physical-size`
- [ ] 6. `cadmus-cod-location`
- [ ] 7. `cadmus-geo-location`
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
