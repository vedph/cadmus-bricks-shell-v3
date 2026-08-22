import { render, fireEvent } from '@testing-library/angular';

import {
  TextBlock,
  TextBlockEventArgs,
  TextBlockViewComponent,
} from './text-block-view.component';

describe('TextBlockViewComponent', () => {
  it('should render', async () => {
    const { fixture } = await render(TextBlockViewComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should default blocks to an empty array', async () => {
    const { fixture } = await render(TextBlockViewComponent);
    expect(fixture.componentInstance.blocks()).toEqual([]);
  });

  it('should default selectedIds to undefined', async () => {
    const { fixture } = await render(TextBlockViewComponent);
    expect(fixture.componentInstance.selectedIds()).toBeUndefined();
  });

  it('should render one column per block', async () => {
    const blocks: TextBlock[] = [
      { id: 'b1', text: 'Hello' },
      { id: 'b2', text: 'World' },
    ];
    const { fixture } = await render(TextBlockViewComponent, {
      inputs: { blocks },
    });
    const cols = fixture.nativeElement.querySelectorAll(
      '.cadmus-text-block-view-col'
    );
    expect(cols.length).toBe(2);
  });

  it('should render the block text and id', async () => {
    const blocks: TextBlock[] = [{ id: 'b1', text: 'Hello' }];
    const { fixture } = await render(TextBlockViewComponent, {
      inputs: { blocks },
    });
    const textEl = fixture.nativeElement.querySelector(
      '.cadmus-text-block-view-t'
    );
    expect(textEl.textContent.trim()).toBe('Hello');
    expect(textEl.id).toBe('b1');
  });

  it('should render the decoration text when htmlDecoration is falsy', async () => {
    const blocks: TextBlock[] = [
      { id: 'b1', text: 'Hello', decoration: 'DEC', tip: 'a tip' },
    ];
    const { fixture } = await render(TextBlockViewComponent, {
      inputs: { blocks },
    });
    const decEl = fixture.nativeElement.querySelector(
      '.cadmus-text-block-view-d'
    );
    expect(decEl).toBeTruthy();
    expect(decEl.textContent.trim()).toBe('DEC');
    expect(decEl.title).toBe('a tip');
    // the html-decoration row should not be present
    const rows = fixture.nativeElement.querySelectorAll(
      '.cadmus-text-block-view-col > .cadmus-text-block-view-row'
    );
    expect(rows.length).toBe(0);
  });

  it('should render html decoration instead of plain text when htmlDecoration is true', async () => {
    const blocks: TextBlock[] = [
      {
        id: 'b1',
        text: 'Hello',
        decoration: '<b>DEC</b>',
        htmlDecoration: true,
        tip: 'html tip',
      },
    ];
    const { fixture } = await render(TextBlockViewComponent, {
      inputs: { blocks },
    });
    // plain decoration div should not be rendered
    const decEl = fixture.nativeElement.querySelector(
      '.cadmus-text-block-view-d'
    );
    expect(decEl).toBeFalsy();

    // the html row should be rendered with sanitized inner html
    const htmlRow = fixture.nativeElement.querySelector(
      '.cadmus-text-block-view-col > .cadmus-text-block-view-row'
    );
    expect(htmlRow).toBeTruthy();
    expect(htmlRow.title).toBe('html tip');
    expect(htmlRow.innerHTML).toContain('<b>DEC</b>');
  });

  it('should emit blockClick with decoration=false when the text is clicked', async () => {
    const block: TextBlock = { id: 'b1', text: 'Hello' };
    const { fixture } = await render(TextBlockViewComponent, {
      inputs: { blocks: [block] },
    });
    const events: TextBlockEventArgs[] = [];
    fixture.componentInstance.blockClick.subscribe((e) => events.push(e));

    const textEl = fixture.nativeElement.querySelector(
      '.cadmus-text-block-view-t'
    );
    await fireEvent.click(textEl);

    expect(events.length).toBe(1);
    expect(events[0]).toEqual({ decoration: false, block });
  });

  it('should emit blockClick with decoration=true when the decoration is clicked', async () => {
    const block: TextBlock = { id: 'b1', text: 'Hello', decoration: 'DEC' };
    const { fixture } = await render(TextBlockViewComponent, {
      inputs: { blocks: [block] },
    });
    const events: TextBlockEventArgs[] = [];
    fixture.componentInstance.blockClick.subscribe((e) => events.push(e));

    const decEl = fixture.nativeElement.querySelector(
      '.cadmus-text-block-view-d'
    );
    await fireEvent.click(decEl);

    expect(events.length).toBe(1);
    expect(events[0]).toEqual({ decoration: true, block });
  });

  it('should emit blockClick with decoration=true when an html decoration is clicked', async () => {
    const block: TextBlock = {
      id: 'b1',
      text: 'Hello',
      decoration: '<i>DEC</i>',
      htmlDecoration: true,
    };
    const { fixture } = await render(TextBlockViewComponent, {
      inputs: { blocks: [block] },
    });
    const events: TextBlockEventArgs[] = [];
    fixture.componentInstance.blockClick.subscribe((e) => events.push(e));

    const htmlRow = fixture.nativeElement.querySelector(
      '.cadmus-text-block-view-col > .cadmus-text-block-view-row'
    );
    await fireEvent.click(htmlRow);

    expect(events.length).toBe(1);
    expect(events[0]).toEqual({ decoration: true, block });
  });

  it('should apply the intersection of layerIds and selectedIds as css classes', async () => {
    const blocks: TextBlock[] = [
      { id: 'b1', text: 'Hello', layerIds: ['l1', 'l2', 'l3'] },
    ];
    const { fixture } = await render(TextBlockViewComponent, {
      inputs: { blocks, selectedIds: ['l2', 'l3', 'l4'] },
    });
    const textEl = fixture.nativeElement.querySelector(
      '.cadmus-text-block-view-t'
    );
    expect(textEl.classList.contains('l2')).toBe(true);
    expect(textEl.classList.contains('l3')).toBe(true);
    expect(textEl.classList.contains('l1')).toBe(false);
    expect(textEl.classList.contains('l4')).toBe(false);
  });

  it('should apply no extra classes when block has no layerIds', async () => {
    const blocks: TextBlock[] = [{ id: 'b1', text: 'Hello' }];
    const { fixture } = await render(TextBlockViewComponent, {
      inputs: { blocks, selectedIds: ['l1'] },
    });
    const textEl = fixture.nativeElement.querySelector(
      '.cadmus-text-block-view-t'
    );
    // no layer classes beyond the static base class
    expect(textEl.className.trim()).toBe('cadmus-text-block-view-t');
  });

  describe('getBlockId', () => {
    it('should return the block id regardless of index', async () => {
      const { fixture } = await render(TextBlockViewComponent);
      const block: TextBlock = { id: 'xyz', text: 't' };
      expect(fixture.componentInstance.getBlockId(0, block)).toBe('xyz');
      expect(fixture.componentInstance.getBlockId(5, block)).toBe('xyz');
    });
  });

  describe('onBlockClick', () => {
    it('should emit the given block and decoration flag', async () => {
      const { fixture } = await render(TextBlockViewComponent);
      const block: TextBlock = { id: 'b1', text: 't' };
      const events: TextBlockEventArgs[] = [];
      fixture.componentInstance.blockClick.subscribe((e) => events.push(e));

      fixture.componentInstance.onBlockClick(block, true);
      fixture.componentInstance.onBlockClick(block, false);

      expect(events).toEqual([
        { decoration: true, block },
        { decoration: false, block },
      ]);
    });
  });
});
