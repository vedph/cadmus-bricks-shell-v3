import { JsonPipe } from '@angular/common';
import { Component, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import {
  NamedValue,
  NamedValueMap,
  NamedValueSetEditor,
} from '@myrmidon/cadmus-named-value';

const CLOSED_NAMES: NamedValue[] = [
  { name: 'Author', value: 'author' },
  { name: 'Title', value: 'title' },
  { name: 'Tag', value: 'tag' },
  { name: 'Language', value: 'language' },
];

const CLOSED_VALUES: NamedValueMap = {
  tag: [
    { name: 'Important', value: 'important' },
    { name: 'Draft', value: 'draft' },
    { name: 'Reviewed', value: 'reviewed' },
  ],
  language: [
    { name: 'English', value: 'en' },
    { name: 'Italian', value: 'it' },
    { name: 'French', value: 'fr' },
  ],
};

const MULTI_VALUED_NAMES = ['tag'];

const PREFIX_PATTERN = '^\\@\\d+:$';

const INITIAL_VALUES: NamedValue[] = [
  { name: 'author', value: 'Dante Alighieri' },
  { name: 'title', value: 'Divina Commedia' },
  { name: 'language', value: 'it' },
];

@Component({
  selector: 'app-named-value-set-editor-pg',
  templateUrl: './named-value-set-editor-pg.component.html',
  styleUrl: './named-value-set-editor-pg.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    NamedValueSetEditor,
    JsonPipe,
  ],
})
export class NamedValueSetEditorPgComponent {
  public readonly useClosedNames = signal<boolean>(true);
  public readonly useClosedValues = signal<boolean>(true);
  public readonly useMultiValuedNames = signal<boolean>(true);
  public readonly hasPrefix = signal<boolean>(false);
  public readonly usePrefixPattern = signal<boolean>(false);
  public readonly batchMode = signal<boolean>(false);
  public readonly valueFilterThreshold = signal<number>(2);

  public readonly closedNames = computed<NamedValue[] | undefined>(() =>
    this.useClosedNames() ? CLOSED_NAMES : undefined
  );
  public readonly closedValues = computed<NamedValueMap | undefined>(() =>
    this.useClosedValues() ? CLOSED_VALUES : undefined
  );
  public readonly multiValuedNames = computed<string[]>(() =>
    this.useMultiValuedNames() ? MULTI_VALUED_NAMES : []
  );
  public readonly prefixPattern = computed<string | undefined>(() =>
    this.usePrefixPattern() ? PREFIX_PATTERN : undefined
  );

  public values: NamedValue[] | undefined = [...INITIAL_VALUES];

  public onClose(): void {
    console.log('Close clicked');
  }
}
