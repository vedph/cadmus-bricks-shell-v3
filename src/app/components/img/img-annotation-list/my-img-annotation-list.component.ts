import { Component } from '@angular/core';

import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import {
  ImgAnnotationListComponent,
  ObjectToStringPipe,
} from '../../../../../projects/myrmidon/cadmus-img-annotator/src/public-api';

@Component({
  selector: 'app-my-img-annotation-list',
  templateUrl: './my-img-annotation-list.component.html',
  styleUrls: ['./my-img-annotation-list.component.css'],
  imports: [CommonModule, MatButtonModule, MatIconModule, ObjectToStringPipe],
})
export class MyImgAnnotationListComponent extends ImgAnnotationListComponent<any> {
  public selectAnnotation(annotation: any): void {
    this.list?.selectAnnotation(annotation);
  }

  public removeAnnotation(index: number): void {
    this.list?.removeAnnotationAt(index);
  }

  public editAnnotation(annotation: any): void {
    this.list?.editAnnotation(annotation);
  }
}
