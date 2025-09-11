import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

import {
  TextBlock,
  TextBlockEventArgs,
  TextBlockViewComponent,
} from '@myrmidon/cadmus-text-block-view';

@Component({
  selector: 'app-text-block-view-pg',
  templateUrl: './text-block-view-pg.component.html',
  styleUrls: ['./text-block-view-pg.component.css'],
  // let styles flow down this component
  encapsulation: ViewEncapsulation.None,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TextBlockViewComponent,
  ],
})
export class TextBlockViewPgComponent implements OnInit {
  public text: FormControl<string | null>;
  public layerId: FormControl<string | null>;
  public form: FormGroup;

  public blocks: TextBlock[];

  constructor(formBuilder: FormBuilder) {
    this.blocks = [];
    this.text = formBuilder.control(
      'This is a test for our text block view component ' +
        'with some long sentence that you should not really read',
      Validators.required
    );
    this.layerId = formBuilder.control(null);
    this.form = formBuilder.group({
      text: this.text,
    });
  }

  public ngOnInit(): void {
    this.layerId.setValue('-');
  }

  private toBlocks(text: string): TextBlock[] {
    const svg =
      '<svg width="32" height="16" xmlns="http://www.w3.org/2000/svg">' +
      '<g><rect stroke-width="0" height="6" width="12" y="2" x="16" ' +
      'stroke="#000" fill="#0000ff"/><ellipse stroke-width="0" ry="4" ' +
      'rx="4" cy="10" cx="10" stroke="#000" fill="#ff0000"/></g></svg>';
    const blocks: TextBlock[] = [];
    for (let i = 0; i < text.length; i++) {
      blocks.push({
        id: 'b' + i,
        text: text.charAt(i) === ' ' ? '\u2000' : text.charAt(i),
        decoration: i % 20 == 0 ? svg : i.toString(),
        tip: 'Tip for #' + i,
        htmlDecoration: i % 20 == 0,
        // note: each of these IDs has a corresponding CSS class in styles.css
        layerIds: i > 9 && i < 20 ? ['alpha', 'beta'] : undefined,
      });
    }
    return blocks;
  }

  public setText(): void {
    if (this.form.invalid || !this.text.value) {
      return;
    }
    this.blocks = this.toBlocks(this.text.value);
  }

  public onBlockClick(args: TextBlockEventArgs): void {
    alert('Block ' + (args.decoration ? 'dec ' : '') + args.block.id);
  }
}
