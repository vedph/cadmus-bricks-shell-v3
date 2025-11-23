import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  effect,
} from '@angular/core';

import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';

/**
 * The filter settings for the object viewer.
 */
export interface FilterSettings {
  hideEmptyArrays: boolean;
  hideEmptyObjects: boolean;
  hideEmptyStrings: boolean;
  hideZeroNumbers: boolean;
  hideFalseBooleans: boolean;
}

/**
 * The event fired when a value is picked from the object viewer.
 */
export interface ValuePickEvent {
  key: string;
  value: any;
  displayValue: string;
}

/**
 * A node in the data tree.
 */
interface DataNode {
  key: string;
  value: any;
  type: 'primitive' | 'object' | 'array';
  children?: DataNode[];
  count?: number;
  level: number;
  parent?: DataNode;
  id: string;
}

/**
 * Object viewer component. This is a generic component to view any
 * JavaScript object in a tree-like structure. It supports filtering
 * and hiding empty values.
 */
@Component({
  selector: 'cadmus-ui-object-view',
  imports: [
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatExpansionModule,
    MatTooltipModule,
    FormsModule
],
  templateUrl: './cadmus-ui-object-view.html',
  styleUrls: ['./cadmus-ui-object-view.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObjectViewComponent {
  private readonly _snackBar = inject(MatSnackBar);
  private _isUpdatingExpansion = false;
  private readonly _maxDepth = 50; // Prevent infinite recursion

  /**
   * The object to view.
   */
  public readonly data = input<any>(undefined);
  /**
   * The title to show in the toolbar.
   */
  public readonly title = input('Object Viewer');
  /**
   * Property names to exclude from the object tree.
   * These are typically service references or other non-data properties.
   */
  public readonly propertyBlacklist = input<string[]>([
    'service',
    'services',
    '_service',
    '_services',
    'injector',
    '_injector',
    'elementRef',
    '_elementRef',
    'changeDetectorRef',
    '_changeDetectorRef',
    'viewContainerRef',
    '_viewContainerRef',
    'renderer',
    '_renderer',
    'document',
    '_document',
    'window',
    '_window',
    'zone',
    '_zone',
    'ngZone',
    '_ngZone',
  ]);
  /*
   * True to hide empty arrays.
   */
  public readonly hideEmptyArrays = input(false);
  /**
   * True to hide empty objects.
   */
  public readonly hideEmptyObjects = input(false);
  /**
   * True to hide empty strings.
   */
  public readonly hideEmptyStrings = input(false);
  /**
   * True to hide zero numbers.
   */
  public readonly hideZeroNumbers = input(false);
  /**
   * True to hide false booleans.
   */
  public readonly hideFalseBooleans = input(false);

  /**
   * True to copy the value to clipboard when picked.
   */
  public readonly copyOnPick = input(true);

  /**
   * Emits when a value is picked.
   */
  public readonly valuePick = output<ValuePickEvent>();

  /**
   * The data tree built from the input object.
   */
  public readonly dataTree = signal<DataNode[]>([]);

  /**
   * Tracks expansion state for nodes by their stable path-based ID.
   */
  public readonly expansionState = signal<Map<string, boolean>>(new Map());

  /**
   * True if the settings panel is expanded.
   */
  public readonly settingsPanelExpanded = signal(false);

  /**
   * The name filter for nodes in the tree.
   */
  public readonly nameFilter = signal('');

  /**
   * The value filter for nodes in the tree.
   */
  public readonly valueFilter = signal('');

  /**
   * The filter settings (hide empty arrays, objects, etc.).
   */
  public readonly filterSettings = signal<FilterSettings>({
    hideEmptyArrays: false,
    hideEmptyObjects: false,
    hideEmptyStrings: false,
    hideZeroNumbers: false,
    hideFalseBooleans: false,
  });

  /**
   * The current filter settings, combining input signals and
   * the filterSettings signal.
   */
  public readonly currentFilterSettings = computed(() => ({
    hideEmptyArrays:
      this.filterSettings().hideEmptyArrays || this.hideEmptyArrays(),
    hideEmptyObjects:
      this.filterSettings().hideEmptyObjects || this.hideEmptyObjects(),
    hideEmptyStrings:
      this.filterSettings().hideEmptyStrings || this.hideEmptyStrings(),
    hideZeroNumbers:
      this.filterSettings().hideZeroNumbers || this.hideZeroNumbers(),
    hideFalseBooleans:
      this.filterSettings().hideFalseBooleans || this.hideFalseBooleans(),
  }));

  /**
   * The columns to display in the table.
   */
  public readonly displayedColumns = computed(() => ['name', 'value']);

  /**
   * The nodes to display, after filtering and flattening the tree.
   */
  public readonly displayedNodes = computed(() => {
    const tree = this.dataTree();
    if (!tree.length) return [];

    try {
      return this.filterAndFlattenNodes(tree);
    } catch (error) {
      console.error('Error in displayedNodes computation:', error);
      return [];
    }
  });

  constructor() {
    // initialize filter settings from input signals
    effect(() => {
      this.filterSettings.set({
        hideEmptyArrays: this.hideEmptyArrays(),
        hideEmptyObjects: this.hideEmptyObjects(),
        hideEmptyStrings: this.hideEmptyStrings(),
        hideZeroNumbers: this.hideZeroNumbers(),
        hideFalseBooleans: this.hideFalseBooleans(),
      });
    });

    // sync data tree when input data changes
    effect(() => {
      const inputData = this.data();
      if (inputData && !this._isUpdatingExpansion) {
        try {
          // Filter the object to remove blacklisted properties
          const filteredData = this.filterBlacklistedProperties(inputData);
          const tree = this.createNodeTree(
            filteredData,
            '',
            0,
            new WeakSet(),
            ''
          );
          this.dataTree.set(tree);
        } catch (error) {
          console.error('Error building data tree:', error);
          this.dataTree.set([]);
        }
      } else if (!inputData) {
        this.dataTree.set([]);
        this.expansionState.set(new Map());
      }
    });
  }

  private filterBlacklistedProperties(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // for primitive types, return as-is
    if (typeof obj !== 'object') {
      return obj;
    }

    // handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.filterBlacklistedProperties(item));
    }

    // handle objects
    const blacklist = new Set(this.propertyBlacklist());
    const filtered: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // skip blacklisted properties
      if (blacklist.has(key)) {
        continue;
      }

      // skip function properties (these are typically methods or service references)
      if (typeof value === 'function') {
        continue;
      }

      // skip properties that look like Angular or framework internals
      if (key.startsWith('__') || key.startsWith('ɵ') || key.startsWith('ng')) {
        continue;
      }

      // recursively filter nested objects
      try {
        filtered[key] = this.filterBlacklistedProperties(value);
      } catch (error) {
        // if we can't process a property (e.g., circular reference, getter that throws),
        // replace it with a placeholder
        filtered[key] = '[Unprocessable Property]';
      }
    }

    return filtered;
  }

  private createNodeTree(
    obj: any,
    key: string,
    level: number,
    visited: WeakSet<object>,
    parentPath: string
  ): DataNode[] {
    const currentPath = parentPath ? `${parentPath}.${key}` : key;

    if (obj === null || obj === undefined) {
      return [
        {
          key,
          value: obj,
          type: 'primitive',
          level,
          id: currentPath,
        },
      ];
    }

    // Handle circular references
    if (typeof obj === 'object' && visited.has(obj)) {
      return [
        {
          key,
          value: '[Circular Reference]',
          type: 'primitive',
          level,
          id: currentPath,
        },
      ];
    }

    if (Array.isArray(obj)) {
      const node: DataNode = {
        key,
        value: obj,
        type: 'array',
        count: obj.length,
        level,
        children: [],
        id: currentPath,
      };

      if (typeof obj === 'object') {
        visited.add(obj);
      }

      // create children for array items
      obj.forEach((item, index) => {
        const childNodes = this.createNodeTree(
          item,
          index.toString(),
          level + 1,
          visited,
          currentPath
        );
        node.children!.push(...childNodes);
      });

      return [node];
    }

    if (typeof obj === 'object') {
      const node: DataNode = {
        key,
        value: obj,
        type: 'object',
        count: Object.keys(obj).length,
        level,
        children: [],
        id: currentPath,
      };

      visited.add(obj);

      // create children for object properties
      Object.entries(obj).forEach(([propKey, propValue]) => {
        const childNodes = this.createNodeTree(
          propValue,
          propKey,
          level + 1,
          visited,
          currentPath
        );
        node.children!.push(...childNodes);
      });

      return [node];
    }

    // primitive value
    return [
      {
        key,
        value: obj,
        type: 'primitive',
        level,
        id: currentPath,
      },
    ];
  }

  private filterAndFlattenNodes(
    nodes: DataNode[],
    visited: Set<string> = new Set(),
    depth: number = 0
  ): DataNode[] {
    // Prevent infinite recursion
    if (depth > this._maxDepth) {
      console.warn('Maximum depth reached in filterAndFlattenNodes');
      return [];
    }

    const result: DataNode[] = [];
    const filters = this.currentFilterSettings();
    const nameFilterValue = this.nameFilter();
    const valueFilterValue = this.valueFilter();
    const expansionMap = this.expansionState();

    for (const node of nodes) {
      // Check for circular references using node IDs
      if (visited.has(node.id)) {
        continue;
      }

      if (this.shouldHideNode(node, filters)) {
        continue;
      }

      if (
        this.matchesFilters(node, nameFilterValue, valueFilterValue) ||
        this.hasMatchingDescendant(
          node,
          nameFilterValue,
          valueFilterValue,
          filters,
          new Set(visited),
          depth + 1
        )
      ) {
        result.push(node);

        const isExpanded = expansionMap.get(node.id) || false;
        if (isExpanded && node.children) {
          // Add current node to visited set for this branch
          const newVisited = new Set(visited);
          newVisited.add(node.id);

          result.push(
            ...this.filterAndFlattenNodes(node.children, newVisited, depth + 1)
          );
        }
      }
    }

    return result;
  }

  private shouldHideNode(node: DataNode, filters: FilterSettings): boolean {
    if (node.type === 'primitive') {
      const value = node.value;

      if (filters.hideEmptyStrings && value === '') return true;
      if (filters.hideZeroNumbers && value === 0) return true;
      if (filters.hideFalseBooleans && value === false) return true;
    } else if (node.type === 'array') {
      if (filters.hideEmptyArrays && node.count === 0) return true;
    } else if (node.type === 'object') {
      if (filters.hideEmptyObjects && node.count === 0) return true;
    }

    return false;
  }

  private matchesFilters(
    node: DataNode,
    nameFilter: string,
    valueFilter: string
  ): boolean {
    const nameMatch =
      !nameFilter || node.key.toLowerCase().includes(nameFilter.toLowerCase());

    const valueMatch =
      !valueFilter ||
      this.getDisplayValue(node)
        .toLowerCase()
        .includes(valueFilter.toLowerCase());

    return nameMatch && valueMatch;
  }

  private hasMatchingDescendant(
    node: DataNode,
    nameFilter: string,
    valueFilter: string,
    filters: FilterSettings,
    visited: Set<string> = new Set(),
    depth: number = 0
  ): boolean {
    // Prevent infinite recursion
    if (depth > this._maxDepth || !node.children || visited.has(node.id)) {
      return false;
    }

    const newVisited = new Set(visited);
    newVisited.add(node.id);

    return node.children.some(
      (child) =>
        !this.shouldHideNode(child, filters) &&
        (this.matchesFilters(child, nameFilter, valueFilter) ||
          this.hasMatchingDescendant(
            child,
            nameFilter,
            valueFilter,
            filters,
            newVisited,
            depth + 1
          ))
    );
  }

  private updateNodeInTree(nodeId: string, updates: Partial<DataNode>): void {
    const updateNode = (nodes: DataNode[]): DataNode[] => {
      return nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, ...updates };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };

    this.dataTree.set(updateNode(this.dataTree()));
  }

  private setAllNodesExpanded(expanded: boolean): void {
    this._isUpdatingExpansion = true;

    const newExpansionState = new Map<string, boolean>();

    const updateExpansionRecursive = (nodes: DataNode[]) => {
      for (const node of nodes) {
        if (node.type !== 'primitive') {
          newExpansionState.set(node.id, expanded);
        }
        if (node.children) {
          updateExpansionRecursive(node.children);
        }
      }
    };

    updateExpansionRecursive(this.dataTree());
    this.expansionState.set(newExpansionState);

    this._isUpdatingExpansion = false;
  }

  private setNodeExpandedRecursive(node: DataNode, expanded: boolean): void {
    this._isUpdatingExpansion = true;

    const currentState = new Map(this.expansionState());
    const visited = new Set<string>();

    const updateNodeRecursive = (currentNode: DataNode, depth: number = 0) => {
      // Prevent infinite recursion
      if (depth > this._maxDepth || visited.has(currentNode.id)) {
        return;
      }

      visited.add(currentNode.id);

      if (currentNode.type !== 'primitive') {
        currentState.set(currentNode.id, expanded);
      }
      if (currentNode.children) {
        currentNode.children.forEach((child) =>
          updateNodeRecursive(child, depth + 1)
        );
      }
    };

    updateNodeRecursive(node);
    this.expansionState.set(currentState);

    this._isUpdatingExpansion = false;
  }

  private expandMatchingNodes(): void {
    this._isUpdatingExpansion = true;

    const nameFilterValue = this.nameFilter();
    const valueFilterValue = this.valueFilter();
    const filters = this.currentFilterSettings();
    const currentState = new Map(this.expansionState());
    const visited = new Set<string>();

    const expandMatchingNodesRecursive = (
      nodes: DataNode[],
      depth: number = 0
    ) => {
      // Prevent infinite recursion
      if (depth > this._maxDepth) {
        return;
      }

      for (const node of nodes) {
        if (visited.has(node.id)) {
          continue;
        }

        visited.add(node.id);

        const hasMatchingDescendant = this.hasMatchingDescendant(
          node,
          nameFilterValue,
          valueFilterValue,
          filters,
          new Set(),
          0
        );
        const shouldExpand =
          hasMatchingDescendant ||
          this.matchesFilters(node, nameFilterValue, valueFilterValue);

        if (node.type !== 'primitive' && shouldExpand) {
          currentState.set(node.id, true);
        }

        if (node.children) {
          expandMatchingNodesRecursive(node.children, depth + 1);
        }
      }
    };

    expandMatchingNodesRecursive(this.dataTree());
    this.expansionState.set(currentState);

    this._isUpdatingExpansion = false;
  }

  private copyValueToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    } else {
      return this.fallbackCopy(text);
    }
  }

  private fallbackCopy(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand('copy');
        resolve();
      } catch (err) {
        reject(err);
      }

      document.body.removeChild(textArea);
    });
  }

  private showCopyNotification(): void {
    this._snackBar.open('Value copied to clipboard!', 'Close', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  public getDisplayValue(node: DataNode): string {
    if (node.type === 'primitive') {
      if (typeof node.value === 'string') {
        return `"${node.value}"`;
      }
      return String(node.value);
    }

    const count = node.count || 0;
    const itemType = node.type === 'array' ? 'items' : 'properties';
    return `${count} ${itemType}`;
  }

  public isNodeExpanded(node: DataNode): boolean {
    return this.expansionState().get(node.id) || false;
  }

  public isNameHighlighted(name: string): boolean {
    const filter = this.nameFilter();
    return filter && name.toLowerCase().includes(filter.toLowerCase())
      ? true
      : false;
  }

  public isValueHighlighted(value: string): boolean {
    const filter = this.valueFilter();
    return filter && value.toLowerCase().includes(filter.toLowerCase())
      ? true
      : false;
  }

  //#region Event handlers
  public handleToggleNode(node: DataNode): void {
    this._isUpdatingExpansion = true;
    const currentState = new Map(this.expansionState());
    const currentExpanded = currentState.get(node.id) || false;
    currentState.set(node.id, !currentExpanded);
    this.expansionState.set(currentState);
    this._isUpdatingExpansion = false;
  }

  public handleToggleNodeRecursive(node: DataNode, event: Event): void {
    event.stopPropagation();
    const newExpanded = !(this.expansionState().get(node.id) || false);
    this.setNodeExpandedRecursive(node, newExpanded);
  }

  public handleExpandAll(): void {
    this.setAllNodesExpanded(true);
  }

  public handleCollapseAll(): void {
    this.setAllNodesExpanded(false);
  }

  public handleToggleSettingsPanel(): void {
    this.settingsPanelExpanded.set(!this.settingsPanelExpanded());
  }

  public handleNameFilterChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.nameFilter.set(target.value);
    this.onFilterChange();
  }

  public handleValueFilterChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.valueFilter.set(target.value);
    this.onFilterChange();
  }

  public handleFilterSettingChange(
    setting: keyof FilterSettings,
    value: boolean
  ): void {
    this.filterSettings.update((current) => ({
      ...current,
      [setting]: value,
    }));
  }

  public handleCopyValue(node: DataNode): void {
    if (node.type !== 'primitive') return;

    const textToCopy =
      typeof node.value === 'string' ? node.value : String(node.value);
    const displayValue = this.getDisplayValue(node);

    this.valuePick.emit({
      key: node.key,
      value: node.value,
      displayValue,
    });

    if (this.copyOnPick()) {
      this.copyValueToClipboard(textToCopy)
        .then(() => {
          this.showCopyNotification();
        })
        .catch((err) => {
          console.error('Failed to copy text: ', err);
        });
    }
  }

  private onFilterChange(): void {
    // Expand nodes that match the search criteria
    const nameFilterValue = this.nameFilter();
    const valueFilterValue = this.valueFilter();

    if (nameFilterValue || valueFilterValue) {
      this.expandMatchingNodes();
    }
  }
  //#endregion
}
