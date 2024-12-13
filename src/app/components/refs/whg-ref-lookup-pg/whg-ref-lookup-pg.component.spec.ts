import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WhgRefLookupPgComponent } from './whg-ref-lookup-pg.component';

describe('WhgRefLookupPgComponent', () => {
  let component: WhgRefLookupPgComponent;
  let fixture: ComponentFixture<WhgRefLookupPgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhgRefLookupPgComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WhgRefLookupPgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
