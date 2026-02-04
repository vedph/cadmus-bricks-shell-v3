import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  input,
  model,
  OnInit,
  Optional,
  output,
} from '@angular/core';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  AssertedCompositeId,
  AssertedCompositeIdComponent,
} from '@myrmidon/cadmus-refs-asserted-ids';
import { LookupProviderOptions } from '@myrmidon/cadmus-refs-lookup';
import { IndexLookupDefinitions, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { ThesaurusService } from '@myrmidon/cadmus-api';

export interface LinkEditorComponentData {
  id?: AssertedCompositeId;
  pinByTypeMode?: boolean;
  canSwitchMode?: boolean;
  canEditTarget?: boolean;
  defaultPartTypeKey?: string;
  lookupDefinitions?: IndexLookupDefinitions;
  internalDefault?: boolean;
}

@Component({
  selector: 'cadmus-link-editor',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
    AssertedCompositeIdComponent,
  ],
  templateUrl: './link-editor.component.html',
  styleUrl: './link-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkEditorComponent implements OnInit {
  public external?: boolean;
  public pinByTypeMode?: boolean;
  public canSwitchMode?: boolean;
  public canEditTarget?: boolean;
  public defaultPartTypeKey?: string;
  public lookupDefinitions?: IndexLookupDefinitions;
  public internalDefault?: boolean;

  /**
   * Optional preset options for lookup providers.
   * Maps provider IDs to their available scopes.
   */
  public readonly lookupProviderOptions = input<LookupProviderOptions>();

  // asserted-id-scopes
  public readonly idScopeEntries = model<ThesaurusEntry[]>();

  // asserted-id-tags
  public readonly idTagEntries = model<ThesaurusEntry[]>();

  // assertion-tags
  public readonly assTagEntries = model<ThesaurusEntry[]>();

  // doc-reference-types
  public readonly refTypeEntries = model<ThesaurusEntry[]>();

  // doc-reference-tags
  public readonly refTagEntries = model<ThesaurusEntry[]>();

  /**
   * The current ID.
   */
  public readonly id = model<AssertedCompositeId>();

  /**
   * Emitted when the editor is closed.
   */
  public readonly closeRequest = output();

  public readonly inDialog;

  constructor(
    private _thesService: ThesaurusService,
    @Optional()
    public dialogRef?: MatDialogRef<LinkEditorComponent>,
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    public data?: LinkEditorComponentData,
  ) {
    this.inDialog = !!dialogRef;
  }

  public ngOnInit(): void {
    if (this.data?.id) {
      this.id.set(this.data.id);
    }
    this.loadThesauri();
  }

  private loadThesauri(): void {
    this._thesService
      .getThesauriSet([
        'asserted-id-scopes',
        'asserted-id-tags',
        'assertion-tags',
        'doc-reference-types',
        'doc-reference-tags',
      ])
      .subscribe((set) => {
        this.idScopeEntries.set(set['asserted-id-scopes']?.entries);
        this.idTagEntries.set(set['asserted-id-tags']?.entries);
        this.assTagEntries.set(set['assertion-tags']?.entries);
        this.refTypeEntries.set(set['doc-reference-types']?.entries);
        this.refTagEntries.set(set['doc-reference-tags']?.entries);
      });
  }

  public close(): void {
    this.closeRequest.emit();
    this.dialogRef?.close();
  }

  public onIdChange(id?: AssertedCompositeId): void {
    this.id.set(id!);
  }

  public save(): void {
    this.dialogRef?.close(this.id()!);
  }
}
