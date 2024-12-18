// import {
//   FormBuilder,
//   FormControl,
//   FormGroup,
//   FormsModule,
//   ReactiveFormsModule,
//   Validators,
// } from '@angular/forms';

// import {
//   Component,
//   EventEmitter,
//   Inject,
//   Input,
//   OnDestroy,
//   OnInit,
//   Output,
// } from '@angular/core';
// import { Subscription, take } from 'rxjs';

// import {
//   MAT_DIALOG_DEFAULT_OPTIONS,
//   MatDialog,
//   MatDialogConfig,
// } from '@angular/material/dialog';

// import { MatButtonModule } from '@angular/material/button';
// import { MatCheckboxModule } from '@angular/material/checkbox';
// import { MatFormFieldModule } from '@angular/material/form-field';
// import { MatIconModule } from '@angular/material/icon';
// import { MatInputModule } from '@angular/material/input';
// import { MatTabsModule } from '@angular/material/tabs';

// import { ThesaurusEntry } from '@myrmidon/cadmus-core';

// import {
//   GalleryImage,
//   ImgAnnotationList,
//   ImgAnnotatorToolbarComponent,
//   ListAnnotation,
// } from '../../../../../projects/myrmidon/cadmus-img-annotator/src/public-api';
// import {
//   GalleryListComponent,
//   GalleryOptionsService,
//   GalleryService,
//   IMAGE_GALLERY_SERVICE_KEY,
// } from '../../../../../projects/myrmidon/cadmus-img-gallery/src/public-api';
// import { EditAnnotationDialogComponent } from '../edit-annotation-dialog/edit-annotation-dialog.component';
// import { MyImgAnnotationListComponent } from '../img-annotation-list/my-img-annotation-list.component';
// import { MyAnnotationPayload } from '../my-gallery-image-annotator/my-gallery-image-annotator.component';
// import { SdImgAnnotatorDirective } from '../../../../../projects/myrmidon/cadmus-sdimg-annotator/src/public-api';
// import { ImageAnnotation } from '@annotorious/annotorious';

// @Component({
//   selector: 'app-my-gallery-sd-image-annotator',
//   imports: [
//     FormsModule,
//     ReactiveFormsModule,
//     MatButtonModule,
//     MatCheckboxModule,
//     MatFormFieldModule,
//     MatIconModule,
//     MatInputModule,
//     MatTabsModule,
//     SdImgAnnotatorDirective,
//     ImgAnnotatorToolbarComponent,
//     GalleryListComponent,
//     MyImgAnnotationListComponent,
//   ],
//   templateUrl: './my-gallery-sd-image-annotator.component.html',
//   styleUrl: './my-gallery-sd-image-annotator.component.scss',
// })
// export class MyGallerySdImageAnnotatorComponent implements OnInit, OnDestroy {
//   private _sub?: Subscription;
//   private _image?: GalleryImage;
//   private _list?: ImgAnnotationList<MyAnnotationPayload>;

//   public entries: ThesaurusEntry[];
//   public annotator?: any;
//   public editorComponent = EditAnnotationDialogComponent;
//   public tool: string = 'rect';
//   public tabIndex: number = 0;
//   // dump
//   public json: FormControl<string | null>;
//   public frozen: FormControl<boolean>;
//   public form: FormGroup;

//   /**
//    * The gallery image to annotate.
//    */
//   @Input()
//   public get image(): GalleryImage | undefined | null {
//     return this._image;
//   }
//   public set image(value: GalleryImage | undefined | null) {
//     if (this._image === value) {
//       return;
//     }
//     this._image = value || undefined;
//     // reset annotations if image URI changed
//     if (this._image?.uri !== value?.uri) {
//       this._list?.clearAnnotations();
//     }
//     // switch to image tab
//     setTimeout(() => {
//       this.tabIndex = value ? 0 : 1;
//     });
//   }

//   /**
//    * The annotations being edited.
//    */
//   @Input()
//   public get annotations(): ListAnnotation<MyAnnotationPayload>[] {
//     return this._list?.getAnnotations() || [];
//   }
//   public set annotations(value: ListAnnotation<MyAnnotationPayload>[]) {
//     this._list?.setAnnotations(value);
//   }

//   /**
//    * Emitted whenever annotations change.
//    */
//   @Output()
//   public annotationsChange: EventEmitter<ListAnnotation<MyAnnotationPayload>[]>;

//   constructor(
//     public dialog: MatDialog,
//     @Inject(MAT_DIALOG_DEFAULT_OPTIONS) public dlgConfig: MatDialogConfig,
//     @Inject(IMAGE_GALLERY_SERVICE_KEY)
//     private _galleryService: GalleryService,
//     private _options: GalleryOptionsService,
//     formBuilder: FormBuilder
//   ) {
//     this.annotationsChange = new EventEmitter<
//       ListAnnotation<MyAnnotationPayload>[]
//     >();

//     // mock filter entries
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
//     // form
//     this.json = formBuilder.control(null, Validators.required);
//     this.frozen = formBuilder.control(false, { nonNullable: true });
//     this.form = formBuilder.group({
//       json: this.json,
//       frozen: this.frozen,
//     });
//   }

//   public ngOnInit(): void {
//     if (!this._image) {
//       this.tabIndex = 1;
//     }
//   }

//   public ngOnDestroy(): void {
//     this._sub?.unsubscribe();
//   }

//   public onToolChange(tool: string): void {
//     this.tool = tool;
//   }

//   public onAnnotatorInit(annotator: any) {
//     setTimeout(() => {
//       this.annotator = annotator;
//     });
//   }

//   public onListInit(list: ImgAnnotationList<MyAnnotationPayload>) {
//     this._list = list;

//     // emit annotations whenever they change
//     this._sub?.unsubscribe();
//     this._sub = this._list.annotations$.subscribe((annotations) => {
//       if (this._image) {
//         this.annotationsChange.emit(annotations);
//         if (!this.frozen.value) {
//           this.json.setValue(JSON.stringify(annotations, null, 2));
//         }
//       }
//     });
//   }

//   public setAnnotations(): void {
//     if (this.form.invalid) {
//       return;
//     }
//     const annotations = JSON.parse(this.json.value || '[]');
//     this._list?.setAnnotations(annotations);
//   }

//   public onSelectionChange(annotation: ImageAnnotation) {
//     this._list?.onSelectAnnotation(annotation);
//   }

//   public onCancelSelected(annotation: ImageAnnotation) {
//     this._list?.onCancelSelected(annotation);
//   }

//   public editAnnotation(index: number): void {
//     this._list?.editAnnotation(index);
//   }

//   public selectAnnotation(index: number): void {
//     this._list?.selectAnnotation(index);
//   }

//   public removeAnnotation(index: number): void {
//     this._list?.removeAnnotation(index);
//   }

//   public onCreateAnnotation(event: ImageAnnotation) {
//     this._list?.onCreateAnnotation(event);
//   }

//   public onUpdateAnnotation(event: ImageAnnotation,
//     previous: ImageAnnotation
//   ) {
//     this._list?.onUpdateAnnotation(event, previous);
//   }

//   public onDeleteAnnotation(event: ImageAnnotation) {
//     this._list?.onDeleteAnnotation(event);
//   }

//   public onImagePick(image: GalleryImage): void {
//     // get the single image as we need the "full" size
//     // const options = { ...this._options, width: 600, height: 800 };

//     this._galleryService
//       .getImage(image.id, this._options.get())
//       .pipe(take(1))
//       .subscribe((image) => {
//         this.image = image!;
//       });
//     this.tabIndex = 1;
//   }
// }
