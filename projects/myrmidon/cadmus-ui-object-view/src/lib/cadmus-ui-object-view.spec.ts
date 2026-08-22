import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ObjectViewComponent, ValuePickEvent } from './cadmus-ui-object-view';

describe('ObjectViewComponent', () => {
  let component: ObjectViewComponent;
  let fixture: ComponentFixture<ObjectViewComponent>;
  let snackBarOpen: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObjectViewComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(ObjectViewComponent);
    component = fixture.componentInstance;
    // MatSnackBarModule (imported transitively via the component's own
    // standalone imports) resolves MatSnackBar to an instance private to
    // the component's own injector subtree -- distinct from the one
    // TestBed.inject(MatSnackBar) returns from the root testing module, so
    // a TestBed-level provider override (or a spy on that root instance)
    // does not intercept the component's own calls. Spy directly on the
    // instance actually held by the component instead.
    snackBarOpen = vi
      .spyOn((component as any)._snackBar, 'open')
      .mockReturnValue(undefined as any);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  //#region defaults
  describe('defaults', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should default data to undefined and title to "Object Viewer"', () => {
      expect(component.data()).toBeUndefined();
      expect(component.title()).toBe('Object Viewer');
    });

    it('should default all hide* flags to false and copyOnPick to true', () => {
      expect(component.hideEmptyArrays()).toBe(false);
      expect(component.hideEmptyObjects()).toBe(false);
      expect(component.hideEmptyStrings()).toBe(false);
      expect(component.hideZeroNumbers()).toBe(false);
      expect(component.hideFalseBooleans()).toBe(false);
      expect(component.copyOnPick()).toBe(true);
    });

    it('should default propertyBlacklist to the built-in framework-internal list', () => {
      const list = component.propertyBlacklist();
      expect(list).toContain('service');
      expect(list).toContain('injector');
      expect(list).toContain('_ngZone');
    });

    it('should start with an empty data tree and no expanded nodes', () => {
      expect(component.dataTree()).toEqual([]);
      expect(component.expansionState().size).toBe(0);
      expect(component.displayedNodes()).toEqual([]);
    });

    it('should default the settings panel to collapsed and filters to empty', () => {
      expect(component.settingsPanelExpanded()).toBe(false);
      expect(component.nameFilter()).toBe('');
      expect(component.valueFilter()).toBe('');
    });

    it('should expose displayedColumns as name/value', () => {
      expect(component.displayedColumns()).toEqual(['name', 'value']);
    });
  });
  //#endregion

  //#region data -> tree sync
  describe('data -> tree sync', () => {
    it('should build a tree with object/array/primitive node types', async () => {
      fixture.componentRef.setInput('data', {
        name: 'John',
        tags: ['a', 'b'],
        address: { city: 'Rome' },
      });
      fixture.detectChanges();
      await fixture.whenStable();

      const tree = component.dataTree();
      expect(tree.length).toBe(1);
      const root = tree[0];
      expect(root.type).toBe('object');
      expect(root.count).toBe(3);

      const nameNode = root.children!.find((n) => n.key === 'name');
      expect(nameNode?.type).toBe('primitive');
      expect(nameNode?.value).toBe('John');

      const tagsNode = root.children!.find((n) => n.key === 'tags');
      expect(tagsNode?.type).toBe('array');
      expect(tagsNode?.count).toBe(2);
      expect(tagsNode?.children?.length).toBe(2);

      const addressNode = root.children!.find((n) => n.key === 'address');
      expect(addressNode?.type).toBe('object');
      expect(addressNode?.count).toBe(1);
    });

    it('should assign stable dot-path ids to nodes', async () => {
      fixture.componentRef.setInput('data', { a: { b: 1 } });
      fixture.detectChanges();
      await fixture.whenStable();

      const root = component.dataTree()[0];
      const aNode = root.children!.find((n) => n.key === 'a')!;
      const bNode = aNode.children!.find((n) => n.key === 'b')!;
      expect(bNode.id).toBe('a.b');
    });

    it('should clear the tree and expansion state when data becomes falsy', async () => {
      fixture.componentRef.setInput('data', { a: 1 });
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.dataTree().length).toBe(1);

      fixture.componentRef.setInput('data', undefined);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.dataTree()).toEqual([]);
      expect(component.expansionState().size).toBe(0);
    });

    it('should represent null and undefined leaf values as primitive nodes', async () => {
      fixture.componentRef.setInput('data', { a: null, b: undefined });
      fixture.detectChanges();
      await fixture.whenStable();

      const root = component.dataTree()[0];
      const aNode = root.children!.find((n) => n.key === 'a');
      const bNode = root.children!.find((n) => n.key === 'b');
      expect(aNode?.type).toBe('primitive');
      expect(aNode?.value).toBeNull();
      expect(bNode?.type).toBe('primitive');
      expect(bNode?.value).toBeUndefined();
    });

    it('should detect and mark circular references without hanging', async () => {
      const obj: any = { name: 'x' };
      obj.self = obj;

      fixture.componentRef.setInput('data', obj);
      expect(() => fixture.detectChanges()).not.toThrow();
      await fixture.whenStable();

      const root = component.dataTree()[0];
      const selfNode = root.children!.find((n) => n.key === 'self');
      expect(selfNode?.value).toBe('[Circular Reference]');
    });

    it('should not throw and should clear the tree if building it fails unexpectedly', async () => {
      const bad = {
        get boom(): any {
          throw new Error('nope');
        },
      };
      expect(() => {
        fixture.componentRef.setInput('data', bad);
        fixture.detectChanges();
      }).not.toThrow();
      await fixture.whenStable();
      // filterBlacklistedProperties catches the getter error per-property
      // and replaces it with a placeholder, so the tree is still built
      const root = component.dataTree()[0];
      const boomNode = root.children!.find((n) => n.key === 'boom');
      expect(boomNode?.value).toBe('[Unprocessable Property]');
    });
  });
  //#endregion

  //#region property blacklist filtering
  describe('property blacklist filtering', () => {
    it('should exclude default-blacklisted property names', async () => {
      fixture.componentRef.setInput('data', {
        service: 'x',
        injector: 'y',
        kept: 'z',
      });
      fixture.detectChanges();
      await fixture.whenStable();

      const root = component.dataTree()[0];
      const keys = root.children!.map((n) => n.key);
      expect(keys).not.toContain('service');
      expect(keys).not.toContain('injector');
      expect(keys).toContain('kept');
    });

    it('should exclude properties starting with "__", "ɵ" or "ng"', async () => {
      fixture.componentRef.setInput('data', {
        __proto: 'x',
        ɵcmp: 'y',
        ngZone2: 'z',
        normal: 'w',
      });
      fixture.detectChanges();
      await fixture.whenStable();

      const keys = component.dataTree()[0].children!.map((n) => n.key);
      expect(keys).not.toContain('__proto');
      expect(keys).not.toContain('ɵcmp');
      expect(keys).not.toContain('ngZone2');
      expect(keys).toContain('normal');
    });

    it('should exclude function-valued properties', async () => {
      fixture.componentRef.setInput('data', {
        doStuff: () => {},
        value: 1,
      });
      fixture.detectChanges();
      await fixture.whenStable();

      const keys = component.dataTree()[0].children!.map((n) => n.key);
      expect(keys).not.toContain('doStuff');
      expect(keys).toContain('value');
    });

    it('should apply the blacklist recursively to nested objects', async () => {
      fixture.componentRef.setInput('data', { outer: { service: 'x', kept: 'y' } });
      fixture.detectChanges();
      await fixture.whenStable();

      const outerNode = component
        .dataTree()[0]
        .children!.find((n) => n.key === 'outer')!;
      const keys = outerNode.children!.map((n) => n.key);
      expect(keys).not.toContain('service');
      expect(keys).toContain('kept');
    });

    it('should apply the blacklist inside array items', async () => {
      fixture.componentRef.setInput('data', {
        list: [{ service: 'x', kept: 'y' }],
      });
      fixture.detectChanges();
      await fixture.whenStable();

      const listNode = component
        .dataTree()[0]
        .children!.find((n) => n.key === 'list')!;
      const itemNode = listNode.children![0];
      const keys = itemNode.children!.map((n) => n.key);
      expect(keys).not.toContain('service');
      expect(keys).toContain('kept');
    });

    it('should honor a custom propertyBlacklist input', async () => {
      fixture.componentRef.setInput('propertyBlacklist', ['secret']);
      fixture.componentRef.setInput('data', { secret: 'x', service: 'kept-now' });
      fixture.detectChanges();
      await fixture.whenStable();

      const keys = component.dataTree()[0].children!.map((n) => n.key);
      expect(keys).not.toContain('secret');
      // 'service' is no longer blacklisted since the input overrides the
      // default list entirely
      expect(keys).toContain('service');
    });
  });
  //#endregion

  //#region getDisplayValue
  describe('getDisplayValue', () => {
    it('should quote string primitive values', async () => {
      fixture.componentRef.setInput('data', { s: 'hello' });
      fixture.detectChanges();
      await fixture.whenStable();

      const node = component.dataTree()[0].children!.find((n) => n.key === 's')!;
      expect(component.getDisplayValue(node)).toBe('"hello"');
    });

    it('should stringify number and boolean primitive values', async () => {
      fixture.componentRef.setInput('data', { n: 42, b: true });
      fixture.detectChanges();
      await fixture.whenStable();

      const root = component.dataTree()[0];
      const n = root.children!.find((x) => x.key === 'n')!;
      const b = root.children!.find((x) => x.key === 'b')!;
      expect(component.getDisplayValue(n)).toBe('42');
      expect(component.getDisplayValue(b)).toBe('true');
    });

    it('should describe object/array nodes by their item count', async () => {
      fixture.componentRef.setInput('data', { arr: [1, 2, 3], obj: { a: 1 } });
      fixture.detectChanges();
      await fixture.whenStable();

      const root = component.dataTree()[0];
      const arr = root.children!.find((x) => x.key === 'arr')!;
      const obj = root.children!.find((x) => x.key === 'obj')!;
      expect(component.getDisplayValue(arr)).toBe('3 items');
      expect(component.getDisplayValue(obj)).toBe('1 properties');
    });

    it('should describe empty object/array nodes as "0 items"/"0 properties"', async () => {
      fixture.componentRef.setInput('data', { arr: [], obj: {} });
      fixture.detectChanges();
      await fixture.whenStable();

      const root = component.dataTree()[0];
      const arr = root.children!.find((x) => x.key === 'arr')!;
      const obj = root.children!.find((x) => x.key === 'obj')!;
      expect(component.getDisplayValue(arr)).toBe('0 items');
      expect(component.getDisplayValue(obj)).toBe('0 properties');
    });
  });
  //#endregion

  //#region expansion state
  describe('expansion state', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('data', {
        a: { x: 1, y: 2 },
        b: [1, 2],
      });
      fixture.detectChanges();
      await fixture.whenStable();
    });

    function rootNode(key: string) {
      return component.dataTree()[0].children!.find((n) => n.key === key)!;
    }

    // the whole `data` object is itself wrapped in one synthetic root
    // DataNode (key: ''), which -- like any other non-primitive node --
    // starts collapsed. So the top-level properties ('a', 'b') are only
    // present in displayedNodes() once that synthetic root is expanded.
    function expandRoot(): void {
      component.handleToggleNode(component.dataTree()[0]);
    }

    it('should report a node as collapsed by default', () => {
      expect(component.isNodeExpanded(rootNode('a'))).toBe(false);
    });

    it('handleToggleNode should toggle a single node expansion state', () => {
      const a = rootNode('a');
      component.handleToggleNode(a);
      expect(component.isNodeExpanded(a)).toBe(true);
      component.handleToggleNode(a);
      expect(component.isNodeExpanded(a)).toBe(false);
    });

    it('should not display the top-level properties until the (synthetic) root node is expanded', () => {
      const displayed = component.displayedNodes();
      expect(displayed.length).toBe(1);
      expect(displayed[0].id).toBe('');
    });

    it('should only show children of an expanded node', () => {
      expandRoot();
      const a = rootNode('a');
      // "a" itself is now visible, but still collapsed: its own children
      // ("x", "y") are not shown yet
      let displayed = component.displayedNodes();
      expect(displayed.some((n) => n.key === 'x')).toBe(false);

      component.handleToggleNode(a);
      displayed = component.displayedNodes();
      expect(displayed.some((n) => n.key === 'x')).toBe(true);
      expect(displayed.some((n) => n.key === 'y')).toBe(true);
    });

    it('handleExpandAll should expand every non-primitive node', () => {
      component.handleExpandAll();

      const a = rootNode('a');
      const b = rootNode('b');
      expect(component.isNodeExpanded(a)).toBe(true);
      expect(component.isNodeExpanded(b)).toBe(true);

      const displayed = component.displayedNodes();
      expect(displayed.some((n) => n.key === 'x')).toBe(true);
      expect(displayed.some((n) => n.key === '0')).toBe(true);
    });

    it('handleCollapseAll should collapse every node', () => {
      component.handleExpandAll();
      component.handleCollapseAll();

      const a = rootNode('a');
      expect(component.isNodeExpanded(a)).toBe(false);
      expect(component.displayedNodes().some((n) => n.key === 'x')).toBe(
        false
      );
    });

    it('handleToggleNodeRecursive should expand a node and all its descendants, and stop event propagation', () => {
      const a = rootNode('a');
      const event = { stopPropagation: vi.fn() } as unknown as Event;

      component.handleToggleNodeRecursive(a, event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.isNodeExpanded(a)).toBe(true);
    });

    it('handleToggleNodeRecursive should collapse when already expanded', () => {
      const a = rootNode('a');
      const event = { stopPropagation: vi.fn() } as unknown as Event;

      component.handleToggleNodeRecursive(a, event);
      expect(component.isNodeExpanded(a)).toBe(true);

      component.handleToggleNodeRecursive(a, event);
      expect(component.isNodeExpanded(a)).toBe(false);
    });
  });
  //#endregion

  //#region settings panel
  describe('settings panel', () => {
    it('handleToggleSettingsPanel should toggle settingsPanelExpanded', () => {
      expect(component.settingsPanelExpanded()).toBe(false);
      component.handleToggleSettingsPanel();
      expect(component.settingsPanelExpanded()).toBe(true);
      component.handleToggleSettingsPanel();
      expect(component.settingsPanelExpanded()).toBe(false);
    });
  });
  //#endregion

  //#region filters
  describe('name/value filters', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('data', {
        alpha: 'foo',
        beta: 'bar',
        nested: { gammaValue: 'baz' },
      });
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('handleNameFilterChange should set nameFilter from the input event', () => {
      const input = document.createElement('input');
      input.value = 'alpha';
      component.handleNameFilterChange({ target: input } as unknown as Event);
      expect(component.nameFilter()).toBe('alpha');
    });

    it('handleValueFilterChange should set valueFilter from the input event', () => {
      const input = document.createElement('input');
      input.value = 'bar';
      component.handleValueFilterChange({ target: input } as unknown as Event);
      expect(component.valueFilter()).toBe('bar');
    });

    it('should only display nodes whose key matches the name filter (or that have a matching descendant)', () => {
      const input = document.createElement('input');
      input.value = 'alpha';
      component.handleNameFilterChange({ target: input } as unknown as Event);

      const displayed = component.displayedNodes();
      expect(displayed.some((n) => n.key === 'alpha')).toBe(true);
      expect(displayed.some((n) => n.key === 'beta')).toBe(false);
    });

    it('should only display nodes whose display value matches the value filter', () => {
      const input = document.createElement('input');
      input.value = 'baz';
      component.handleValueFilterChange({ target: input } as unknown as Event);

      const displayed = component.displayedNodes();
      const keys = displayed.map((n) => n.key);
      expect(keys).toContain('gammaValue');
      expect(keys).not.toContain('alpha');
    });

    it('should auto-expand ancestors of a matching descendant when filtering by name', () => {
      const input = document.createElement('input');
      input.value = 'gammaValue';
      component.handleNameFilterChange({ target: input } as unknown as Event);

      // 'nested' itself does not match the name filter, but has a
      // matching descendant, so it must appear and be auto-expanded
      const displayed = component.displayedNodes();
      const keys = displayed.map((n) => n.key);
      expect(keys).toContain('nested');
      expect(keys).toContain('gammaValue');
    });

    it('isNameHighlighted should reflect whether the name filter matches (case-insensitive)', () => {
      const input = document.createElement('input');
      input.value = 'ALPHA';
      component.handleNameFilterChange({ target: input } as unknown as Event);

      expect(component.isNameHighlighted('alpha-value')).toBe(true);
      expect(component.isNameHighlighted('beta-value')).toBe(false);
    });

    it('isNameHighlighted should return false when there is no active filter', () => {
      expect(component.isNameHighlighted('anything')).toBe(false);
    });

    it('isValueHighlighted should reflect whether the value filter matches (case-insensitive)', () => {
      const input = document.createElement('input');
      input.value = 'BAR';
      component.handleValueFilterChange({ target: input } as unknown as Event);

      expect(component.isValueHighlighted('a bar value')).toBe(true);
      expect(component.isValueHighlighted('unrelated')).toBe(false);
    });

    it('should clear the name filter and show all nodes again when set back to empty', () => {
      const input = document.createElement('input');
      input.value = 'alpha';
      component.handleNameFilterChange({ target: input } as unknown as Event);
      expect(
        component.displayedNodes().some((n) => n.key === 'beta')
      ).toBe(false);

      input.value = '';
      component.handleNameFilterChange({ target: input } as unknown as Event);
      expect(
        component.displayedNodes().some((n) => n.key === 'beta')
      ).toBe(true);
    });
  });
  //#endregion

  //#region filter settings (hide empty/zero/false)
  describe('filter settings', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput('data', {
        emptyStr: '',
        zero: 0,
        falseFlag: false,
        emptyArr: [],
        emptyObj: {},
        kept: 'x',
      });
      fixture.detectChanges();
      await fixture.whenStable();
      // the top-level properties live under a collapsed synthetic root
      // node by default; expand everything so displayedNodes() reflects
      // them directly
      component.handleExpandAll();
    });

    it('handleFilterSettingChange should merge a single setting without resetting the others', () => {
      component.handleFilterSettingChange('hideEmptyStrings', true);
      expect(component.filterSettings()).toEqual({
        hideEmptyArrays: false,
        hideEmptyObjects: false,
        hideEmptyStrings: true,
        hideZeroNumbers: false,
        hideFalseBooleans: false,
      });
    });

    it('should hide empty-string nodes once hideEmptyStrings is set', () => {
      component.handleFilterSettingChange('hideEmptyStrings', true);
      const keys = component.displayedNodes().map((n) => n.key);
      expect(keys).not.toContain('emptyStr');
      expect(keys).toContain('kept');
    });

    it('should hide zero-number nodes once hideZeroNumbers is set', () => {
      component.handleFilterSettingChange('hideZeroNumbers', true);
      const keys = component.displayedNodes().map((n) => n.key);
      expect(keys).not.toContain('zero');
    });

    it('should hide false-boolean nodes once hideFalseBooleans is set', () => {
      component.handleFilterSettingChange('hideFalseBooleans', true);
      const keys = component.displayedNodes().map((n) => n.key);
      expect(keys).not.toContain('falseFlag');
    });

    it('should hide empty array/object nodes once hideEmptyArrays/hideEmptyObjects is set', () => {
      component.handleFilterSettingChange('hideEmptyArrays', true);
      component.handleFilterSettingChange('hideEmptyObjects', true);
      const keys = component.displayedNodes().map((n) => n.key);
      expect(keys).not.toContain('emptyArr');
      expect(keys).not.toContain('emptyObj');
    });

    it('currentFilterSettings should OR the filterSettings signal with the matching hide* input', async () => {
      fixture.componentRef.setInput('hideZeroNumbers', true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.currentFilterSettings().hideZeroNumbers).toBe(true);
      const keys = component.displayedNodes().map((n) => n.key);
      expect(keys).not.toContain('zero');
    });
  });
  //#endregion

  //#region copy / valuePick
  describe('handleCopyValue', () => {
    let writeText: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });

      fixture.componentRef.setInput('data', { s: 'hello', obj: { a: 1 } });
      fixture.detectChanges();
      await fixture.whenStable();
    });

    function rootNode(key: string) {
      return component.dataTree()[0].children!.find((n) => n.key === key)!;
    }

    it('should emit valuePick with key, value and displayValue for a primitive node', () => {
      const spy = vi.fn();
      component.valuePick.subscribe(spy);

      component.handleCopyValue(rootNode('s'));

      expect(spy).toHaveBeenCalledWith({
        key: 's',
        value: 'hello',
        displayValue: '"hello"',
      } as ValuePickEvent);
    });

    it('should not emit valuePick for a non-primitive node', () => {
      const spy = vi.fn();
      component.valuePick.subscribe(spy);

      component.handleCopyValue(rootNode('obj'));

      expect(spy).not.toHaveBeenCalled();
    });

    it('should copy the raw text value to the clipboard when copyOnPick is true (default)', async () => {
      component.handleCopyValue(rootNode('s'));
      await Promise.resolve();
      await Promise.resolve();

      expect(writeText).toHaveBeenCalledWith('hello');
    });

    it('should show a snack bar notification after a successful copy', async () => {
      component.handleCopyValue(rootNode('s'));
      // wait for the clipboard write's own promise to settle, then for the
      // .then(() => showCopyNotification()) callback chained onto it
      await writeText.mock.results[0].value;
      await Promise.resolve();

      expect(snackBarOpen).toHaveBeenCalledWith(
        'Value copied to clipboard!',
        'Close',
        expect.objectContaining({ duration: 2000 })
      );
    });

    it('should not touch the clipboard when copyOnPick is false', async () => {
      fixture.componentRef.setInput('copyOnPick', false);
      fixture.detectChanges();
      await fixture.whenStable();

      component.handleCopyValue(rootNode('s'));
      await Promise.resolve();

      expect(writeText).not.toHaveBeenCalled();
    });

    it('should log an error and not throw when the clipboard write fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      writeText.mockRejectedValue(new Error('denied'));

      expect(() => component.handleCopyValue(rootNode('s'))).not.toThrow();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
  //#endregion

  //#region template
  describe('template', () => {
    it('should render the configured title in the toolbar', async () => {
      fixture.componentRef.setInput('title', 'My Data');
      fixture.detectChanges();
      await fixture.whenStable();

      const toolbar: HTMLElement =
        fixture.nativeElement.querySelector('mat-toolbar');
      expect(toolbar.textContent).toContain('My Data');
    });

    it('should invoke handleExpandAll and handleCollapseAll from the toolbar buttons', () => {
      const expandSpy = vi.spyOn(component, 'handleExpandAll');
      const collapseSpy = vi.spyOn(component, 'handleCollapseAll');

      const buttons: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('mat-toolbar button')
      );
      buttons[0].click();
      buttons[1].click();

      expect(expandSpy).toHaveBeenCalled();
      expect(collapseSpy).toHaveBeenCalled();
    });

    it('should invoke handleToggleSettingsPanel from the settings toolbar button', () => {
      const spy = vi.spyOn(component, 'handleToggleSettingsPanel');
      const buttons: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('mat-toolbar button')
      );
      buttons[2].click();
      expect(spy).toHaveBeenCalled();
    });

    it('should render a single collapsed root row by default', async () => {
      fixture.componentRef.setInput('data', { a: 1, b: 2 });
      fixture.detectChanges();
      await fixture.whenStable();

      const rows = fixture.nativeElement.querySelectorAll(
        'table.data-table tr[mat-row]'
      );
      expect(rows.length).toBe(1);
    });

    it('should render one table row per displayed node once expanded', async () => {
      fixture.componentRef.setInput('data', { a: 1, b: 2 });
      fixture.detectChanges();
      await fixture.whenStable();
      component.handleExpandAll();
      fixture.detectChanges();
      await fixture.whenStable();

      const rows = fixture.nativeElement.querySelectorAll(
        'table.data-table tr[mat-row]'
      );
      // 1 synthetic root row + "a" + "b"
      expect(rows.length).toBe(3);
    });

    it('should indent rows according to their level', async () => {
      fixture.componentRef.setInput('data', { a: { b: 1 } });
      fixture.detectChanges();
      await fixture.whenStable();
      component.handleExpandAll();
      fixture.detectChanges();
      await fixture.whenStable();

      // use the ".name-text" span (not the <td> itself) to match on the
      // key alone: for non-primitive nodes the <td> also contains an
      // expand/collapse icon button, so its full textContent is not just
      // the key
      const nameSpans: HTMLElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('.name-text')
      );
      // the synthetic root is level 0 (padding 0), "a" is level 1 (20px),
      // and "b" (nested under "a") is level 2 (40px)
      const aCell = nameSpans
        .find((c) => c.textContent?.trim() === 'a')
        ?.closest('td');
      const bCell = nameSpans
        .find((c) => c.textContent?.trim() === 'b')
        ?.closest('td');
      expect((aCell as HTMLElement)?.style.paddingLeft).toBe('20px');
      expect((bCell as HTMLElement)?.style.paddingLeft).toBe('40px');
    });

    it('should invoke handleCopyValue when a value cell is clicked', async () => {
      fixture.componentRef.setInput('data', { a: 1 });
      fixture.detectChanges();
      await fixture.whenStable();

      const spy = vi.spyOn(component, 'handleCopyValue');
      const valueCell: HTMLElement =
        fixture.nativeElement.querySelector('.value-cell');
      valueCell.click();

      expect(spy).toHaveBeenCalled();
    });
  });
  //#endregion
});
