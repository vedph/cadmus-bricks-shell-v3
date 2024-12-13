import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhysicalStateComponent } from './physical-state.component';

describe('PhysicalStateComponent', () => {
  let component: PhysicalStateComponent;
  let fixture: ComponentFixture<PhysicalStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhysicalStateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhysicalStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
