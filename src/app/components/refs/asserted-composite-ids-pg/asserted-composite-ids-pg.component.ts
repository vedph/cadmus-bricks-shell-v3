import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
  AssertedCompositeIdsComponent,
} from '../../../../../projects/myrmidon/cadmus-refs-asserted-ids/src/public-api';

@Component({
  selector: 'app-asserted-composite-ids-pg',
  templateUrl: './asserted-composite-ids-pg.component.html',
  styleUrls: ['./asserted-composite-ids-pg.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatCheckboxModule,
    AssertedCompositeIdsComponent,
  ],
})
export class AssertedCompositeIdsPgComponent implements OnInit {
  // form
  public pinByTypeMode: FormControl<boolean>;
  public canSwitchMode: FormControl<boolean>;
  public canEditTarget: FormControl<boolean>;
  public form: FormGroup;
  // data
  public ids?: AssertedCompositeId[];
  public idScopeEntries: ThesaurusEntry[];
  public idTagEntries: ThesaurusEntry[];
  public assTagEntries: ThesaurusEntry[];
  public refTypeEntries: ThesaurusEntry[];
  public refTagEntries: ThesaurusEntry[];

  constructor(formBuilder: FormBuilder) {
    // form
    this.pinByTypeMode = formBuilder.control(false, { nonNullable: true });
    this.canSwitchMode = formBuilder.control(true, { nonNullable: true });
    this.canEditTarget = formBuilder.control(true, { nonNullable: true });
    this.form = formBuilder.group({
      pinByTypeMode: this.pinByTypeMode,
      canSwitchMode: this.canSwitchMode,
      canEditTarget: this.canEditTarget,
    });
    // data
    this.idScopeEntries = [
      {
        id: 'scope1',
        value: 'id-scope-1',
      },
      {
        id: 'scope2',
        value: 'id-scope-2',
      },
      {
        id: '-',
        value: '---',
      },
    ];
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

    this.ids = [
      {
        target: {
          gid: 'http://some-resources/stuff/alpha',
          label: 'alpha',
        },
        scope: '-',
      },
      {
        target: {
          gid: 'http://some-resources/stuff/beta',
          label: 'beta',
        },
        scope: '-',
      },
      {
        target: {
          gid: 'P71821d42-dd44-4d1e-a78a-000000000019/alpha',
          label: 'alpha | Item 0: alpha (metadata)',
          itemId: '71821d42-dd44-4d1e-a78a-000000000001',
          partId: '71821d42-dd44-4d1e-a78a-000000000019',
          partTypeId: 'it.vedph.metadata',
          roleId: '',
          name: 'eid',
          value: 'alpha',
        },
        scope: '',
      },
    ];
  }

  ngOnInit(): void {}

  public onIdsChange(ids: AssertedCompositeId[]): void {
    this.ids = ids;
  }
}
