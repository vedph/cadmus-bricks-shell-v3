import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZoteroRefLookupPgComponent } from './zotero-ref-lookup-pg.component';

describe('ZoteroRefLookupPg', () => {
  let component: ZoteroRefLookupPgComponent;
  let fixture: ComponentFixture<ZoteroRefLookupPgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZoteroRefLookupPgComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ZoteroRefLookupPgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
