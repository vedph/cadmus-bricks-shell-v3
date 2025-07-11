# CadmusCodLocation

📦 `@myrmidon/cadmus-cod-location`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

- codicologic location component.
- codicologic location interpolator.
- codicologic location parser.
- codicologic location pipe and codicologic locations range pipe.

## Models

A codicologic location (`CodLocation`) is an object with these properties (the only required one being `n`):

- `endleaf`: whether the location refers to a set of endleaves, either at the start or at the end of the manuscript: 0=not in endleaf, 1=front endleaves, 2=back endleaves.
- `s`: ID of the reference system.
- `n`: sheet number (defaults to 0 if not specified).
- `rmn`: true if n must be displayed with Roman digits.
- `sfx`: an arbitrary suffix appended to n (e.g. "bis").
- `v`: true if verso, false if recto, undefined if not specified or not applicable.
- `c`: column number.
- `l`: line number.
- `word`: the word we refer to. By scholarly convention, this is a word picked from the line so that it cannot be ambiguous, i.e. confused with other instances of the same word in its line.

There is also a `CodLocationRange` which is a range having two `CodLocation`'s, one for `start` and one for `end`.

>The default value of 0 for `n` is due to the fact that users might want to enter an arbitrary sheet label (as found on the manuscript) rather than its physical location. In this case, the convention is entering just the suffix, between `""` as usual, like e.g. `"III"`; this will result in `n`=0 and `sfx`=`III`, which can be later looked up against a label sheets part to get the corresponding physical location.

## String Representation

A single `CodLocation` can be expressed as a string, parsable into `CodLocation` with `CodLocationParser`. The same parser also provides parsing for location ranges (`CodLocationRange`), and comparison between two locations a/b to determine whether a comes before b, or after it, or is the same.

The string format is `(/[SYSTEM:][^]N["SUFFIX"][(r|v)[COLUMN]].LINE)`, where `()` can be replaced with `[]` for covers, including these components (all optional except for `n`):

- endleaf, optional: `(` for front or `(/` for back endleaf; `[` for front or `[/` for back cover. For covers, only system and suffix are meaningful.
- system: starts with a-z or A-Z and then contains only letters, a-z or A-Z, underscores, or digits 0-9. It is terminated by `:`.
- `^` for a Roman number.
- sheet: the sheet number. This is the only required component.
- suffix between `""`.
- recto/verso: `r` or `v`, otherwise unspecified/not applicable.
- column: the column letter(s) (column 1=`a`, 2=`b`, etc.: range is `a`-`q`).
- line: the line number preceded by `.`.
- word preceded by `@`.

A specialized pipe (`CodLocationPipe`) can be used to display a `CodLocation` object by converting it into its parsable version.

Another pipe (`CodLocationRangePipe`) can be used to convert to string an array of `CodLocationRange`'s.

## Editor

The `CodLocationComponent` is used to edit a location using its string format. It has these properties:

- label: the label to display for the editor.
- required: true if the location is required.
- single: true if the location refers to a single sheet. If false, it refers to 1 or more ranges.
- location: the location(s) edited, an array of `CodLocationRange` (or `null`). When changes, `locationChange` is emitted.

## History

### 9.0.1

- 2025-05-31: fix to `CodLocationComponent` for invalid range like "1r- 2v" (space after dash).
- 2025-05-22: fix to `CodLocationComponent` for ending `-`.
- 2025-05-14: fix to `CodLocationComponent` for multiple ranges (regression from Angular updates).
