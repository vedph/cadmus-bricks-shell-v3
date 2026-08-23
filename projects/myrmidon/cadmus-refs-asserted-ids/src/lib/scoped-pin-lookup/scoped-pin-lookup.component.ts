import { Component, Inject, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { forkJoin, of, take } from 'rxjs';

// material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

// bricks
import {
  LookupProviderOptions,
  RefLookupComponent,
} from '@myrmidon/cadmus-refs-lookup';

// cadmus
import { ItemService } from '@myrmidon/cadmus-api';
import {
  DataPinInfo,
  IndexLookupDefinitions,
  Item,
  Part,
} from '@myrmidon/cadmus-core';

// local
import { PinRefLookupService } from '../services/pin-ref-lookup.service';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    // material
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    // bricks
    RefLookupComponent,
  ],
})
export class ScopedPinLookupComponent {
  // lookup
  private readonly _keyDraft = signal<{ key: string | null }>({ key: null });
  public readonly keyForm = form(this._keyDraft);

  public readonly keys = signal<string[]>([]);
  public readonly info = signal<LookupInfo | undefined>(undefined);

  // builder
  private readonly _idDraft = signal<{ id: string }>({ id: '' });
  public readonly idForm = form(this._idDraft, (path) => {
    required(path.id);
    maxLength(path.id, 300);
  });

  /**
   * Emitted whenever the user picks an ID.
   */
  public readonly idPick = output<string>();

  /**
   * Optional preset options for lookup providers.
   * Maps provider IDs to their available scopes.
   */
  public readonly lookupProviderOptions = input<LookupProviderOptions>();

  constructor(
    private _itemService: ItemService,
    public lookupService: PinRefLookupService,
    @Inject('indexLookupDefinitions')
    public lookupDefs: IndexLookupDefinitions
  ) {
    // lookup
    // keys are all the defined lookup searches
    this.keys.set(Object.keys(lookupDefs));
    // pre-select a unique key
    if (this.keys().length === 1) {
      this._keyDraft.set({ key: this.keys()[0] });
      this.keyForm.key().markAsDirty();
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
            this.info.set(info);
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
    let id = this._idDraft().id || '';

    switch (type) {
      case 'pin':
        id += this.info()?.pin.value;
        break;
      case 'itemId':
        id += this.info()?.item?.id || '';
        break;
      case 'partId':
        id += this.info()?.part?.id || '';
        break;
      case 'partTypeId':
        id += this.info()?.part?.typeId || '';
        break;
      case 'partRoleId':
        id += this.info()?.part?.roleId || '';
        break;
      case 'metadata':
        id += this.info()?.part?.metadata[metaIndex].value;
        break;
    }

    this._idDraft.set({ id });
    this.idForm.id().markAsDirty();
  }

  public pickId(): void {
    if (this.idForm().invalid()) {
      return;
    }
    this.idPick.emit(this._idDraft().id);
    this.info.set(undefined);
  }

  public resetId(): void {
    this._idDraft.set({ id: '' });
    this.idForm.id().markAsDirty();
  }
}
