import {
  Directive,
  NgZone,
  ElementRef,
  AfterViewInit,
  input,
  effect,
  model,
  output,
} from '@angular/core';
import {
  Annotation,
  AnnotationEvent,
  AnnotoriousConfig,
} from '@myrmidon/cadmus-img-annotator';
// @ts-ignore
// import { OSDAnnotorious } from '@recogito/annotorious-openseadragon';
// import * as OSDAnnotorious from '@recogito/annotorious-openseadragon';
// https://stackblitz.com/edit/angular-cjt1hw?file=src%2Fapp%2Fapp.component.ts
// import OpenSeadragon from 'openseadragon';
import OSDAnnotorious from '@recogito/annotorious-openseadragon';
import { Viewer } from 'openseadragon';
// @ts-ignore
import SelectorPack from '@recogito/annotorious-selector-pack';

@Directive({
  standalone: true,
  selector: '[cadmusSdImgAnnotator]',
})
export class SdImgAnnotatorDirective implements AfterViewInit {
  private _ann?: any;

  /**
   * The source image to annotate.
   * TODO: implement refresh logic in setter.
   */
  public readonly source = input<string>('');

  /**
   * The initial configuration for the annotator. Note that the image property
   * will be overridden with the img being decorated by this directive.
   */
  public readonly config = input<AnnotoriousConfig>();

  /**
   * Disables the editor thus toggling the headless mode.
   */
  public readonly disableEditor = input<boolean>(true);

  /**
   * The current drawing tool. The default available tools are rect and polygon,
   * but more can be available from plugins.
   */
  public readonly tool = input<string>('rect');

  /**
   * The optional initial annotations to show on the image.
   */
  public readonly annotations = input<any[]>([]);

  /**
   * The selected annotation or its ID. When set, the annotator
   * will highlight the annotation and open its editor.
   */
  public selectedAnnotation = input<any>();

  /**
   * The IDs of all the additional selection tools to be used
   * when the Annotorious Selector Pack plugin is loaded
   * (see https://github.com/recogito/annotorious-selector-pack).
   * Allowed values (besides 'rect', 'polygon'): 'point', 'circle',
   * 'ellipse', 'freehand'. Note that this requires to add the
   * plugins library to your app (@recogito/annotorious-selector-pack).
   */
  public readonly additionalTools = input<string[]>();

  /**
   * Fired when the annotator has been initialized. This is a way
   * for passing the annotator itself to the parent component.
   * The annotator is required in headless mode, so that your code
   * can replace the current selection by modifying the received
   * selection and calling annotator.updateSelected(selection, true).
   */
  public readonly annotatorInit = output<any>();

  /**
   * Fired when the user has canceled a selection, by hitting Cancel in
   * the editor, or by clicking or tapping outside the selected annotation
   * shape.
   */
  public readonly cancelSelected = output<Annotation>();

  /**
   * Fired when the shape of a newly created selection, or of a selected
   * annotation is moved or resized. The argument is the annotation target.
   */
  public readonly changeSelectionTarget = output<any>();

  /**
   * Fired every time the user clicks an annotation (regardless of whether
   * it is already selected or not).
   */
  public readonly clickAnnotation = output<AnnotationEvent>();

  /**
   * Emitted when a new annotation is created.
   */
  public readonly createAnnotation = output<AnnotationEvent>();

  /**
   * Fires when the user has created a new selection (headless mode).
   * The handler should modify the selected annotation and call
   * updateSelected (which is an async function returning a Promise)
   * to replace it.
   */
  public readonly createSelection = output<Annotation>();

  /**
   * Emitted when an annotation is deleted.
   */
  public readonly deleteAnnotation = output<AnnotationEvent>();

  /**
   * Emitted when mouse enters an annotation.
   */
  public readonly mouseEnterAnnotation = output<AnnotationEvent>();

  /**
   * Emitted when mouse exits an annotation.
   */
  public readonly mouseLeaveAnnotation = output<AnnotationEvent>();

