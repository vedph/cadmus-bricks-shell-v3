import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlagSetBadgeComponent } from './flag-set-badge.component';

describe('FlagSetBadgeComponent', () => {
  let component: FlagSetBadgeComponent;
  let fixture: ComponentFixture<FlagSetBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlagSetBadgeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlagSetBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
