import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { DatationComponent } from './datation.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

describe('DatationEditorComponent', () => {
  let component: DatationComponent;
  let fixture: ComponentFixture<DatationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        ReactiveFormsModule,
        DatationComponent,
      ],
      // https://github.com/angular/components/issues/14668
      providers: [
        {
          useValue: () => new Promise(() => {}),
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DatationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
