import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlagSetComponent } from './flag-set.component';

describe('FlagSetComponent', () => {
  let component: FlagSetComponent;
  let fixture: ComponentFixture<FlagSetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlagSetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlagSetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
