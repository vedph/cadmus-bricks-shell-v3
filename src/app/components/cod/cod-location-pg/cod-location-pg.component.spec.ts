import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodLocationPgComponent } from './cod-location-pg.component';

describe('CodLocationPgComponent', () => {
  let component: CodLocationPgComponent;
  let fixture: ComponentFixture<CodLocationPgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodLocationPgComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodLocationPgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
