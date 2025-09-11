import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { RefLookupConfig } from '@myrmidon/cadmus-refs-lookup';

import {
  PinTarget,
  PinTargetLookupComponent,
} from '@myrmidon/cadmus-refs-asserted-ids';
import { ViafRefLookupService } from '@myrmidon/cadmus-refs-viaf-lookup';

import { WebColorLookup } from '../ref-lookup-pg/ref-lookup-pg.component';

@Component({
  selector: 'app-pin-target-lookup-pg',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatCheckboxModule,
    PinTargetLookupComponent,
  ],
  templateUrl: './pin-target-lookup-pg.component.html',
  styleUrl: './pin-target-lookup-pg.component.scss',
})
export class PinTargetLookupPgComponent {
  public readonly extLookupConfigs: RefLookupConfig[];
  public readonly canSwitchMode: FormControl<boolean> = new FormControl(false, {
    nonNullable: true,
  });
  public readonly canEditTarget: FormControl<boolean> = new FormControl(false, {
    nonNullable: true,
  });
  public readonly pinByTypeMode: FormControl<boolean> = new FormControl(false, {
    nonNullable: true,
  });

  constructor(viaf: ViafRefLookupService) {
    this.extLookupConfigs = [
      {
        name: 'VIAF',
        iconUrl: 'img/viaf128.png',
        description: 'Virtual International Authority File',
        label: 'ID',
        service: viaf,
        itemIdGetter: (item: any) => item?.viafid,
        itemLabelGetter: (item: any) => item?.displayForm,
      },
      {
        name: 'colors',
        iconUrl: 'img/colors128.png',
        description: 'Colors',
        label: 'ID',
        service: new WebColorLookup(),
        itemIdGetter: (item: any) => item?.value,
        itemLabelGetter: (item: any) => item?.name,
      },
    ] as RefLookupConfig[];
  }

  public target: PinTarget = {
    gid: 'https://toppings.org/peperoni',
    label: 'Peperoni',
  };

  public onTargetChange(target: PinTarget): void {
    console.log('Target changed:', target);
    this.target = target;
  }
}
