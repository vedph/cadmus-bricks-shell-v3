import { Component, Inject, output } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ItemService } from '@myrmidon/cadmus-api';

import {
  DataPinInfo,
  IndexLookupDefinitions,
  Item,
  Part,
} from '@myrmidon/cadmus-core';
import { forkJoin, of, take } from 'rxjs';

import { PinRefLookupService } from '../services/pin-ref-lookup.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';

// from Cadmus general parts
const METADATA_PART_ID = 'it.vedph.metadata';
interface MetadataPart extends Part {
  metadata: {
    type?: string;
    name: string;
    value: string;
  }[];
}

interface LookupInfo {
  pin: DataPinInfo;
  item?: Item;
  part?: MetadataPart;
}

/*
 * Scoped pin-based lookup component. This component provides a list
 * of pin-based searches, with a lookup control. Whenever the user
 * picks a pin value, he gets the details about its item and part, and
 * item's metadata part, if any. He can then use these data to build
 * some EID by variously assembling these components.
 */
@Component({
  selector: 'cadmus-scoped-pin-lookup',
  templateUrl: './scoped-pin-lookup.component.html',
  styleUrls: ['./scoped-pin-lookup.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    RefLookupComponent,
  ],
})
export class ScopedPinLookupComponent {
  // lookup
  public key: FormControl<string | null>;
  public keyForm: FormGroup;
  public keys: string[];
  public info?: LookupInfo;
  // builder
  public id: FormControl<string | null>;
  public idForm: FormGroup;

  /**
   * Emitted whenever the user picks an ID.
   */
  public readonly idPick = output<string>();

  constructor(
    formBuilder: FormBuilder,
    private _itemService: ItemService,
    public lookupService: PinRefLookupService,
    @Inject('indexLookupDefinitions')
    public lookupDefs: IndexLookupDefinitions
  ) {
    // lookup
    // keys are all the defined lookup searches
    this.keys = Object.keys(lookupDefs);
    // the selected key defines the lookup scope
    this.key = formBuilder.control(null);
    this.keyForm = formBuilder.group({
      key: this.key,
    });
    // id
    this.id = formBuilder.control(null, [
      Validators.required,
      Validators.maxLength(300),
    ]);
    this.idForm = formBuilder.group({
      id: this.id,
    });
  }

  public ngOnInit(): void {
    // pre-select a unique key
    if (this.keys.length === 1) {
      this.key.setValue(this.keys[0]);
      this.key.markAsDirty();
      this.key.updateValueAndValidity();
    }
  }

  public onItemChange(item: unknown): void {
    const info: LookupInfo = {
      pin: item as DataPinInfo,
    };
    // lookup item and its metadata part if any
    forkJoin({
      item: item
        ? this._itemService.getItem((item as DataPinInfo).itemId, false, true)
        : of(null),
      part: item
        ? this._itemService.getPartFromTypeAndRole(
            (item as DataPinInfo).itemId,
            METADATA_PART_ID,
            undefined,
            true
          )
        : of(null),
    })
      .pipe(take(1))
      .subscribe({
        next: (result) => {
          if (result.item) {
            info.item = result.item;
            info.part = result.part as MetadataPart;
            this.info = info;
          }
        },
        error: (error) => {
          console.error(
            error ? JSON.stringify(error) : 'Error loading item/metadata'
          );
        },
      });
  }

  public appendIdComponent(type: string, metaIndex = -1): void {
    let id = this.id.value || '';

    switch (type) {
      case 'pin':
        id += this.info?.pin.value;
        break;
      case 'itemId':
        id += this.info!.item?.id || '';
        break;
      case 'partId':
        id += this.info!.part?.id || '';
        break;
      case 'partTypeId':
        id += this.info!.part?.typeId || '';
        break;
      case 'partRoleId':
        id += this.info!.part?.roleId || '';
        break;
      case 'metadata':
        id += this.info!.part!.metadata[metaIndex].value;
        break;
    }

    this.id.setValue(id);
    this.id.markAsDirty();
    this.id.updateValueAndValidity();
  }

  public pickId(): void {
    if (this.idForm.invalid) {
      return;
    }
    this.idPick.emit(this.id.value!);
    this.info = undefined;
  }

  public resetId(): void {
    this.id.reset();
    this.id.markAsDirty();
    this.id.updateValueAndValidity();
  }
}
