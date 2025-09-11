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

### 9.0.2

- 2025-09-11: refactored for `OnPush`.

### 9.0.1

- 2025-06-02: debounce time in date typing from 1000 to 2000.

### 9.0.0

- 2025-05-22: debounce time in date typing from 400 to 1000.
