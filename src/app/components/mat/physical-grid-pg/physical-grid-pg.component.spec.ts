import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhysicalGridPgComponent } from './physical-grid-pg.component';

describe('PhysicalGridPgComponent', () => {
  let component: PhysicalGridPgComponent;
  let fixture: ComponentFixture<PhysicalGridPgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhysicalGridPgComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhysicalGridPgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
