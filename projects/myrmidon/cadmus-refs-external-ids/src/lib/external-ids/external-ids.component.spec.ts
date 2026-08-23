import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';
import { Assertion } from '@myrmidon/cadmus-refs-assertion';

import {
  ExternalIdsComponent,
  RankedExternalId,
} from './external-ids.component';

describe('ExternalIdsComponent', () => {
  let component: ExternalIdsComponent;
  let fixture: ComponentFixture<ExternalIdsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExternalIdsComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(ExternalIdsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  /** Click the "add ID" button in the template. */
  function clickAddId(): void {
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button'
    );
    btn.click();
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  //#region defaults
  describe('defaults', () => {
    it('should default ids to an empty array', () => {
      expect(component.ids()).toEqual([]);
    });

    it('should default lookupProviderOptions, scopeEntries, tagEntries, assTagEntries, refTypeEntries, refTagEntries to undefined', () => {
      expect(component.lookupProviderOptions()).toBeUndefined();
      expect(component.scopeEntries()).toBeUndefined();
      expect(component.tagEntries()).toBeUndefined();
      expect(component.assTagEntries()).toBeUndefined();
      expect(component.refTypeEntries()).toBeUndefined();
      expect(component.refTagEntries()).toBeUndefined();
    });

    it('should start with an empty idsArr and no assertion open', () => {
      expect(component.idsArr().value().length).toBe(0);
      expect(component.assEdOpen()).toBe(false);
      expect(component.assertionNr()).toBe(0);
      expect(component.assertion()).toBeUndefined();
    });
  });
  //#endregion

  //#region addId (hang/loop investigation)
  describe('addId', () => {
    it('should not hang or loop forever, and should settle synchronously', () => {
      // this is the key regression test: addId() ultimately calls
      // emitIdsChange(), which sets the `ids` model. Since `ids` is also
      // watched by a constructor effect that rebuilds the form
      // (updateForm), a naive implementation could re-enter and loop
      // forever. The component guards against this via the last-processed
      // reference guard on the model->form effect. If this test completes
      // at all (does not time out), the guard is working.
      component.addId({ value: 'test' });
      fixture.detectChanges();

      expect(component.ids()).toBeDefined();
      expect(component.idsArr().value().length).toBe(1);
      expect(component.ids().length).toBe(1);
      expect(component.ids()[0].value).toBe('test');
    });

    it('should add an empty, invalid row when called with no argument', () => {
      component.addId();
      fixture.detectChanges();

      expect(component.idsArr().value().length).toBe(1);
      const g = component.idsArr[0];
      expect(g.value().value()).toBeFalsy();
      expect(g.value().getError('required')).toBeTruthy();
      expect(component.form().invalid()).toBe(true);
    });

    it('should add a row populated from the given id', () => {
      const id: RankedExternalId = {
        value: 'v1',
        scope: 's1',
        tag: 't1',
        rank: 2,
      };
      component.addId(id);
      fixture.detectChanges();

      const g = component.idsArr[0];
      expect(g.value().value()).toBe('v1');
      expect(g.scope().value()).toBe('s1');
      expect(g.tag().value()).toBe('t1');
      expect(g.rank().value()).toBe(2);
    });

    it('should emit ids change (update the ids model) when adding a row directly', () => {
      component.addId({ value: 'v1' });
      fixture.detectChanges();

      expect(component.ids().length).toBe(1);
      expect(component.ids()[0].value).toBe('v1');
    });

    it('should support adding many rows without hanging', () => {
      for (let i = 0; i < 25; i++) {
        component.addId({ value: `v${i}` });
      }
      fixture.detectChanges();

      expect(component.idsArr().value().length).toBe(25);
      expect(component.ids().length).toBe(25);
    });

    it('should propagate a debounced row value change into the ids model', async () => {
      component.addId({ value: 'v1' });
      fixture.detectChanges();

      component.idsArr[0].value().value.set('v1-changed');
      await new Promise((resolve) => setTimeout(resolve, 400));
      fixture.detectChanges();

      expect(component.ids()[0].value).toBe('v1-changed');
    });

    it('should trim whitespace from value/scope/tag when emitting ids', async () => {
      component.addId({ value: 'v1' });
      fixture.detectChanges();

      component.idsArr[0].value().value.set('  padded-value  ');
      component.idsArr[0].scope().value.set('  padded-scope  ');
      component.idsArr[0].tag().value.set('  padded-tag  ');
      await new Promise((resolve) => setTimeout(resolve, 400));
      fixture.detectChanges();

      expect(component.ids()[0].value).toBe('padded-value');
      expect(component.ids()[0].scope).toBe('padded-scope');
      expect(component.ids()[0].tag).toBe('padded-tag');
    });

    it('should preserve the rank when a row round-trips through the ids model', async () => {
      // regression test: getIds() must include rank, otherwise it is
      // silently dropped as soon as the model->form effect rebuilds the
      // row from the emitted ids.
      component.addId({ value: 'v1', rank: 7 });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.ids()[0].rank).toBe(7);
      expect(component.idsArr[0].rank().value()).toBe(7);
    });
  });
  //#endregion

  //#region model -> form sync (setting ids input)
  describe('model -> form sync', () => {
    it('should populate idsArr when ids is set externally', async () => {
      fixture.componentRef.setInput('ids', [
        { value: 'a', scope: 'sa', tag: 'ta' },
        { value: 'b' },
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.idsArr().value().length).toBe(2);
      expect(component.idsArr[0].value().value()).toBe('a');
      expect(component.idsArr[1].value().value()).toBe('b');
      expect(component.form().dirty()).toBe(false);
    });

    it('should not hang or loop forever when ids is set externally multiple times', async () => {
      fixture.componentRef.setInput('ids', [{ value: 'a' }]);
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentRef.setInput('ids', [{ value: 'b' }, { value: 'c' }]);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.idsArr().value().length).toBe(2);
      expect(component.idsArr[0].value().value()).toBe('b');
      expect(component.idsArr[1].value().value()).toBe('c');
    });

    it('should reset the form when ids is set to an empty array', async () => {
      fixture.componentRef.setInput('ids', [{ value: 'a' }]);
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentRef.setInput('ids', []);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.idsArr().value().length).toBe(0);
    });

    it('should rebuild the idsArr without re-emitting a redundant ids change (no infinite loop)', async () => {
      // set up a spy on the ids model's set() to count how many times it
      // is written to while processing a single external input change.
      const setSpy = vi.spyOn(component.ids, 'set');

      fixture.componentRef.setInput('ids', [{ value: 'a' }, { value: 'b' }]);
      fixture.detectChanges();
      await fixture.whenStable();

      // updateForm() (triggered once by the input change) must not itself
      // call emitIdsChange()/ids.set() while rebuilding the form -- only
      // direct user-driven calls (addId/removeId/etc invoked outside of
      // updateForm) do that.
      expect(setSpy).not.toHaveBeenCalled();
    });
  });
  //#endregion

  //#region removeId
  describe('removeId', () => {
    it('should remove the row at the given index and emit ids change', () => {
      component.addId({ value: 'a' });
      component.addId({ value: 'b' });
      fixture.detectChanges();

      component.removeId(0);
      fixture.detectChanges();

      expect(component.idsArr().value().length).toBe(1);
      expect(component.idsArr[0].value().value()).toBe('b');
      expect(component.ids().length).toBe(1);
      expect(component.ids()[0].value).toBe('b');
    });

    it('should close any open assertion editor', () => {
      component.addId({ value: 'a' });
      fixture.detectChanges();
      component.editAssertion(0);
      expect(component.assEdOpen()).toBe(true);

      component.removeId(0);

      expect(component.assEdOpen()).toBe(false);
      expect(component.assertionNr()).toBe(0);
      expect(component.assertion()).toBeUndefined();
    });
  });
  //#endregion

  //#region moveIdUp / moveIdDown
  describe('moveIdUp', () => {
    it('should do nothing when index < 1', () => {
      component.addId({ value: 'a' });
      component.addId({ value: 'b' });
      fixture.detectChanges();

      component.moveIdUp(0);
      fixture.detectChanges();

      expect(component.idsArr[0].value().value()).toBe('a');
      expect(component.idsArr[1].value().value()).toBe('b');
    });

    it('should swap the row with the previous one', () => {
      component.addId({ value: 'a' });
      component.addId({ value: 'b' });
      fixture.detectChanges();

      component.moveIdUp(1);
      fixture.detectChanges();

      expect(component.idsArr[0].value().value()).toBe('b');
      expect(component.idsArr[1].value().value()).toBe('a');
      expect(component.ids()[0].value).toBe('b');
      expect(component.ids()[1].value).toBe('a');
    });
  });

  describe('moveIdDown', () => {
    it('should do nothing when index is the last one', () => {
      component.addId({ value: 'a' });
      component.addId({ value: 'b' });
      fixture.detectChanges();

      component.moveIdDown(1);
      fixture.detectChanges();

      expect(component.idsArr[0].value().value()).toBe('a');
      expect(component.idsArr[1].value().value()).toBe('b');
    });

    it('should swap the row with the next one', () => {
      component.addId({ value: 'a' });
      component.addId({ value: 'b' });
      fixture.detectChanges();

      component.moveIdDown(0);
      fixture.detectChanges();

      expect(component.idsArr[0].value().value()).toBe('b');
      expect(component.idsArr[1].value().value()).toBe('a');
    });
  });
  //#endregion

  //#region clearIds
  describe('clearIds', () => {
    it('should remove all rows and emit ids change', () => {
      component.addId({ value: 'a' });
      component.addId({ value: 'b' });
      fixture.detectChanges();

      component.clearIds();
      fixture.detectChanges();

      expect(component.idsArr().value().length).toBe(0);
      expect(component.ids()).toEqual([]);
    });

    it('should close any open assertion editor', () => {
      component.addId({ value: 'a' });
      fixture.detectChanges();
      component.editAssertion(0);

      component.clearIds();

      expect(component.assEdOpen()).toBe(false);
    });
  });
  //#endregion

  //#region assertion editing
  describe('editAssertion', () => {
    it('should open the assertion editor for the given row', () => {
      component.addId({ value: 'a' });
      fixture.detectChanges();

      component.editAssertion(0);

      expect(component.assEdOpen()).toBe(true);
      expect(component.assertionNr()).toBe(1);
      // the row's assertion control was never set, and toControls()
      // normalizes an unset value to null (matching the original
      // reactive-forms FormControl-built-with-no-value behavior)
      expect(component.assertion()).toBeNull();
    });

    it('should load the existing assertion of the row, if any', () => {
      const assertion: Assertion = { rank: 1, note: 'note1' };
      component.addId({ value: 'a', assertion });
      fixture.detectChanges();

      component.editAssertion(0);

      expect(component.assertion()).toEqual(assertion);
    });

    it('should not corrupt another row\'s assertion the very first time it is called', () => {
      const bAssertion: Assertion = { rank: 9, note: 'b-assertion' };
      component.addId({ value: 'a' });
      component.addId({ value: 'b', assertion: bAssertion });
      fixture.detectChanges();

      // editing row 0, which has no assertion of its own, must not touch
      // row 1's existing assertion
      component.editAssertion(0);

      expect(component.idsArr[1].assertion().value()).toEqual(bAssertion);
    });

    it('should save the previously edited assertion before switching to another row', () => {
      component.addId({ value: 'a' });
      component.addId({ value: 'b' });
      fixture.detectChanges();

      component.editAssertion(0);
      const assertion: Assertion = { rank: 3, note: 'edited' };
      component.onAssertionChange(assertion);

      component.editAssertion(1);

      // row 0's assertion control should have been saved with the edited
      // assertion before moving on to row 1
      expect(component.idsArr[0].assertion().value()).toEqual(assertion);
      // editor should now target row 1 (index 1 -> assertionNr 2), with a
      // fresh (null) assertion since row 1 has none
      expect(component.assertionNr()).toBe(2);
      expect(component.assertion()).toBeNull();
    });
  });

  describe('onAssertionChange', () => {
    it('should update the assertion signal', () => {
      const assertion: Assertion = { rank: 2 };
      component.onAssertionChange(assertion);
      expect(component.assertion()).toEqual(assertion);
    });
  });

  describe('saveAssertion', () => {
    it('should do nothing when no assertion is currently being edited', () => {
      component.addId({ value: 'a' });
      fixture.detectChanges();

      component.saveAssertion();

      expect(component.idsArr[0].assertion().value()).toBeFalsy();
    });

    it('should write the edited assertion into the row and close the editor', () => {
      component.addId({ value: 'a' });
      fixture.detectChanges();

      component.editAssertion(0);
      const assertion: Assertion = { rank: 5, note: 'hello' };
      component.onAssertionChange(assertion);

      component.saveAssertion();

      expect(component.idsArr[0].assertion().value()).toEqual(assertion);
      expect(component.assEdOpen()).toBe(false);
      expect(component.assertionNr()).toBe(0);
      expect(component.assertion()).toBeUndefined();
    });

    it('should emit ids change including the saved assertion', () => {
      component.addId({ value: 'a' });
      fixture.detectChanges();

      component.editAssertion(0);
      const assertion: Assertion = { rank: 5 };
      component.onAssertionChange(assertion);
      component.saveAssertion();

      expect(component.ids()[0].assertion).toEqual(assertion);
    });
  });
  //#endregion

  //#region ngOnDestroy
  describe('ngOnDestroy', () => {
    it('should not throw when destroying with no rows', () => {
      expect(() => fixture.destroy()).not.toThrow();
    });

    it('should not throw when destroying with rows present', () => {
      component.addId({ value: 'a' });
      component.addId({ value: 'b' });
      fixture.detectChanges();

      expect(() => fixture.destroy()).not.toThrow();
    });
  });
  //#endregion

  //#region template
  describe('template', () => {
    it('should render an "add ID" button that adds a row when clicked', () => {
      clickAddId();
      expect(component.idsArr().value().length).toBe(1);
    });

    it('should render one row per id in idsArr', () => {
      clickAddId();
      clickAddId();

      // note: '.form-row' alone is not specific enough here -- the nested
      // cadmus-refs-assertion (and its own nested lookup components)
      // reuse the same '.form-row' class internally, and the assertion
      // panel is present as soon as idsArr.length > 0. The "remove" button
      // is unique to (and one-per) external-id row.
      const removeButtons = fixture.nativeElement.querySelectorAll(
        'button[matTooltip="Remove this ID"]'
      );
      expect(removeButtons.length).toBe(2);
    });

    it('should render a free-text scope input when scopeEntries is not set', () => {
      clickAddId();

      // scope to the id row itself (the first .form-row): the nested
      // cadmus-refs-assertion, rendered as soon as one row exists, has
      // its own unrelated matInput fields (tag/rank/note) that would
      // otherwise pollute an unscoped query.
      const row = fixture.nativeElement.querySelector('.form-row');
      const scopeSelect = row.querySelector('mat-select');
      const rowInputs = Array.from(row.querySelectorAll('input[matinput]'));
      expect(scopeSelect).toBeFalsy();
      // value, scope, tag are all free-text inputs by default
      expect(rowInputs.length).toBe(3);
    });

    it('should render a bound scope select when scopeEntries is set', async () => {
      const entries: ThesaurusEntry[] = [
        { id: 's1', value: 'Scope 1' },
        { id: 's2', value: 'Scope 2' },
      ];
      fixture.componentRef.setInput('scopeEntries', entries);
      component.addId({ value: 'a' });
      fixture.detectChanges();
      await fixture.whenStable();

      const scopeSelect = fixture.nativeElement.querySelector('mat-select');
      expect(scopeSelect).toBeTruthy();
    });

    it('should render a bound tag select when tagEntries is set', async () => {
      const entries: ThesaurusEntry[] = [{ id: 't1', value: 'Tag 1' }];
      fixture.componentRef.setInput('tagEntries', entries);
      component.addId({ value: 'a' });
      fixture.detectChanges();
      await fixture.whenStable();

      const tagSelects = fixture.nativeElement.querySelectorAll('mat-select');
      expect(tagSelects.length).toBe(1);
    });

    it('should not render the assertion panel when there are no rows', () => {
      const panel = fixture.nativeElement.querySelector(
        'mat-expansion-panel'
      );
      expect(panel).toBeFalsy();
    });

    it('should render the assertion panel once there is at least one row', () => {
      clickAddId();

      const panel = fixture.nativeElement.querySelector(
        'mat-expansion-panel'
      );
      expect(panel).toBeTruthy();
    });

    it('should invoke removeId when the remove button is clicked', () => {
      clickAddId();
      const spy = vi.spyOn(component, 'removeId');

      const removeBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[matTooltip="Remove this ID"]'
      );
      removeBtn.click();

      expect(spy).toHaveBeenCalledWith(0);
    });

    it('should invoke editAssertion when the assertion button is clicked', () => {
      clickAddId();
      const spy = vi.spyOn(component, 'editAssertion');

      const assBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
        'button[matTooltip="Edit assertion"]'
      );
      assBtn.click();

      expect(spy).toHaveBeenCalledWith(0);
    });
  });
  //#endregion
});
