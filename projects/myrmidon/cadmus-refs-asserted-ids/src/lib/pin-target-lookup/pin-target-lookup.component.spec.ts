import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';

// material
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

// cadmus
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { IndexLookupDefinitions } from '@myrmidon/cadmus-core';

// local
import { PinTargetLookupComponent } from './pin-target-lookup.component';
import { ItemRefLookupService } from '../services/item-ref-lookup.service';
import { PinRefLookupService } from '../services/pin-ref-lookup.service';

const INDEX_LOOKUP_DEFINITIONS: IndexLookupDefinitions = {
  item_eid: {
    typeId: 'it.vedph.metadata',
    name: 'eid',
  },
  alias_eid: {
    typeId: 'it.vedph.metadata',
    name: 'eid',
  },
};

describe('PinTargetLookupComponent', () => {
  let component: PinTargetLookupComponent;
  let fixture: ComponentFixture<PinTargetLookupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ClipboardModule,
        MatButtonModule,
        MatCheckboxModule,
        MatExpansionModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        MatTooltipModule,
        MatSnackBarModule,
        // component under test
        PinTargetLookupComponent,
      ],
      providers: [
        {
          provide: 'indexLookupDefinitions',
          useValue: INDEX_LOOKUP_DEFINITIONS,
        },
        ItemRefLookupService,
        PinRefLookupService,
        ItemService,
        ThesaurusService,
        MatSnackBar,
        FormBuilder,
        provideHttpClient(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PinTargetLookupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
