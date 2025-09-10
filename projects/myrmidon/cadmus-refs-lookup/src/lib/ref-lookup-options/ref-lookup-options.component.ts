import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';

import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';

/**
 * The options dialog for RefLookupComponent. This provides a dialog frame
 * whose content should be dynamically set via data.component. In turn,
 * data gets injected via the MAT_DIALOG_DATA token.
 */
@Component({
  selector: 'cadmus-refs-lookup-options',
  templateUrl: './ref-lookup-options.component.html',
  styleUrls: ['./ref-lookup-options.component.css'],
  imports: [CommonModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefLookupOptionsComponent {
  constructor(
    private _dialogRef: MatDialogRef<RefLookupOptionsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  public onClose(): void {
    this._dialogRef.close();
  }
}
