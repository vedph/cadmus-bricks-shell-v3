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
import { CommonModule } from '@angular/common';
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

export interface FilterSettings {
  hideEmptyArrays: boolean;
  hideEmptyObjects: boolean;
  hideEmptyStrings: boolean;
  hideZeroNumbers: boolean;
  hideFalseBooleans: boolean;
}

export interface ValuePickEvent {
  key: string;
  value: any;
  displayValue: string;
}

interface DataNode {
  key: string;
  value: any;
  type: 'primitive' | 'object' | 'array';
  expanded: boolean;
  children?: DataNode[];
  count?: number;
  level: number;
  parent?: DataNode;
  id: string;
}

@Component({
  selector: 'cadmus-ui-object-view',
  imports: [
    CommonModule,
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
    FormsModule,
  ],
  templateUrl: './cadmus-ui-object-view.html',
  styleUrls: ['./cadmus-ui-object-view.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObjectViewComponent {
  private readonly _snackBar = inject(MatSnackBar);

  /**
   * The object to view.
   */
  readonly data = input<any>(null);

  /*
   * True to hide empty arrays.
   */
  readonly hideEmptyArrays = input(false);
  /**
   * True to hide empty objects.
   */
  readonly hideEmptyObjects = input(false);
  /**
   * True to hide empty strings.
   */
  readonly hideEmptyStrings = input(false);
  /**
   * True to hide zero numbers.
   */
  readonly hideZeroNumbers = input(false);
  /**
   * True to hide false booleans.
   */
  readonly hideFalseBooleans = input(false);

  /**
   * True to copy the value to clipboard when picked.
   */
  readonly copyOnPick = input(true);

  /**
   * Emits when a value is picked.
   */
  readonly valuePick = output<ValuePickEvent>();

  public readonly dataTree = signal<DataNode[]>([]);
  public readonly settingsPanelExpanded = signal(false);
  public readonly nameFilter = signal('');
  public readonly valueFilter = signal('');
  public readonly filterSettings = signal<FilterSettings>({
    hideEmptyArrays: false,
    hideEmptyObjects: false,
    hideEmptyStrings: false,
    hideZeroNumbers: false,
    hideFalseBooleans: false,
  });

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

  public readonly displayedColumns = computed(() => ['name', 'value']);

  public readonly displayedNodes = computed(() => {
    const tree = this.dataTree();
    if (!tree.length) return [];

    return this.filterAndFlattenNodes(tree);
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
      if (inputData) {
        try {
          const tree = this.createNodeTree(inputData, '', 0, new WeakSet());
          this.dataTree.set(tree);
        } catch (error) {
          console.error('Error building data tree:', error);
          this.dataTree.set([]);
        }
      } else {
        this.dataTree.set([]);
      }
    });
  }

  private createNodeTree(
    obj: any,
    key: string,
    level: number,
    visited: WeakSet<object>
  ): DataNode[] {
    if (obj === null || obj === undefined) {
      return [
        {
          key,
          value: obj,
          type: 'primitive',
          expanded: false,
          level,
          id: this.generateNodeId(key, level),
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
          expanded: false,
          level,
          id: this.generateNodeId(key, level),
        },
      ];
    }

    if (Array.isArray(obj)) {
      const node: DataNode = {
        key,
        value: obj,
        type: 'array',
        expanded: false,
        count: obj.length,
        level,
        children: [],
        id: this.generateNodeId(key, level),
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
          visited
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
        expanded: false,
        count: Object.keys(obj).length,
        level,
        children: [],
        id: this.generateNodeId(key, level),
      };

      visited.add(obj);

      // create children for object properties
      Object.entries(obj).forEach(([propKey, propValue]) => {
        const childNodes = this.createNodeTree(
          propValue,
          propKey,
          level + 1,
          visited
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
        expanded: false,
        level,
        id: this.generateNodeId(key, level),
      },
    ];
  }

  private generateNodeId(key: string, level: number): string {
    return `${level}-${key}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private filterAndFlattenNodes(nodes: DataNode[]): DataNode[] {
    const result: DataNode[] = [];
    const filters = this.currentFilterSettings();
    const nameFilterValue = this.nameFilter();
    const valueFilterValue = this.valueFilter();

    for (const node of nodes) {
      if (this.shouldHideNode(node, filters)) {
        continue;
      }

      if (
        this.matchesFilters(node, nameFilterValue, valueFilterValue) ||
        this.hasMatchingDescendant(
          node,
          nameFilterValue,
          valueFilterValue,
          filters
        )
      ) {
        result.push(node);

        if (node.expanded && node.children) {
          result.push(...this.filterAndFlattenNodes(node.children));
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
    filters: FilterSettings
  ): boolean {
    if (!node.children) return false;

    return node.children.some(
      (child) =>
        !this.shouldHideNode(child, filters) &&
        (this.matchesFilters(child, nameFilter, valueFilter) ||
          this.hasMatchingDescendant(child, nameFilter, valueFilter, filters))
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
    const updateAllNodes = (nodes: DataNode[]): DataNode[] => {
      return nodes.map((node) => ({
        ...node,
        expanded: node.type !== 'primitive' ? expanded : false,
        children: node.children ? updateAllNodes(node.children) : undefined,
      }));
    };

    this.dataTree.set(updateAllNodes(this.dataTree()));
  }

  private setNodeExpandedRecursive(node: DataNode, expanded: boolean): void {
    this.updateNodeInTree(node.id, { expanded });

    if (node.children) {
      node.children.forEach((child) => {
        if (child.type !== 'primitive') {
          this.setNodeExpandedRecursive(child, expanded);
        }
      });
    }
  }

  private expandMatchingNodes(): void {
    const nameFilterValue = this.nameFilter();
    const valueFilterValue = this.valueFilter();
    const filters = this.currentFilterSettings();

    const expandMatchingNodesRecursive = (nodes: DataNode[]): DataNode[] => {
      return nodes.map((node) => {
        const hasMatchingDescendant = this.hasMatchingDescendant(
          node,
          nameFilterValue,
          valueFilterValue,
          filters
        );
        const shouldExpand =
          hasMatchingDescendant ||
          this.matchesFilters(node, nameFilterValue, valueFilterValue);

        return {
          ...node,
          expanded: node.type !== 'primitive' && shouldExpand,
          children: node.children
            ? expandMatchingNodesRecursive(node.children)
            : undefined,
        };
      });
    };

    this.dataTree.set(expandMatchingNodesRecursive(this.dataTree()));
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
    this.updateNodeInTree(node.id, { expanded: !node.expanded });
  }

  public handleToggleNodeRecursive(node: DataNode, event: Event): void {
    event.stopPropagation();
    const newExpanded = !node.expanded;
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
