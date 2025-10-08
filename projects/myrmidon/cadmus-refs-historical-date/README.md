# CadmusRefsHistoricalDate

- 📦 `@myrmidon/cadmus-refs-historical-date`
- 🧱 [historical date backend model](https://github.com/vedph/cadmus-bricks/blob/master/docs/historical-date.md)

- [CadmusRefsHistoricalDate](#cadmusrefshistoricaldate)
  - [HistoricalDateComponent](#historicaldatecomponent)
  - [DatationComponent](#datationcomponent)
  - [HistoricalDatePipe](#historicaldatepipe)
  - [History](#history)
    - [9.0.1](#901)
    - [9.0.0](#900)

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

## HistoricalDateComponent

Historical date editor.

- 🔑 `HistoricalDateComponent`
- 🚩 `cadmus-refs-historical-date`
- ▶️ input:
  - `date` (`HistoricalDateModel`)
  - `label` (`string?`)
  - `disabled` (`boolean?`)
- 🔥 output:
  - `dateChange` (`HistoricalDateModel`)

## DatationComponent

Datation editor.

- 🔑 `DatationComponent`
- 🚩 `cadmus-refs-datation`
- ▶️ input:
  - `datation` (`DatationModel`)
  - `label` (`string?`)
- 🔥 output:
  - `datationChange` (`DatationModel`)

## HistoricalDatePipe

- 🚩 `historicalDate`

A pipe to display `HistoricalDate`'s (`value | historicalDate:type`).

All the arguments are optional: type defaults to `text`. Set type to `value` if you want to get the sort value instead of the textual representation.

Example:

```html
<span>{{ date | historicalDate }}</span>
<span>{{ date | historicalDate:'value' }}</span>
```

## History

### 9.1.0

- 2025-10-07:
  - added explicit parse button for historical datation text.
  - 🆕 added `slide` to datation, synching the TypeScript code with its backend C# counterpart. The slide defaults to 0; when different from 0, it represents a "slide" delta to be added to `value`. For instance, value=1230 and slide=10 means 1230-1240; this is not a range in the sense of `HistoricalDatation` with A and B points; it's just a relatively undeterminated point, allowed to move between 1230 and 1240. This means that we can still have a range, like A=1230-1240 and B=1290. We represent this with `:` in its parsable string. So, we can now have strings like `1230:1240--1290` for range A=1230-1240 and B=1290, or even `1230:1240--1290:1295`; all combinations are possible. With negative (BC) values we have e.g. `810:805 BC` meaning slide=5. Note that slides are possible with centuries too, e.g. `VI:VII`. This change has no impact on existing data and code, it just adds a new feature to the datation model.

### 9.0.2

- 2025-09-11: refactored for `OnPush`.

### 9.0.1

- 2025-06-02: debounce time in date typing from 1000 to 2000.

### 9.0.0

- 2025-05-22: debounce time in date typing from 400 to 1000.
