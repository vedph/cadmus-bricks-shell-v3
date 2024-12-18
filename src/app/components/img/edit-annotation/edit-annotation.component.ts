import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import {
  GuidService,
  ListAnnotation,
} from '../../../../../projects/myrmidon/cadmus-img-annotator/src/public-api';

@Component({
  selector: 'app-edit-annotation',
  templateUrl: './edit-annotation.component.html',
  styleUrls: ['./edit-annotation.component.css'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
})
export class EditAnnotationComponent {
  private _annotation?: ListAnnotation<any>;

  @Input()
  public get annotation(): ListAnnotation<any> | undefined {
    return this._annotation;
  }
  public set annotation(value: ListAnnotation<any> | undefined) {
    if (this._annotation === value) {
      return;
    }
    this._annotation = value;
    this.updateForm(this._annotation);
  }

  @Output()
  public cancel: EventEmitter<any>;

  @Output()
  public annotationChange: EventEmitter<ListAnnotation<any>>;

  @ViewChild('txt') txtElementRef?: ElementRef<HTMLTextAreaElement>;

  public text: FormControl<string | null>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder, private _guidService: GuidService) {
    this.text = formBuilder.control(null, {
      validators: [Validators.required, Validators.maxLength(100)],
      nonNullable: true,
    });
    this.form = formBuilder.group({
      text: this.text,
    });
    // events
    this.cancel = new EventEmitter<any>();
    this.annotationChange = new EventEmitter<ListAnnotation<any>>();
  }

  public ngAfterViewInit() {
    setTimeout(() => {
      this.txtElementRef?.nativeElement.focus();
    });
  }

  private updateForm(annotation?: ListAnnotation<any>): void {
    if (!annotation) {
      this.form.reset();
      return;
    }

    this.text.setValue(
      annotation.value.bodies?.length
        ? annotation.value.bodies[0].value || ''
        : ''
    );
    this.form.markAsPristine();
  }

  private getAnnotation(): ListAnnotation<any> {
    if (this._annotation!.value.bodies!.length === 0) {
      this._annotation!.value.bodies.push({
        id: this._guidService.getGuid(),
        annotation: this._annotation!.id,
        type: 'TextualBody',
        value: this.text.value || '',
        purpose: 'commenting',
      });
    } else {
      this._annotation!.value!.bodies[0].value = this.text.value || '';
    }
    let a: ListAnnotation<any> = {
      id: this._annotation!.id,
      // here the annotation value is just a string, but when it's an object,
      // we can leave it out as payload will be used instead anyway
      value: this._annotation!.value,
      image: this._annotation!.image,
      payload: this.text.value,
    };
    return a;
  }

  public close(): void {
    this.cancel.emit();
  }

  public save(): void {
    if (this.form.invalid) {
      return;
    }
    this._annotation = this.getAnnotation();
    this.annotationChange.emit(this._annotation);
  }
}
