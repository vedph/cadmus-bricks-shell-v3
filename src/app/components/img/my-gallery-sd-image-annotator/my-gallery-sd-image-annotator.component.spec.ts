import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyGallerySdImageAnnotatorComponent } from './my-gallery-sd-image-annotator.component';

describe('MyGallerySdImageAnnotatorComponent', () => {
  let component: MyGallerySdImageAnnotatorComponent;
  let fixture: ComponentFixture<MyGallerySdImageAnnotatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyGallerySdImageAnnotatorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MyGallerySdImageAnnotatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
