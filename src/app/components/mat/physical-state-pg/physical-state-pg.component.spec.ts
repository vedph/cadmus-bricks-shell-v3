import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhysicalStatePgComponent } from './physical-state-pg.component';

describe('PhysicalStatePgComponent', () => {
  let component: PhysicalStatePgComponent;
  let fixture: ComponentFixture<PhysicalStatePgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhysicalStatePgComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhysicalStatePgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