  /**
   * Fires when the user selects an existing annotation (headless mode).
   * The user can then move or delete the annotation; the corresponding
   * events will be fired (after moving, the updateAnnotation event when
   * the user clicks outside the shape, or draws another one; after
   * deleting, the deleteAnnotation event).
   */
  public readonly selectAnnotation = output<Annotation>();

  /**
   * Emitted when an annotation is updated.
   */
  public readonly updateAnnotation = output<AnnotationEvent>();

  constructor(private _ngZone: NgZone, private el: ElementRef) {
    // when source changes, reinit annotator
    effect(() => {
      console.log(this.source());
      this._ann?.destroy();
      this.initAnnotator();
    });

    // when disabledEditor changes, disable annotator
    effect(() => {
      // https://annotorious.github.io/guides/headless-mode/
      this._ann.disableEditor = this.disableEditor();
    });

    // when tool changes, update annotator
    effect(() => {
      this._ann?.setDrawingTool(this.tool());
    });

    // when annotations change, update the annotator
    effect(() => {
      const annotations = this.annotations();
      if (!annotations?.length) {
        this._ann?.clearAnnotations();
      } else {
        this._ann?.setAnnotations(annotations);
      }
    });

    // when selected annotation changes, select it in the annotator
    effect(() => {
      this._ann?.selectAnnotation(this.selectedAnnotation());
    });
  }

  private initAnnotator(): void {
    const cfg = this.config || { disableEditor: true, disableSelect: false }; //@@
    // here we use a single image source from the target img @src:
    //   http://openseadragon.github.io/examples/tilesource-image/
    // we also have better running outside Angular zone:
    //   http://openseadragon.github.io/docs/
    const viewer: OpenSeadragon.Viewer = this._ngZone.runOutsideAngular(() => {
      return new Viewer({
        element: this.el.nativeElement,
        tileSources: {
          type: 'image',
          url: this.source(),
        },
        showZoomControl: false,
        showHomeControl: false,
        showFullPageControl: false,
        showRotationControl: false,
        showFlipControl: false,
        // prefixUrl: 'http://openseadragon.github.io/openseadragon/images/',
      });
    });

    this._ann = OSDAnnotorious(viewer, cfg);

    // plugin
    if (this.additionalTools?.length) {
      SelectorPack(this._ann, {
        tools: this.additionalTools,
      });
    }

    // initial annotations
    if (this.annotations?.length) {
      this._ann.setAnnotations(this.annotations);
    }

    // wrap events:
    // createSelection
    this._ann.on('createSelection', (selection: Annotation) => {
      console.log('ann-createSelection');
      this.createSelection.emit(selection);
    });
    // selectAnnotation
    this._ann.on('selectAnnotation', (selection: Annotation) => {
      this.selectAnnotation.emit(selection);
    });
    // cancelSelected
    this._ann.on('cancelSelected', (selection: Annotation) => {
      this.cancelSelected.emit(selection);
    });

    // createAnnotation
    this._ann.on(
      'createAnnotation',
      (annotation: any, overrideId: (id: any) => void) => {
        console.log('ann-createAnnotation');
        this.createAnnotation.emit({
          annotation,
          overrideId,
        });
      }
    );
    // updateAnnotation
    this._ann.on('updateAnnotation', (annotation: any, previous: any) => {
      this.updateAnnotation.emit({ annotation, prevAnnotation: previous });
    });
    // deleteAnnotation
    this._ann.on('deleteAnnotation', (annotation: any) => {
      this.deleteAnnotation.emit({ annotation });
    });
    // mouse
    this._ann.on(
      'mouseEnterAnnotation',
      (annotation: any, element: HTMLElement) => {
        this.mouseEnterAnnotation.emit({ annotation });
      }
    );
    this._ann.on(
      'mouseLeaveAnnotation',
      (annotation: any, element: HTMLElement) => {
        this.mouseLeaveAnnotation.emit({ annotation });
      }
    );

    // default drawing tool
    if (this.tool() !== 'rect') {
      this._ann.setDrawingTool(this.tool());
    }

    this.annotatorInit.emit(this._ann);
  }

  public ngAfterViewInit() {
    this.initAnnotator();
  }
}
