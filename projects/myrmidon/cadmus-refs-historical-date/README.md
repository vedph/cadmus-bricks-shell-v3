# CadmusRefsHistoricalDate

- 📦 `@myrmidon/cadmus-refs-historical-date`
- 🧱 [historical date backend model](https://github.com/vedph/cadmus-bricks/blob/master/docs/historical-date.md)

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

## HistoricalDateComponent

Historical date editor.

- 🔑 `HistoricalDateComponent`
- 🚩 `cadmus-refs-historical-date`
- ▶️ input:
  - date (`HistoricalDateModel`)
  - label (`string?`)
  - disabled (`boolean?`)
- 🔥 output:
  - dateChange (`HistoricalDateModel`)

## DatationComponent

Datation editor.

- 🔑 `DatationComponent`
- 🚩 `cadmus-refs-datation`
- ▶️ input:
  - datation (`DatationModel`)
  - label (`string?`)
- 📚 thesauri:
- 🔥 output:
  - datationChange (`DatationModel`)

## HistoricalDatePipe

- 🚩 `historicalDate`

A pipe to display `HistoricalDate`'s (`value | historicalDate:type`).

All the arguments are optional: type defaults to `text`. Set type to `value` if you want to get the sort value instead of the textual representation.

Example:

```html
<span>{{ date | historicalDate }}</span>
<span>{{ date | historicalDate:'value' }}</span>
```
