// import { CommonModule } from '@angular/common';
// import { FormsModule, ReactiveFormsModule } from '@angular/forms';
// import { Component, Inject } from '@angular/core';
// import { take } from 'rxjs';

// import { MatCardModule } from '@angular/material/card';
// import { MatTabsModule } from '@angular/material/tabs';

// import { ThesaurusEntry } from '@myrmidon/cadmus-core';

// import {
//   GalleryImageAnnotation,
//   GalleryOptionsService,
//   GalleryService,
//   IMAGE_GALLERY_SERVICE_KEY,
// } from '../../../../../projects/myrmidon/cadmus-img-gallery/src/public-api';
// import { GalleryImage } from '../../../../../projects/myrmidon/cadmus-img-annotator/src/public-api';
// import { MyGallerySdImageAnnotatorComponent } from '../my-gallery-sd-image-annotator/my-gallery-sd-image-annotator.component';

// @Component({
//   selector: 'app-sd-img-gallery-pg',
//   templateUrl: './sd-img-gallery-pg.component.html',
//   styleUrls: ['./sd-img-gallery-pg.component.css'],
//   imports: [
//     CommonModule,
//     FormsModule,
//     ReactiveFormsModule,
//     MatCardModule,
//     MatTabsModule,
//     MyGallerySdImageAnnotatorComponent,
//   ],
// })
// export class SdImgGalleryPgComponent {
//   public entries: ThesaurusEntry[];
//   public image?: GalleryImage;
//   public tabIndex: number;

//   public annotations?: GalleryImageAnnotation[];

//   constructor(
//     @Inject(IMAGE_GALLERY_SERVICE_KEY)
//     private _galleryService: GalleryService,
//     private _options: GalleryOptionsService
//   ) {
//     this.tabIndex = 0;
//     this.entries = [
//       {
//         id: 'title',
//         value: 'title',
//       },
//       {
//         id: 'dsc',
//         value: 'description',
//       },
//     ];
//   }

//   public onImagePick(image: GalleryImage): void {
//     // get the single image as we need the "full" size
//     const options = { ...this._options, width: 600, height: 800 };

//     this._galleryService
//       .getImage(image.id, this._options.get())
//       .pipe(take(1))
//       .subscribe((image) => {
//         this.image = image!;
//       });
//     this.tabIndex = 1;
//   }

//   public onAnnotationsChange(annotations: GalleryImageAnnotation[]): void {
//     this.annotations = annotations;
//   }
// }
