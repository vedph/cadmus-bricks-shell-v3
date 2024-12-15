import {
  Directive,
  ElementRef,
  model,
  effect,
  input,
  output,
} from '@angular/core';
// @ts-ignore
import { Annotorious } from '@recogito/annotorious';
// @ts-ignore
import SelectorPack from '@recogito/annotorious-selector-pack';

// https://recogito.github.io/annotorious/api-docs/annotorious

/**
 * Essential metadata for a gallery image to annotate. You can derive
 * your own model from this one.
 */
export interface GalleryImage {
  id: string;
  uri: string;
  title: string;
  description?: string;
}

/**
 * Annotorious formatter function.
 */
export type AnnotoriousFormatter = (
  annotation: any
) => string | HTMLElement | object;

/**
 * Annotorious configuration.
 */
export interface AnnotoriousConfig {
  allowEmpty?: boolean;
  crosshair?: boolean;
  // https://annotorious.github.io/guides/headless-mode
  disableEditor?: boolean;
  disableSelect?: boolean;
  drawOnSingleClick?: boolean;
  formatters?: AnnotoriousFormatter | AnnotoriousFormatter[];
  fragmentUnit?: 'pixel' | 'percent';
  handleRadius?: number;
  image?: HTMLImageElement | string;
  locale?: string;
  messages?: { [key: string]: string };
  readOnly?: boolean;
  widgets?: any[];
}

/**
 * An annotation selector in target.
 */
export interface AnnotationSelector {
  type: string;
  conformsTo: string;
  value: string;
}

/**
 * An annotation target.
 */
export interface AnnotationTarget {
  source: string;
  selector: AnnotationSelector;
}

/**
 * An annotation body entry.
 */
export interface AnnotationBodyEntry {
  type: string;
  value: string;
  purpose: string;
}

/**
 * An annotation.
 */
export interface Annotation {
  id?: string;
  '@context': string;
  type: string;
  body?: AnnotationBodyEntry[];
  target: AnnotationTarget;
}

/**
 * Annotorious annotation event.
 */
export interface AnnotationEvent {
  /**
   * The annotation involved in this event.
   */
  annotation: Annotation;
  /**
   * The annotation before it was updated.
   */
  prevAnnotation?: Annotation;
  /**
   * The function to optionally override a new annotation's ID.
   */
  overrideId?: (id: any) => void;
}

/**
 * Essential directive wrapping Recogito's Annotorious.
 * Add as an attribute to your img element (cadmusImgAnnotator).
 */
@Directive({
  selector: '[cadmusImgAnnotator]',
})
export class ImgAnnotatorDirective {
  private _ann?: any;

  /**
   * The initial configuration for the annotator. Note that the image property
   * will be overridden with the img being decorated by this directive.
   */
  public readonly config = model<AnnotoriousConfig>({ disableEditor: true });

  /**
   * Disables the editor thus toggling the headless mode.
   */
  public readonly disableEditor = model<boolean>(true);

  /**
   * The current drawing tool. The default available tools are rect and polygon,
   * but more can be available from plugins.
   */
  public readonly tool = input<string>('rect');

  /**
   * The optional initial annotations to show on the image.
   */
  public readonly annotations = model<any[]>([]);

  /**
   * The selected annotation or its ID. When set, the annotator
   * will highlight the annotation and open its editor.
   */
  public selectedAnnotation = model<any>();

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

  constructor(private _elementRef: ElementRef<HTMLImageElement>) {
    // when config changes, recreate annotator
    effect(() => {
      console.log('annotator config', this.config());
      this._ann?.destroy();
      this.initAnnotator();
    });

    // when disableEditor changes, disable annotator
    effect(() => {
      // https://annotorious.github.io/guides/headless-mode/
      console.log('disableEditor', this.disableEditor());
      this._ann.disableEditor = this.disableEditor();
    });

    // when tool changes, select it in the annotator
    effect(() => {
      console.log('tool', this.tool());
      this._ann?.setDrawingTool(this.tool());
    });

    // when annotations change, update the annotator
    effect(() => {
      console.log('annotations', this.annotations());
      const annotations = this.annotations();
      if (!annotations?.length) {
        this._ann?.clearAnnotations();
      } else {
        this._ann?.setAnnotations(annotations);
      }
    });

    // when selected annotation changes, select it in the annotator
    effect(() => {
      console.log('selectedAnnotation', this.selectedAnnotation());
      this._ann?.selectAnnotation(this.selectedAnnotation());
    });
  }

  private initAnnotator(): void {
    const cfg = this.config() || { disableEditor: true };
    cfg.image = this._elementRef.nativeElement;
    this._ann = new Annotorious(cfg);

    // plugin
    if (this.additionalTools()?.length) {
      SelectorPack(this._ann, {
        tools: this.additionalTools(),
      });
    }

    // initial annotations
    this._ann.setAnnotations(this.annotations() || []);

    // wrap events:
    // createSelection
    this._ann.on('createSelection', (selection: Annotation) => {
      console.log('createSelection', selection);
      this.createSelection.emit(selection);
    });
    // selectAnnotation
    this._ann.on('selectAnnotation', (selection: Annotation) => {
      console.log('selectAnnotation', selection);
      this.selectAnnotation.emit(selection);
    });
    // cancelSelected
    this._ann.on('cancelSelected', (selection: Annotation) => {
      console.log('cancelSelected', selection);
      this.cancelSelected.emit(selection);
    });

    // createAnnotation
    this._ann.on(
      'createAnnotation',
      (annotation: any, overrideId: (id: any) => void) => {
        console.log('createAnnotation', annotation);
        this.createAnnotation.emit({
          annotation,
          overrideId,
        });
      }
    );
    // updateAnnotation
    this._ann.on('updateAnnotation', (annotation: any, previous: any) => {
      console.log('updateAnnotation', annotation);
      this.updateAnnotation.emit({ annotation, prevAnnotation: previous });
    });
    // deleteAnnotation
    this._ann.on('deleteAnnotation', (annotation: any) => {
      console.log('deleteAnnotation', annotation);
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
