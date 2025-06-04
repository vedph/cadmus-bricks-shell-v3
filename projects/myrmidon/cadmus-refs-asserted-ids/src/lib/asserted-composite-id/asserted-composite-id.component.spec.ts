import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// material
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

// myrmidon
import { RamStorageService } from '@myrmidon/ngx-tools';

// bricks
import { AssertionComponent } from '@myrmidon/cadmus-refs-assertion';

// local
import { AssertedCompositeIdComponent } from './asserted-composite-id.component';
import { PinRefLookupService } from '../services/pin-ref-lookup.service';
import { PinTargetLookupComponent } from '../pin-target-lookup/pin-target-lookup.component';

describe('AssertedCompositeIdComponent', () => {
  let component: AssertedCompositeIdComponent;
  let fixture: ComponentFixture<AssertedCompositeIdComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // component under test
        AssertedCompositeIdComponent,
        // exact same imports as the component uses
        ReactiveFormsModule,
        NoopAnimationsModule,
        // material
        MatButtonModule,
        MatExpansionModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        MatTooltipModule,
        // bricks
        AssertionComponent,
        // local
        PinTargetLookupComponent,
      ],
      providers: [
        FormBuilder,
        {
          provide: PinRefLookupService,
          useValue: jasmine.createSpyObj('PinRefLookupService', ['lookup']),
        },
        {
          provide: 'indexLookupDefinitions',
          useValue: {},
        },
        {
          provide: RamStorageService,
          useValue: jasmine.createSpyObj('RamStorageService', ['retrieve']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssertedCompositeIdComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
