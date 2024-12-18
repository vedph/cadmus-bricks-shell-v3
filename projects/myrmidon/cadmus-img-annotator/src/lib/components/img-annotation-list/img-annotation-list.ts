import { BehaviorSubject, Observable, take } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';

import { ImageAnnotator, ImageAnnotation } from '@annotorious/annotorious';

import { GalleryImage } from '../../directives/img-annotator.directive';

/**
 * An annotation included in a list. Each annotation is paired
 * with custom payload data, edited in a dialog using as content
 * the component specified by editorComponent.
 */
export interface ListAnnotation<T> {
  id: string;
  image: GalleryImage;
  value: ImageAnnotation;
  payload?: T;
}

/**
 * A list of image annotations. This list empowers an image annotations list
 * component by maintaining a list of annotation/payload pairs for each
 * annotation, where the payload type is defined by T.
 * This list requires an instance of Annotorious annotator, and the type
 * of the editor component to use for editing each annotation. It will
 * then use the annotator to keep in synch with Annotorious, and a dialog
 * wrapper to edit each annotation via the provided editor.
 * Consumers should thus provide an annotation editor and a corresponding
 * dialog component wrapper, which wires the annotation to the editor.
 */
export class ImgAnnotationList<T> {
  private _annotations$: BehaviorSubject<ListAnnotation<T>[]>;
  private _selectedAnnotation$: BehaviorSubject<ListAnnotation<T> | null>;

  /**
   * The annotations in this list.
   */
  public get annotations$(): Observable<ListAnnotation<T>[]> {
    return this._annotations$.asObservable();
  }

  /**
   * The selected annotation, if any.
   */
  public get selectedAnnotation$(): Observable<ListAnnotation<T> | null> {
    return this._selectedAnnotation$.asObservable();
  }

  /**
   * The function used to build a string from a list annotation object,
   * summarizing its content appropriately.
   */
  public annotationToString: (annotation: ListAnnotation<T>) => string | null =
    (a: ListAnnotation<T>) => {
      return a.value.bodies.length ? a.value.bodies[0].value || null : a.id;
    };

  /**
   * The image to be annotated.
   */
  public image?: GalleryImage;

  constructor(
    public annotator: ImageAnnotator,
    public editorComponent: any,
    public dialog: MatDialog,
    public dlgConfig: MatDialogConfig
  ) {
    this._annotations$ = new BehaviorSubject<ListAnnotation<T>[]>([]);
    this._selectedAnnotation$ = new BehaviorSubject<ListAnnotation<T> | null>(
      null
    );
  }

  /**
   * Gets the annotations.
   * @returns The annotations in this list.
   */
  public getAnnotations(): ListAnnotation<T>[] {
    return this._annotations$.value;
  }

  /**
   * Removes all the annotations.
   */
  public clearAnnotations(): void {
    this._annotations$.next([]);
    this.annotator.clearAnnotations();
  }

  /**
   * Set the annotations.
   * @param annotations The annotations to set.
   */
  public setAnnotations(annotations: ListAnnotation<T>[]): void {
    this._annotations$.next(annotations);
    this.annotator.setAnnotations(annotations.map((a) => a.value));
  }

  /**
   * Delete the annotation with the specified ID.
   * @param id The annotation id.
   */
  public removeAnnotation(id: string): void {
    // if annotation is selected, deselect it
    if (this._selectedAnnotation$.value?.id === id) {
      this.deselectAnnotation();
    }
    // delete from annotorious
    this.annotator.removeAnnotation(id);
    // delete from local
    this._annotations$.next([
      ...this._annotations$.value.filter((a) => a.id !== id),
    ]);
  }

