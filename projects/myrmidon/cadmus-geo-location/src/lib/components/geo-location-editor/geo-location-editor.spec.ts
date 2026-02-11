import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeoLocationEditor } from './geo-location-editor';

describe('GeoLocationEditor', () => {
  let component: GeoLocationEditor;
  let fixture: ComponentFixture<GeoLocationEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeoLocationEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeoLocationEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
