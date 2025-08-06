import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import {
  AssertedCompositeId,
  AssertedCompositeIdComponent,
} from '../../../../../projects/myrmidon/cadmus-refs-asserted-ids/src/public-api';

@Component({
  selector: 'app-asserted-composite-id-pg',
  templateUrl: './asserted-composite-id-pg.component.html',
  styleUrls: ['./asserted-composite-id-pg.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatCheckboxModule,
    AssertedCompositeIdComponent,
  ],
})
export class AssertedCompositeIdPgComponent {
  // form
  public pinByTypeMode: FormControl<boolean>;
  public canSwitchMode: FormControl<boolean>;
  public canEditTarget: FormControl<boolean>;
  public form: FormGroup;
  // data
  public id?: AssertedCompositeId;
  public idTagEntries: ThesaurusEntry[];
  public assTagEntries: ThesaurusEntry[];
  public refTypeEntries: ThesaurusEntry[];
  public refTagEntries: ThesaurusEntry[];

  constructor(formBuilder: FormBuilder) {
    // form
    this.pinByTypeMode = formBuilder.control(false, { nonNullable: true });
    this.canSwitchMode = formBuilder.control(true, { nonNullable: true });
    this.canEditTarget = formBuilder.control(true, { nonNullable: true });
    // form group
    this.form = formBuilder.group({
      pinByTypeMode: this.pinByTypeMode,
      canSwitchMode: this.canSwitchMode,
      canEditTarget: this.canEditTarget,
    });
    this.idTagEntries = [
      {
        id: 'idt1',
        value: 'id-tag-1',
      },
      {
        id: 'idt2',
        value: 'id-tag-2',
      },
      {
        id: '-',
        value: '---',
      },
    ];
    this.assTagEntries = [
      {
        id: 'ast1',
        value: 'ass-tag-1',
      },
      {
        id: 'ast2',
        value: 'ass-tag-2',
      },
      {
        id: '-',
        value: '---',
      },
    ];
    this.refTypeEntries = [
      {
        id: 'book',
        value: 'book',
      },
      {
        id: 'ms',
        value: 'manuscript',
      },
    ];
    this.refTagEntries = [
      {
        id: 'a',
        value: 'alpha',
      },
      {
        id: 'b',
        value: 'beta',
      },
      {
        id: '-',
        value: '---',
      },
    ];
    this.id = {
      target: {
        gid: 'http://www.guys.com/john_doe',
        label: 'John Doe',
      },
    };
  }

  public onIdChange(id: AssertedCompositeId | undefined): void {
    this.id = id;
  }
}
