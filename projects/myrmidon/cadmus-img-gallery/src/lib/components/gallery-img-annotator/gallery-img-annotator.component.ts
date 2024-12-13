import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  Component,
  effect,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { JoinPipe } from '@myrmidon/ngx-tools';
import {
  AnnotationEvent,
  GalleryImage,
  ImgAnnotatorDirective,
} from '@myrmidon/cadmus-img-annotator';
import {
  BarCustomAction,
  BarCustomActionRequest,
  CustomActionBarComponent,
} from '@myrmidon/cadmus-ui-custom-action-bar';

/**
 * Essential metadata mostly extracted from the W3C annotation produced
 * by Annotorious.
 */
export interface GalleryImageAnnotation {
  id: string;
  target: GalleryImage;
  selector: string;
  notes?: string[];
  tags?: string[];
}

/**
 * The data for the gallery image annotator.
 */
interface GalleryImgAnnotatorData {
  image?: GalleryImage;
  annotations: GalleryImageAnnotation[];
}

/**
 * Gallery's image annotator. This provides annotation to a selected
 * gallery image. Input properties are the image and its optional
 * annotations; an output event is fired whenever annotations are
 * changed.
 */
@Component({
  selector: 'cadmus-gallery-img-annotator',
  templateUrl: './gallery-img-annotator.component.html',
  styleUrls: ['./gallery-img-annotator.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTooltipModule,
    // myrmidon
    JoinPipe,
    CustomActionBarComponent,
    ImgAnnotatorDirective,
  ],
})
export class GalleryImgAnnotatorComponent implements OnInit, OnDestroy {
  private _frozen?: boolean;
  private _sub?: Subscription;
  private _data$: BehaviorSubject<GalleryImgAnnotatorData>;

  /**
   * The W3C annotations come from the annotator and are kept in synch
   * with annotations, so that we can interact with visuals.
   */
  public w3cAnnotations: any[];
  public selectedW3cAnnotation?: any;

  public imageUri?: string;
  public data$: Observable<GalleryImgAnnotatorData>;

  /**
   * The gallery image to annotate.
   */
  public readonly image = model<GalleryImage>();

  /**
   * The annotations being edited.
   */
  public readonly annotations = input<GalleryImageAnnotation[]>([]);

  /**
   * Custom actions on annotations.
   */
  public readonly customActions = input<BarCustomAction[]>();

  /**
   * Emitted whenever annotations change.
   */
  public readonly annotationsChange = output<GalleryImageAnnotation[]>();

  /**
   * Emitted when user requests a custom action on an annotation.
   */
  public readonly actionRequest = output<BarCustomActionRequest>();

  constructor() {
    this.w3cAnnotations = [];
    this._data$ = new BehaviorSubject<GalleryImgAnnotatorData>({
      annotations: [],
    });
    this.data$ = this._data$.asObservable();

    // when image changes, update annotations
    effect(() => {
      const image = this.image();
      // preserve existing annotations, unless they belong to a previously
      // loaded different image
      let annotations = this._data$.value.annotations;
      if (image) {
        if (annotations?.length && annotations[0].id !== image.id) {
          annotations = [];
        }
      }
      this._data$.next({
        image: image || undefined,
        annotations: annotations,
      });
    });

    // when annotations change, update stream
    effect(() => {
      this._data$.next({
        // preserve existing image
        image: this._data$.value.image,
        annotations: this.annotations(),
      });
    });
  }

  private eventToAnnotation(event: AnnotationEvent): GalleryImageAnnotation {
    return {
      id: event.annotation.id!,
      target: this._data$.value.image!,
      selector: event.annotation.target.selector.value,
      notes: event.annotation.body
        ?.filter((e) => e.purpose === 'commenting')
        .map((e) => e.value),
      tags: event.annotation.body
        ?.filter((e) => e.purpose === 'tagging')
        .map((e) => e.value),
    };
  }

  private annotationsToW3C(annotations: GalleryImageAnnotation[]): any[] {
    if (!annotations.length) {
      return [];
    }
    const results: any[] = [];

    for (let i = 0; i < annotations.length; i++) {
      const a = annotations[i];
      const r: any = { id: a.id };
      r['@context'] = 'http://www.w3.org/ns/anno.jsonld';
      r.type = 'Annotation';
      r.target = {
        source: a.target.uri,
        selector: {
          type: 'FragmentSelector',
          conformsTo: 'http://www.w3.org/TR/media-frags/',
          value: a.selector,
        },
      };
      if (a.notes?.length || a.tags?.length) {
        r.body = [];
        if (a.notes?.length) {
          for (let j = 0; j < a.notes.length; j++) {
            r.body.push({
              type: 'TextualBody',
              purpose: 'commenting',
              value: a.notes[j],
            });
          }
        }
        if (a.tags?.length) {
          for (let j = 0; j < a.tags.length; j++) {
            r.body.push({
              type: 'TextualBody',
              purpose: 'tagging',
              value: a.tags[j],
            });
          }
        }
      }
      results.push(r);
    }
    return results;
  }

  public ngOnInit(): void {
    // whenever data change, update the image URI and its W3C annotations
    this._sub = this._data$.subscribe((d) => {
      if (!this._frozen) {
        this.imageUri = d.image?.uri;
        this.w3cAnnotations = this.annotationsToW3C(d.annotations);
      }
    });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public onCreateAnnotation(event: AnnotationEvent) {
    // append the newly created W3C annotation
    this.w3cAnnotations = [...this.w3cAnnotations, event.annotation];

    // append the annotation
    const annotations = [...this._data$.value.annotations];
    annotations.push(this.eventToAnnotation(event));
    this._frozen = true;
    this._data$.next({
      image: this._data$.value.image,
      annotations: annotations,
    });
    this._frozen = false;

    // fire event
    this.annotationsChange.emit(annotations);
  }

  public onUpdateAnnotation(event: AnnotationEvent) {
    // replace the old W3C annotation with the new one
    const i = this.annotations().findIndex((a) => a.id === event.annotation.id);
    if (i > -1) {
      const w3cAnnotations = [...this.w3cAnnotations];
      w3cAnnotations.splice(i, 1, event.annotation);
      this.w3cAnnotations = w3cAnnotations;

      // replace the annotation
      const annotations = [...this._data$.value.annotations];
      annotations.splice(i, 1, this.eventToAnnotation(event));
      this._frozen = true;
      this._data$.next({
        image: this._data$.value.image,
        annotations: annotations,
      });
      this._frozen = false;

      // fire event
      this.annotationsChange.emit(annotations);
    }
  }

  public onDeleteAnnotation(event: AnnotationEvent) {
    // delete the W3C annotation
    const i = this._data$.value.annotations.findIndex(
      (a) => a.id === event.annotation.id
    );
    if (i === -1) {
      return;
    }
    const w3cAnnotations = [...this.w3cAnnotations];
    w3cAnnotations.splice(i, 1);
    this.w3cAnnotations = w3cAnnotations;

    // delete the annotation
    const annotations = [...this._data$.value.annotations];
    annotations.splice(i, 1);
    this._frozen = true;
    this._data$.next({
      image: this._data$.value.image,
      annotations: annotations,
    });
    this._frozen = false;

    // fire event
    this.annotationsChange.emit(annotations);
  }

  public selectAnnotation(index: number): void {
    this.selectedW3cAnnotation = this.w3cAnnotations[index];
  }

  public onActionRequest(event: BarCustomActionRequest) {
    this.actionRequest.emit(event);
  }
}
