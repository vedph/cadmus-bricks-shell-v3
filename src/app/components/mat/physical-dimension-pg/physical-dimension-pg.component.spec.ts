import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhysicalDimensionPg } from './physical-dimension-pg';

describe('PhysicalDimensionPg', () => {
  let component: PhysicalDimensionPg;
  let fixture: ComponentFixture<PhysicalDimensionPg>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhysicalDimensionPg]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhysicalDimensionPg);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
