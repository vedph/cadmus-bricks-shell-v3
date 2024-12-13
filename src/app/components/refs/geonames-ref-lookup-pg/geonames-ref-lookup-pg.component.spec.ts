import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeonamesRefLookupPgComponent } from './geonames-ref-lookup-pg.component';

describe('GeonamesRefLookupPgComponent', () => {
  let component: GeonamesRefLookupPgComponent;
  let fixture: ComponentFixture<GeonamesRefLookupPgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeonamesRefLookupPgComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GeonamesRefLookupPgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
