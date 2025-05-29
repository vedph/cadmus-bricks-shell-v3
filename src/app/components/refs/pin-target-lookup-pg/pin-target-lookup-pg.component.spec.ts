import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PinTargetLookupPgComponent } from './pin-target-lookup-pg.component';

describe('PinTargetLookupPgComponent', () => {
  let component: PinTargetLookupPgComponent;
  let fixture: ComponentFixture<PinTargetLookupPgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PinTargetLookupPgComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PinTargetLookupPgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