  /**
   * Edit the selected annotation in the editor dialog.
   * @param isNew True if the annotation is new.
   * @returns True if the annotation was saved, false if it was deleted.
   * An annotation is deleted if it was new and the dialog was canceled.
   */
  public editSelectedAnnotation(isNew?: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (!this._selectedAnnotation$.value) {
        resolve(false);
      } else {
        // get payload
        const payload = this._annotations$.value.find(
          (a) => a.id === this._selectedAnnotation$.value?.id
        )?.payload;

        // edit in dialog
        const dialogRef = this.dialog.open(this.editorComponent, {
          ...this.dlgConfig,
          data: {
            id: this._selectedAnnotation$.value.id,
            value: this._selectedAnnotation$.value.value,
            payload,
          },
        });
        dialogRef
          .afterClosed()
          .pipe(take(1))
          .subscribe((annotation: ListAnnotation<any>) => {
            // on OK, save the annotation
            if (annotation) {
              this.saveAnnotation(annotation, isNew);
              resolve(true);
            } else {
              // else delete it if new
              if (isNew) {
                this.removeAnnotation(this._selectedAnnotation$.value!.id);
                resolve(false);
              }
              resolve(true);
            }
          });
      }
    });
  }

  /**
   * Deselect the selected annotation if any.
   */
  private deselectAnnotation(): void {
    if (!this._selectedAnnotation$.value) {
      return;
    }
    this.annotator.cancelSelected();
    this._selectedAnnotation$.next(null);
  }

  /**
   * Save the specified list annotation.
   * @param annotation The annotation.
   * @param isNew True if the annotation is new.
   */
  private saveAnnotation(
    annotation: ListAnnotation<any>,
    isNew?: boolean
  ): void {
    // update in annotorious unless it's new
    if (!isNew) {
      this.annotator.updateAnnotation(annotation.value);
    }

    // update or add in local
    if (annotation.id) {
      const annotations = [...this._annotations$.value];
      const index = annotations.findIndex((a) => a.id === annotation.id);
      if (index > -1) {
        annotations.splice(index, 1, annotation);
        this._annotations$.next(annotations);
      } else {
        this._annotations$.next([...annotations, annotation]);
      }
    }
  }

  private generateGUID(): string {
    function s4(): string {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return (
      s4() +
      s4() +
      '-' +
      s4() +
      '-' +
      s4() +
      '-' +
      s4() +
      '-' +
      s4() +
      s4() +
      s4()
    );
  }

  /**
   * Edit the annotation at the specified index.
   * @param index The annotation index.
   */
  public editAnnotation(index: number): void {
    this._selectedAnnotation$.next(this._annotations$.value[index]);
    this.editSelectedAnnotation();
  }

  /**
   * Select the specified annotation.
   * @param annotation The annotation to select or undefined or null
   * to deselect.
   */
  public selectAnnotation(annotation?: ListAnnotation<T>): void {
    if (!annotation) {
      this.deselectAnnotation();
    } else {
      this._selectedAnnotation$.next(annotation);
      this.annotator.setSelected(annotation.id);
    }
  }

  /**
   * Select the annotation at the specified index.
   * @param index The annotation index.
   */
  public selectAnnotationAt(index: number): void {
    if (index === -1) {
      this.deselectAnnotation();
    } else {
      this._selectedAnnotation$.next(this._annotations$.value[index]);
      this.annotator.setSelected(this._selectedAnnotation$.value!.id);
    }
  }

  /**
   * Remove the annotation at the specified index.
   * @param index The annotation index.
   */
  public removeAnnotationAt(index: number): void {
    const annotation = this._annotations$.value[index];

    // deselect annotation before deleting it
    if (this._selectedAnnotation$.value?.id === annotation.id) {
      this.deselectAnnotation();
    }

    // remove from annotorious
    this.annotator.removeAnnotation(annotation.id);
    // remove from local
    const annotations = [...this._annotations$.value];
    annotations.splice(index, 1);
    this._annotations$.next(annotations);
  }

  /**
   * Handle the Annotorious create event.
   * @param event The event.
   */
  public async onCreateAnnotation(annotation: ImageAnnotation) {
    console.log('onCreateAnnotation');

    await this.editSelectedAnnotation(true);
  }

  /**
   * Handle the Annotorious select event.
   * @param annotation The annotation or undefined for no
   * selection.
   */
  public onSelectionChange(annotation?: ImageAnnotation) {
    console.log('onSelectionChange');
    // if no annotation, deselect
    if (!annotation) {
      this.deselectAnnotation();
    } else {
      // if annotation, select it in the list
      this._selectedAnnotation$.next(
        this._annotations$.value.find((a) => a.id === annotation.id) || null
      );
    }
  }

  /**
   * Handle the Annotorious delete event.
   * @param event The event.
   */
  public onDeleteAnnotation(annotation: ImageAnnotation) {
    console.log('onDeleteAnnotation');
    // remove from local
    const annotations = [...this._annotations$.value];
    const i = annotations.findIndex((a) => a.id === annotation.id);
    if (i > -1) {
      annotations.splice(i, 1);
      this._annotations$.next(annotations);
    }
  }
}
