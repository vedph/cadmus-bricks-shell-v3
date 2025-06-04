import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// material
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

// bricks
import { DocReferencesComponent } from '@myrmidon/cadmus-refs-doc-references';

import { AssertionComponent } from './assertion.component';

describe('AssertionComponent', () => {
  let component: AssertionComponent;
  let fixture: ComponentFixture<AssertionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // component under test
        AssertionComponent,
        FormsModule,
        ReactiveFormsModule,
        NoopAnimationsModule,
        // material
        MatBadgeModule,
        MatButtonModule,
        MatExpansionModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        // bricks
        DocReferencesComponent,
      ],
      providers: [FormBuilder],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssertionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
