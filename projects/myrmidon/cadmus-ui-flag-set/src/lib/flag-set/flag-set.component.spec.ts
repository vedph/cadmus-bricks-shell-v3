import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { Flag, FlagSetComponent } from './flag-set.component';

describe('FlagSetComponent', () => {
  let component: FlagSetComponent;
  let fixture: ComponentFixture<FlagSetComponent>;

  const flags: Flag[] = [
    { id: 'f1', label: 'Alpha' },
    { id: 'f2', label: 'Beta' },
    { id: 'f3', label: 'Gamma', color: '#00ff00' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlagSetComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(FlagSetComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  function setFlags(f: Flag[], checkedIds: string[] = []): void {
    fixture.componentRef.setInput('flags', f);
    fixture.componentRef.setInput('checkedIds', checkedIds);
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default flags and checkedIds to empty arrays', () => {
    expect(component.flags()).toEqual([]);
    expect(component.checkedIds()).toEqual([]);
  });

  describe('userFlags computed', () => {
    it('should map input flags to view models with checked flag', () => {
      setFlags(flags, ['f2']);
      fixture.detectChanges();

      const userFlags = component.userFlags();
      expect(userFlags.length).toBe(3);
      expect(userFlags.find((f) => f.id === 'f1')!.checked).toBe(false);
      expect(userFlags.find((f) => f.id === 'f2')!.checked).toBe(true);
      expect(userFlags.find((f) => f.id === 'f3')!.checked).toBe(false);
    });

    it('should not add custom flags for unknown checked ids when allowCustom is false', () => {
      setFlags(flags, ['f2', 'unknown']);
      fixture.detectChanges();

      const userFlags = component.userFlags();
      expect(userFlags.length).toBe(3);
      expect(userFlags.some((f) => f.id === 'unknown')).toBe(false);
    });

    it('should add a custom flag view model for unknown checked ids when allowCustom is true', () => {
      setFlags(flags, ['f2', 'unknown']);
      fixture.componentRef.setInput('allowCustom', true);
      fixture.detectChanges();

      const userFlags = component.userFlags();
      expect(userFlags.length).toBe(4);
      const custom = userFlags.find((f) => f.id === 'unknown')!;
      expect(custom).toBeTruthy();
      expect(custom.custom).toBe(true);
      expect(custom.checked).toBe(true);
      expect(custom.label).toBe('unknown');
    });

    it('should handle an empty flags array with no checked ids', () => {
      setFlags([], []);
      fixture.detectChanges();
      expect(component.userFlags()).toEqual([]);
    });
  });

  describe('template rendering', () => {
    it('should render nothing when flags is empty', () => {
      setFlags([]);
      fixture.detectChanges();
      const checkboxes = fixture.debugElement.queryAll(By.css('mat-checkbox'));
      expect(checkboxes.length).toBe(0);
    });

    it('should render a checkbox for each flag', () => {
      setFlags(flags);
      fixture.detectChanges();
      const checkboxes = fixture.debugElement.queryAll(By.css('mat-checkbox'));
      expect(checkboxes.length).toBe(3);
    });

    it('should reflect checked state on checkboxes', () => {
      setFlags(flags, ['f2']);
      fixture.detectChanges();
      const checkboxes = fixture.debugElement.queryAll(By.css('mat-checkbox'));
      expect(checkboxes[0].nativeElement.classList.contains('mat-mdc-checkbox-checked')).toBe(
        false
      );
      expect(checkboxes[1].nativeElement.classList.contains('mat-mdc-checkbox-checked')).toBe(
        true
      );
    });

    it('should hide the toolbar when hideToolbar is true', () => {
      setFlags(flags);
      fixture.componentRef.setInput('hideToolbar', true);
      fixture.detectChanges();

      const toolbarButtons = fixture.debugElement.queryAll(
        By.css('button[matTooltip="Toggle all"]')
      );
      expect(toolbarButtons.length).toBe(0);
    });

    it('should show the toolbar by default', () => {
      setFlags(flags);
      fixture.detectChanges();

      const toolbarButtons = fixture.debugElement.queryAll(
        By.css('button[matTooltip="Toggle all"]')
      );
      expect(toolbarButtons.length).toBe(1);
    });

    it('should not show the custom flag form when allowCustom is false', () => {
      setFlags(flags);
      fixture.detectChanges();

      const form = fixture.debugElement.query(By.css('form'));
      expect(form).toBeNull();
    });

    it('should show the custom flag form when allowCustom is true', () => {
      setFlags(flags);
      fixture.componentRef.setInput('allowCustom', true);
      fixture.detectChanges();

      const form = fixture.debugElement.query(By.css('form'));
      expect(form).toBeTruthy();
    });

    it('should number flags when numbering is true', () => {
      setFlags(flags);
      fixture.componentRef.setInput('numbering', true);
      fixture.detectChanges();

      const text = fixture.debugElement.query(By.css('mat-checkbox')).nativeElement
        .textContent;
      expect(text).toContain('1.');
      expect(text).toContain('Alpha');
    });

    it('should not number flags by default', () => {
      setFlags(flags);
      fixture.detectChanges();

      const text = fixture.debugElement.query(By.css('mat-checkbox')).nativeElement
        .textContent;
      expect(text).not.toContain('1.');
    });

    it('should render a colored chip for flags that have a color', () => {
      setFlags(flags);
      fixture.detectChanges();

      const chips = fixture.debugElement.queryAll(By.css('.chip'));
      expect(chips.length).toBe(1);
      expect(chips[0].nativeElement.style.backgroundColor).toBe('rgb(0, 255, 0)');
    });

    it('should mark custom flags with the "custom" css class', () => {
      setFlags(flags, ['unknown']);
      fixture.componentRef.setInput('allowCustom', true);
      fixture.detectChanges();

      const customSpan = fixture.debugElement.query(By.css('span.custom'));
      expect(customSpan).toBeTruthy();
      expect(customSpan.nativeElement.textContent).toContain('unknown');
    });
  });

  describe('onFlagChecked', () => {
    it('should add the flag id when checked', () => {
      setFlags(flags, []);
      fixture.detectChanges();

      let emitted: string[] | undefined;
      component.checkedIdsChange.subscribe((ids) => (emitted = ids));

      component.onFlagChecked({ ...flags[0] }, true);

      expect(emitted).toEqual(['f1']);
    });

    it('should not duplicate an id already checked', () => {
      setFlags(flags, ['f1']);
      fixture.detectChanges();

      let emitted: string[] | undefined;
      component.checkedIdsChange.subscribe((ids) => (emitted = ids));

      component.onFlagChecked({ ...flags[0] }, true);

      expect(emitted).toEqual(['f1']);
    });

    it('should remove the flag id when unchecked', () => {
      setFlags(flags, ['f1', 'f2']);
      fixture.detectChanges();

      let emitted: string[] | undefined;
      component.checkedIdsChange.subscribe((ids) => (emitted = ids));

      component.onFlagChecked({ ...flags[0] }, false);

      expect(emitted).toEqual(['f2']);
    });

    it('should unset blackIds when checking a flag that blacks them out', () => {
      const blackFlags: Flag[] = [
        { id: 'f1', label: 'Alpha', blackIds: ['f2', 'f3'] },
        { id: 'f2', label: 'Beta' },
        { id: 'f3', label: 'Gamma' },
      ];
      setFlags(blackFlags, ['f2', 'f3']);
      fixture.detectChanges();

      let emitted: string[] | undefined;
      component.checkedIdsChange.subscribe((ids) => (emitted = ids));

      component.onFlagChecked(blackFlags[0], true);

      expect(emitted).toEqual(['f1']);
    });

    it('should update the checkbox and emit checkedIdsChange on user interaction', () => {
      setFlags(flags, []);
      fixture.detectChanges();

      let emitted: string[] | undefined;
      component.checkedIdsChange.subscribe((ids) => (emitted = ids));

      const checkboxInput = fixture.debugElement.query(
        By.css('mat-checkbox input[type="checkbox"]')
      ).nativeElement as HTMLInputElement;
      checkboxInput.click();

      expect(emitted).toEqual(['f1']);
    });
  });

  describe('toolbar actions', () => {
    beforeEach(() => {
      setFlags(flags, ['f1']);
      fixture.detectChanges();
    });

    it('checkAll should check all flags', () => {
      let emitted: string[] | undefined;
      component.checkedIdsChange.subscribe((ids) => (emitted = ids));

      component.checkAll();

      expect(emitted).toEqual(['f1', 'f2', 'f3']);
    });

    it('uncheckAll should clear all checked ids', () => {
      let emitted: string[] | undefined;
      component.checkedIdsChange.subscribe((ids) => (emitted = ids));

      component.uncheckAll();

      expect(emitted).toEqual([]);
    });

    it('toggleAll should check all when none are checked', () => {
      component.uncheckAll();

      let emitted: string[] | undefined;
      component.checkedIdsChange.subscribe((ids) => (emitted = ids));

      component.toggleAll();

      expect(emitted).toEqual(['f1', 'f2', 'f3']);
    });

    it('toggleAll should invert individual flag state', () => {
      // f1 is checked, f2/f3 are not: toggleAll should check f2 and f3,
      // and drop f1 since it is already checked (per implementation)
      let emitted: string[] | undefined;
      component.checkedIdsChange.subscribe((ids) => (emitted = ids));

      component.toggleAll();

      expect(emitted).toEqual(['f2', 'f3']);
    });

    it('should invoke checkAll/uncheckAll/toggleAll from toolbar button clicks', () => {
      const toggleBtn = fixture.debugElement.query(
        By.css('button[matTooltip="Toggle all"]')
      );
      const checkBtn = fixture.debugElement.query(
        By.css('button[matTooltip="Check all"]')
      );
      const uncheckBtn = fixture.debugElement.query(
        By.css('button[matTooltip="Uncheck all"]')
      );

      let emitted: string[] | undefined;
      component.checkedIdsChange.subscribe((ids) => (emitted = ids));

      checkBtn.nativeElement.click();
      expect(emitted).toEqual(['f1', 'f2', 'f3']);

      uncheckBtn.nativeElement.click();
      expect(emitted).toEqual([]);

      toggleBtn.nativeElement.click();
      expect(emitted).toEqual(['f1', 'f2', 'f3']);
    });
  });

  describe('addCustomFlag', () => {
    beforeEach(() => {
      setFlags(flags, []);
      fixture.componentRef.setInput('allowCustom', true);
      fixture.detectChanges();
    });

    it('should not add a custom flag when allowCustom is false', () => {
      fixture.componentRef.setInput('allowCustom', false);
      fixture.detectChanges();

      component.customForm.customFlag().value.set('newid');
      let emitted: string[] | undefined;
      component.checkedIdsChange.subscribe((ids) => (emitted = ids));

      component.addCustomFlag();

      expect(emitted).toBeUndefined();
    });

    it('should not add a custom flag when the input is empty', () => {
      component.customForm.customFlag().value.set('   ');
      let emitted: string[] | undefined;
      component.checkedIdsChange.subscribe((ids) => (emitted = ids));

      component.addCustomFlag();

      expect(emitted).toBeUndefined();
    });

    it('should not add a custom flag when the trimmed id already exists', () => {
      component.customForm.customFlag().value.set('f1');
      let emitted: string[] | undefined;
      component.checkedIdsChange.subscribe((ids) => (emitted = ids));

      component.addCustomFlag();

      expect(emitted).toBeUndefined();
    });

    it('should add a trimmed custom flag id and emit the change', () => {
      component.customForm.customFlag().value.set('  custom1  ');
      let emitted: string[] | undefined;
      component.checkedIdsChange.subscribe((ids) => (emitted = ids));

      component.addCustomFlag();

      expect(emitted).toEqual(['custom1']);
    });

    it('should reset the custom flag control after adding', () => {
      component.customForm.customFlag().value.set('custom2');
      component.addCustomFlag();

      expect(component.customForm.customFlag().value()).toBe('');
    });

    it('should not add the custom flag on a native form submit event (formRoot only prevents the default reload)', () => {
      // the add button calls addCustomFlag() directly via (click);
      // [formRoot] on the <form> exists only to disable native submission
      // (no reload on Enter), not to trigger the action itself - see
      // signal-forms-migration.md.
      component.customForm.customFlag().value.set('custom3');
      fixture.detectChanges();

      let emitted: string[] | undefined;
      component.checkedIdsChange.subscribe((ids) => (emitted = ids));

      const form = fixture.debugElement.query(By.css('form'));
      form.triggerEventHandler('submit', new Event('submit'));

      expect(emitted).toBeUndefined();
    });
  });

  describe('ngOnDestroy', () => {
    it('should not throw when destroyed', () => {
      setFlags(flags, ['f1']);
      fixture.detectChanges();
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });
});
