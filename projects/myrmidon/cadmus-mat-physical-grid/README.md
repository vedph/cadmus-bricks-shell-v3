# CadmusMatPhysicalGrid

📦 `@myrmidon/cadmus-mat-physical-grid`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

This library contains a component representing a physical grid location (`PhysicalGridLocation`), i.e. a bounding rectangle ideally overlaid on top of a 2D physical surface. The surface of the rectangle is covered by a grid, where columns are labeled with letters, like in an Excel spreadsheet, and rows are numbered.

So, each cell in the grid can be identified by the combination of column label and row number, just like a cell in a spreadsheet.

This representation is typically used to roughly divide a surface into grid cells, and approximately locate parts of it via cell coordinates. This approach for labelling parts of a surface is used in many scenarios where it is necessary to provide a location strategy for its fragments; for instance this happens for fragments from inscriptions or manuscripts.

For example, a typical 3x3 grid allows to tell whether a fragment belongs to any of the edges or corners, or rather belongs to an inner portion of a fragmentary object.

x     | Column 1 | Column 2 | Column 3
------|----------|----------|---------
Row 1 | A1       | B1       | C1
Row 2 | A2       | B2       | C2
Row 3 | A3       | B3       | C3

For instance, in this grid a fragment could cover `A1 B1 B2 C3`. The order in which you select the cells is preserved as usually it is meaningful: when there is a text, the order usually reflects the reading order.

The component allows you to specify the location of 1 or more cells, according to different **modes**:

- _single_: you can select only 1 cell at a time. Use this for a simplified location.
- _multiple_: you can select as many cells as you want. Use this when dealing with multiple fragments.
- _contiguous_ (default): you can select 1 or more cells as far as they are contiguous.

## Component

- 🚩 `cadmus-mat-physical-grid-location`
- 🔑 `PhysicalGridLocationComponent`
- 📚 thesauri: none, but you can have a thesaurus for your component using this brick and map it to the `presets` property. This is useful when you want to provide a set of grid sizes to pick from.
- ▶️ input:
  - `location` (`PhysicalGridLocation | undefined`)
  - `required` (`boolean`): true if selecting at least 1 cell is required.
  - `presets` (`string[]`): presets sizes for the grid. Each preset is a string like 'name: 3x4' where name is the preset's name, 3 is the columns count, and 4 the rows count.
  - `allowResize` (`boolean`): true to allow resizing the grid.
  - `allowCustomSize` (`boolean`): to allow custom sizes also when presets is specified.
  - `noGrid` (`boolean`): true to hide the interactive grid.
  - `collapsedGrid` (`boolean`): true to collapse the interactive grid.
  - `mode` (`PhysicalGridMode`): the mode of selection in the grid: single allows to select a single cell, multiple allows to select multiple cells wherever they are, contiguous allows to select only contiguous cells.
- 🔥 output:
  - `locationChange` (`PhysicalGridLocation`): emitted when the location changes.
  - `collapsedGridChange` (`boolean`): emitted when the grid is collapsed.
