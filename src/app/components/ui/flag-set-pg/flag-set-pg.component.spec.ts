import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlagSetPgComponent } from './flag-set-pg.component';

describe('FlagSetPgComponent', () => {
  let component: FlagSetPgComponent;
  let fixture: ComponentFixture<FlagSetPgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlagSetPgComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlagSetPgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
