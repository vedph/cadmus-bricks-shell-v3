import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MufiRefLookupPgComponent } from './mufi-ref-lookup-pg.component';
import { RefLookupComponent } from '@myrmidon/cadmus-refs-lookup';

describe('MufiRefLookupPgComponent', () => {
  let component: MufiRefLookupPgComponent;
  let fixture: ComponentFixture<MufiRefLookupPgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MufiRefLookupPgComponent, RefLookupComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MufiRefLookupPgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
