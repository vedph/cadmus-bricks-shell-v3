# CadmusRefsCitation

📦 `@myrmidon/cadmus-refs-citation`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.1.0.

- [CadmusRefsCitation](#cadmusrefscitation)
  - [Editing Citations](#editing-citations)
    - [Model](#model)
  - [Scheme Examples](#scheme-examples)
    - [Homer - Iliad](#homer---iliad)
    - [Homer - Odyssey](#homer---odyssey)
    - [Dante - Commedia](#dante---commedia)
  - [Additional Services](#additional-services)
    - [Citation as Text](#citation-as-text)
  - [Library](#library)
    - [Usage](#usage)
    - [CitSchemeService](#citschemeservice)
    - [CitationComponent](#citationcomponent)
    - [CitationViewComponent](#citationviewcomponent)
    - [CompactCitationComponent](#compactcitationcomponent)
    - [CitationSetComponent](#citationsetcomponent)
    - [CitationPipe](#citationpipe)
  - [History](#history)

## Editing Citations

This library provides services and components for entering **structured literary citations** (like `α 123` for verse 123 of the first book -`α`- of Homer's Odyssey) in an interactive and partially constrained UI.

### Model

These citations are defined as a **hierarchy**, from the largest to the smallest work's structure, in a specific order. For instance, the _Iliad_, which is structured in books which are structured in verses, is cited by book number first, and then by verse number. So, the hierarchy here is:

1. book;
2. verse.

Dante's _Commedia_ instead has 3 levels, as it is cited by _cantica_, _canto_ and _verso_:

1. _cantica_;
2. _canto_;
3. _verso_.

These hierarchies define **paths**, where each **step** brings us closer to the portion of the text we want to address: for instance, book 1 (first step) and verse 123 (second step).

The hierarchy has these features:

- **no holes** can be present in the path steps, but starting from a specific level one might _omit_ all the following steps up to the end. So we can never have a step without its ascendant, but (if allowed) we can have a step without its descendants.
- steps **types** are:
  - **textual**:
    - **closed**: this is the usual case: the text values belong to a closed ordered set, e.g. the 3 parts of Dante's _Commedia_ (`If.`, `Purg.`, `Par.`).
    - **masked**: a free text just constrained by a mask pattern.
    - **free**: a free text without any constraints.
  - **numeric**, using many formats: Arabic, Roman, alphabetic, etc.; in the end, whatever the system we just have a number which is to be displayed in some format.
- additionally, value domains can be **conditioned**: the value we can pick for a step is dependent on the step type (e.g. one of "If.", "Purg." or "Par." for a _cantica_, but a number for _canto_ or _verso_), and optionally on the value of its ascendant steps. For instance, given that `If.` has 34 _canti_ while `Purg.` and `Par.` have 33, one could set the allowed range of numeric values to 1-34 and 1-33 respectively, according to the _cantica_. This way, users won't be able to enter an invalid number for the _canto_ of each _cantica_.

>The model which defines the data entry behavior for a citation scheme ([CitScheme](models.ts)) is defined in the settings of the component consuming the brick. This is formally defined in [models](models.ts); for the sake of brevity, here I just show examples in their JSON encoding.

The whole purpose of the model is providing an interactive and helpful UI for entering a valid citation. In the end, unless you have specific requirements, all what you will store in the backend is just a **string** with the textual representation of a citation. You might well type this string directly; the UI just provides a friendlier and more controlled environment for data entry.

Being able to store the citation in its compact text format has the additional benefit of allowing simpler models using citations, as they can just be represented with a string without introducing unnecessary complications in the model itself. Should the structure of each stored citation be needed, it can be easily parsed from its textual rendition. This provides the best of both worlds: we can assist and validate user input, and still deal with a simple (yet fully parsable) string in the end.

For instance, once you parse the text into this model you get additional benefits, like e.g. being able to sort citations, whatever their format. For instance, citations like:

- If. IX 12
- If. VIII 1

would sort in the wrong order when just sorting them as strings (I comes before V, yet IX=9 and VIII=8).

>Note that sorting cannot apply to citation steps having as type a free or masked text, because in this case there is no rule to infer an order from the citation itself. These are corner cases, provided for wider compatibility, but in most (if not all) the cases you will use other step types; otherwise, the citation model itself wouldn't make much sense, given that it is used to constrain user's input.

This citation editor brick displays the hierarchy in a selectable form: each step in the path of a citation is shown, and you can click on it to edit its value. When editing, the UI varies according to the citation scheme used for that citation, so we can have:

- a string belonging to a closed set, to be picked from a list.
- a positive integer number, free or constrained into a range (min and/or max). Optionally we can add an alphanumeric suffix to this number.
- a free or pattern-constrained (masked) string, typed in a textbox.

Additionally, the hierarchy tail can be cut starting from the first optional step in its path; so, if in Dante this is equal to `cantica`, in the context of the path `cantica - canto - verso` this means that we can enter just `cantica`, or `cantica` and `verso`, or all the three steps.

In most cases you also have the option of directly typing the textual form of a citation and let the component parse it into the citation model.

## Scheme Examples

### Homer - Iliad

The _Iliad_ has 2 levels: book (24, identified by uppercase letters of the classical Greek alphabet Α-Ω) and verse. Notice that some verses might have a letter as a suffix, e.g. `124a`.

```json
{
  "formats": {
    "agu": {
      "Α": 1,
      "Β": 2,
      "Γ": 3,
      "Δ": 4,
      "Ε": 5,
      "Ζ": 6,
      "Η": 7,
      "Θ": 8,
      "Ι": 9,
      "Κ": 10,
      "Λ": 11,
      "Μ": 12,
      "Ν": 13,
      "Ξ": 14,
      "Ο": 15,
      "Π": 16,
      "Ρ": 17,
      "Σ": 18,
      "Τ": 19,
      "Υ": 20,
      "Φ": 21,
      "Χ": 22,
      "Ψ": 23,
      "Ω": 24,
    }
  },
  "schemes": {
    "il": {
      "id": "il",
      "name": "Iliad",
      "path": ["book", "verse"],
      "optionalFrom": "verse",
      "textOptions": {
        "pathPattern": "^\\s*([ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ])\\s+(\\d+(?:[a-z])?)\\s*$",       
        "template": "{book} {verse}",
        "hint": "book (α-ω) verse (1-N[a-z])",
      },
      "color": "#4287f5",
      "steps": {
        "book": {
          "type": "numeric",
          "color": "#4287f5",
          "format": "agu",
          "domain": {
            "range": {
              "min": 1,
              "max": 24
            }
          }
        },
        "verse": {
          "type": "numeric",
          "color": "#1ECBE1",
          "suffixPattern": "([a-z])$",
          "suffixValidPattern": "^[a-z]$",
          "value": {
            "range": {
              "min": 1
            }
          }
        }
      }
    }
  }
}
```

In this example, the schema is identified by `il` (_Iliad_); its human-friendly name is `Iliad`, and its path contains 2 steps, which are optional from the second one.

The `steps` section contains most of the parameters driving the UI behavior:

- each property in it defines the configuration of the corresponding step in the path. So here we have 2 properties for `book` and `verse`.
- each of these step configurations contains any number of step objects:
  - in the case of `book`, we have just 1: its display format refers a custom alphabetic numbering using capital letters from the Classical Greek alphabet (`agu`), and its values are included between 1 and 24.
  - in the case of `verse`, we used a lazier approach which just allows any positive integer number starting from 1 as the verse number. Also, we allow for a suffix after it, which must match the given regular expression pattern: `^[a-z]$`. This means that we allow only a single letter a-z after the number (if the suffix is an empty string, it will allow for any text). Anyway, here we could be more granular and define the maximum verse number for each canto in each cantica. This way, users won't be allowed to enter a verse number which does not exist. Of course this requires us to specify conditioned ranges for each combination of ascendants: e.g. when `book` is 1, the `verse`'s `max` is 611, and so forth (see the [example about Dante](#dante---commedia)).

Additionally, to provide [text rendition for citations](#additional-services), we add under `textOptions` the rendering options:

- `suffix`: the regular expression to extract suffixes from verse values.
- `separators`: the separators to add before/after each step. Here we just add a space after each `book`.

### Homer - Odyssey

For the _Odyssey_, the sample is almost equal, except that we use lowercase letters to number the books:

```json
{
  "formats": {
    "agl": {
      "α": 1,
      "β": 2,
      "γ": 3,
      "δ": 4,
      "ε": 5,
      "ζ": 6,
      "η": 7,
      "θ": 8,
      "ι": 9,
      "κ": 10,
      "λ": 11,
      "μ": 12,
      "ν": 13,
      "ξ": 14,
      "ο": 15,
      "π": 16,
      "ρ": 17,
      "σ": 18,
      "τ": 19,
      "υ": 20,
      "φ": 21,
      "χ": 22,
      "ψ": 23,
      "ω": 24,
    }
  },
  "schemes": {
    "od": {
      "id": "od",
      "name": "Odyssey",
      "path": ["book", "verse"],
      "optionalFrom": "verse",
      "textOptions": {
        "pathPattern": "^\\s*([αβγδεζηθικλμνξοπρστυφχψω])\\s+(\\d+(?:[a-z])?)\\s*$",
        "template": "{book} {verse}",
        "hint": "book (α-ω) verse (1-N[a-z])",
      },
      "color": "#4287f5",
      "steps": {
        "book": {
          "type": "numeric",
          "color": "#4287f5",
          "format": "agl",
          "domain": {
            "range": {
              "min": 1,
              "max": 24
            }
          }
        },
        "verse": {
          "type": "numeric",
          "color": "#1ECBE1",
          "suffixPattern": "([a-z])$",
          "suffixValidPattern": "^[a-z]$",
          "domain": {
            "range": {
              "min": 1,
            }
          }
        }
      }
    }
  }
}
```

>Note that in path patterns we do not simply use expressions like `[α-ω]`, because these would include also an additional character which in Unicode is included in such range (e.g. for lowercase this is the final sigma).

### Dante - Commedia

Dante's _Commedia_ has 3 levels: cantica (`If.`, `Purg.`, `Par.`), canto (1-34 or 1-33), verso (number). Often, and this is reflected by this example, the numeric format for canti is Roman (with uppercase letters), while verse numbers use the Arabic format.

>In this specific example, we allow citations targeting just a cantica; so the first optional step is defined as canto.Also, by convention preset numeric formats are identified by names starting with `$`. In this example `$ru` (Roman, uppercase) refers to a Roman numeric system with uppercase letters.

```json
{
  "schemes": {
    "dc": {
      "id": "dc",
      "name": "Commedia",
      "path": ["cantica", "canto", "verso"],
      "optionalFrom": "canto",
      "textOptions": {
        "pathPattern": "^\\s*(If\\.|Purg\\.|Par\\.)\\s*([IVX]+)\\s+(\\d+)\\s*$",
        "template": "{cantica} {canto} {verso}",
        "hint": "cantica (If., Purg., Par.) canto (1-33) verso (1-N)",
      },
      "color": "#BB4142",
      "steps": {
        "cantica": {
          "type": "set",
          "color": "#BB4142",
          "domain": {
            "set": ["If.", "Purg.", "Par."]
          },
        },
        "canto": {
          "type": "numeric",
          "color": "#7EC8B1",
          "format": "$ru",
          "conditions": [
            {
              "clauses": [
                {
                  "id": "cantica",
                  "op": "=",
                  "value": "If."
                }
              ],
              "domain": {
                "range": {
                  "min": 1,
                  "max": 34
                }
              }
            },
          ],
          {
            "domain": {
              "range": {
                "min": 1,
                "max": 33
              }
            }
          }
        },
        "verso": {
          "type": "numeric",
          "color": "#EFE6CC",
          "domain": {
            "range": {
              "min": 1
            }
          }
        }
      }
    }
  }
}
```

In this example, the schema is identified by `dc` (_Divina Commedia_); its human-friendly name is `Commedia`, and its path contains 3 steps, which are optional from the second one. Additionally, here we added color keys for the scheme and each of its steps. These can be displayed in the UI.

The `steps` section contains most of the parameters driving the UI behavior:

- each property in it defines the configuration of the corresponding step in the path. So here we have 3 properties for `cantica`, `canto`, and `verso`.
- each of these step configurations contains any number of step objects:
  - in the case of `cantica`, we have just 1: its display format refers to uppercase Roman numerals, and its values are a closed set including `If.`, `Purg.`, and `Par.`.
  - in the case of `canto`, we have 2 steps: the first is conditioned by its ascendants: when `cantica` is equal to `If.`, the numeric range for `canto` is 1-34; otherwise (there are no conditions here as defined by ascendants), the numeric range is 1-33.
  - in the case of `verso`, we used a lazier approach which just allows any positive integer number starting from 1 as the verse number. Yet, we could be more granular and define the maximum verse number for each canto in each cantica. This way, users won't be allowed to enter a verse number which does not exist. Of course this requires specifies conditioned ranges for each combination of ascendants, e.g. for "If. XXVI" (having 142 verses):

```json
{
  "verso": {
    "type": "numeric",
    "color": "#EFE6CC",
    "numeric": true,
    "conditions": [
      {
        "clauses": [
          {
            "id": "cantica",
            "op": "=",
            "value": "If."
          },
          {
            "id": "canto",
            "op": "==",
            "value": "26"
          },
        ],
        "domain": {
          "range": {
            "min": 1,
            "max": 142
          }
        }
      }
    ],
    "domain": {
      "range": {
        "min": 1
      }
    }
  }
}
```

>Note that the operator used for `canto` is `==` because this implies a numeric comparison; `cantica` instead is based on a closed set of strings, and uses the string comparison operator (`=`).

The same should be done for each combination of `cantica` and `canto`. You can find the full configuration in the [sample citation schemes](../../../src/app/cit-schemes.ts). To create similar JSON code without too much hassle, just have a CSV file like:

```csv
If.,1,136
If.,2,142
If.,3,136
If.,4,151
If.,5,142
If.,6,115
If.,7,130
If.,8,130
If.,9,133
If.,10,136
If.,11,115
If.,12,139
If.,13,151
If.,14,142
If.,15,124
If.,16,136
If.,17,136
If.,18,136
If.,19,133
If.,20,130
If.,21,139
If.,22,151
If.,23,148
If.,24,151
If.,25,151
If.,26,142
If.,27,136
If.,28,142
If.,29,139
If.,30,148
If.,31,145
If.,32,139
If.,33,157
If.,34,139
Purg.,1,136
Purg.,2,133
Purg.,3,145
Purg.,4,139
Purg.,5,136
Purg.,6,151
Purg.,7,136
Purg.,8,139
Purg.,9,145
Purg.,10,139
Purg.,11,142
Purg.,12,136
Purg.,13,154
Purg.,14,151
Purg.,15,145
Purg.,16,145
Purg.,17,139
Purg.,18,145
Purg.,19,145
Purg.,20,151
Purg.,21,136
Purg.,22,154
Purg.,23,133
Purg.,24,154
Purg.,25,139
Purg.,26,148
Purg.,27,142
Purg.,28,148
Purg.,29,154
Purg.,30,145
Purg.,31,145
Purg.,32,160
Purg.,33,145
Par.,1,142
Par.,2,148
Par.,3,130
Par.,4,142
Par.,5,139
Par.,6,142
Par.,7,148
Par.,8,148
Par.,9,142
Par.,10,148
Par.,11,139
Par.,12,145
Par.,13,142
Par.,14,139
Par.,15,148
Par.,16,154
Par.,17,142
Par.,18,136
Par.,19,148
Par.,20,148
Par.,21,142
Par.,22,154
Par.,23,139
Par.,24,154
Par.,25,139
Par.,26,142
Par.,27,148
Par.,28,139
Par.,29,145
Par.,30,148
Par.,31,142
Par.,32,151
Par.,33,145
```

Once you have it, just use a Python script like this:

```py
# dc.py
# run with: python dc.py
import csv
import json


def generate_json_from_csv(csv_filepath, json_filepath):
    """Generates JSON from a CSV file.

    Args:
        csv_filepath: Path to the CSV file.
        json_filepath: Path to the output JSON file.
    """

    data = []
    try:
        with open(
            csv_filepath, "r", encoding="utf-8"
        ) as csvfile:  # Handle potential encoding issues
            reader = csv.DictReader(
                csvfile, fieldnames=["cantica", "canto", "verses"]
            )  # Specify fieldnames

            for row in reader:
                try:
                    canto_num = int(row["canto"])  # Convert canto to integer
                    verses_num = int(row["verses"])
                    data.append(
                        {
                            "clauses": [
                                {
                                    "id": "cantica",
                                    "op": "=",
                                    "value": row["cantica"],
                                },
                                {
                                    "id": "canto",
                                    "op": "==",
                                    "value": str(
                                        canto_num
                                    ),  # Keep as a string for consistency
                                },
                            ],
                            "domain": {"range": {"min": 1, "max": verses_num}},
                        }
                    )
                except ValueError:
                    print(f"Skipping row due to invalid canto or verses number: {row}")
    except FileNotFoundError:
        print(f"Error: CSV file not found at {csv_filepath}")
        return

    try:
        with open(json_filepath, "w", encoding="utf-8") as jsonfile:
            json.dump(
                data, jsonfile, indent=2, ensure_ascii=False
            )  # Use indent for pretty formatting and ensure_ascii=False
        print(f"JSON data written to {json_filepath}")
    except Exception as e:
        print(f"Error writing JSON file: {e}")


# Example usage:
csv_file = "commedia.csv"  # Replace with your CSV file path
json_file = "commedia.json"  # Replace with your desired JSON file path
generate_json_from_csv(csv_file, json_file)
```

## Additional Services

### Citation as Text

A citation by definition is an array of strings, each representing a step in the scheme's path. Anyway, you may want to represent this citation into a compact text form. For instance, we might have `α 12` to represent Odyssey book 1, verse 12.

To this end, the citation scheme service provides among others two methods:

- `toString` to render the citation as text.
- `parse` to parse the rendered citation text.

These functions use one or more instances of `CitParser` services, which can be added to the citation scheme service (via `addParser`). Each parser is added with an arbitrary key, which is then used to select it.

Unless your logic is more complex, in most cases you can use the `PatternCitParser` as a generic parser, configured via patterns defined in the scheme's text options (`CitTextOptions`, defined in the `textOptions` property of the citation scheme definition). These options include:

- _path pattern_: the regular expression used to extract steps from a path. Each step is a match group, and their order matches the order of the steps in the path.
- _template_: the template to render the citation text. Each step is a placeholder between braces, e.g. `{book} {verse}`. Placeholders can get these suffixes for numeric values:
  - `:n` to render the numeric value only;
  - `:s` to render the suffix only.

For instance, for Homer's _Odyssey_ these parameters would be:

- path pattern: `^\s*([α-ω])\s+(\d+(?:[a-z])?)\s*$`. In a string like `α 123a`, the match groups corresponding to paths book and verse would be 1=`α` and 2=`123a`.
- template: `{book} {verse}`.

The verse step also has this suffix pattern: `([a-z])$`.

For Dante's _Commedia_:

- path pattern: `^\s*(If\.|Purg\.|Par\.)\s*([IVX]+)\s+(\d+)\s*$`
- template: `{cantica} {canto} {verso}`.

By default, the rendered citation text starts with its **scheme ID prefix** between `@` and `:`. So, for instance we would have `@dc:If. XX 2` for the scheme identified by `dc`. If you are going to use a single scheme for all your citations, you can omit the prefix by setting the corresponding citation scheme set option (`CitSchemeSet.noSchemePrefix`).

## Library

Given that this is a generic library, it is designed to be flexible and extensible. The core logic is implemented by the [citation scheme service](#citschemeservice), which can be configured with any number of citation schemes. The set of schemes used for this configuration can define additional components:

- parsers, to parse the textual representation of a citation, and render a citation model into this textual representation.
- formatters, to format a numeric value using a specific system, or parse the formatted text into the corresponding numeric value.

In most cases you won't need to write your own parsers and formatters, even if this is always possible; you will just stick to these prebuilt services:

- [pattern-based citation parser](src/lib/services/pattern.cit-parser.ts): this parser is totally driven by the scheme configuration and allows you to parse the textual representation of a citation, or generate this textual representation from a citation.
- [Roman number formatter](src/lib/services/roman-number.formatter.ts): this formatter provides the Roman numeral system for numeric values, for both parsing or formatting them.

### Usage

1. `npm i @myrmidon/cadmus-refs-citation`.
2. in your app root component, configure citation schemes like:

    ```ts
    // example app.component.ts
    import { EnvService, RamStorageService } from '@myrmidon/ngx-tools';

    @Component({
      selector: 'app-root',
      imports: [
        RouterOutlet,
        RouterModule,
        MatButtonModule,
        MatDividerModule,
        MatMenuModule,
        MatDividerModule,
        MatToolbarModule,
      ],
      templateUrl: './app.component.html',
      styleUrl: './app.component.scss',
    })
    export class AppComponent {
      public readonly version: string;

      constructor(
        env: EnvService,
        storage: RamStorageService,
      ) {
        this.version = env.get('version') || '';
        this.configureCitationService(storage);
        // ...
      }

      private configureCitationService(storage: RamStorageService): void {
        // custom formatters: agl formatter for Odyssey
        const aglFormatter = new MapFormatter();
        const aglMap: CitMappedValues = {};
        for (let n = 0x3b1; n <= 0x3c9; n++) {
          // skip final sigma
          if (n === 0x3c2) {
            continue;
          }
          aglMap[String.fromCharCode(n)] = n - 0x3b0;
        }
        aglFormatter.configure(aglMap);

        // store settings via service
        storage.store(CIT_SCHEME_SERVICE_SETTINGS_KEY, {
          formats: {},
          schemes: {
            dc: DC_SCHEME,
            od: OD_SCHEME,
          },
          formatters: {
            agl: aglFormatter,
          },
        } as CitSchemeSettings);
      }
    }
    ```

3. inject the scheme service in your consumer component constructor, like `private _schemeService: CitSchemeService`, or use the UI bricks via their selectors.

### CitSchemeService

- `CitSchemeService`:
  - 🔥 `schemeSet$` (`Observable<Readonly<CitSchemeSet>>`)
  - 🟢 `configure(set: CitSchemeSet)`
  - 🟢 `getStepAt(index: number, schemeId: string): string`
  - 🟢 `getStepDomain(stepId: string, citation?: CitationModel, defaultSchemeId?: string): CitSchemeStepValue | undefined`
  - 🟢 `hasScheme(id: string): boolean`
  - 🟢 `hasSchemePrefix(): boolean`
  - 🟢 `getScheme(id: string): CitScheme | undefined`
  - 🟢 `getSchemeIds(ids?: string[]): string[]`
  - 🟢 `addFormatter(key: string, formatter: CitNumberFormatter): void`
  - 🟢 `getFormatter(key: string): CitNumberFormatter | undefined`
  - 🟢 `format(key: string, value: number): string`
  - 🟢 `addParser(key: string, parser: CitParser): void`
  - 🟢 `getParser(key: string): CitParser | undefined`
  - 🟢 `extractSchemeId(text): { id: string; text: string } | undefined`
  - 🟢 `parse(text: string, defaultSchemeId: string): Citation | undefined`
  - 🟢 `toString(citation: Citation): string`
  - 🟢 `sortCitations(citations: Citation[], defaultSchemeId: string): void`
  - 🟢 `compactCitations(citations: (Citation | CitationSpan)[]): (Citation | CitationSpan)[]`

### CitationComponent

This component is used for editing a single citation. The input citation can be undefined for a new citation, or just an instance of `Citation`. The output always is a `Citation`.

- 🔑 `CitationComponent`
- 🚩 `cadmus-refs-citation`
- ▶️ input:
  - `schemeKeys` (`string[]`): the scheme keys to use in this component. The full list of schemes is drawn from the service, but users might want to restrict the list to a subset of schemes.
  - `allowFreeMode` (`boolean`): true if the component allows free mode, where the user can type the citation as a free text, using the scheme parser.
  - `allowPartial` (`boolean`): true if the component allows a partial citation, i.e. a citation missing the final step(s) starting from the first one defined as optional in the scheme.
  - `citation` (`Citation`): the citation to edit.
- 🔥 output:
  - `citationChange` (`Citation`)
  - `citationValidate` (`CitationError | null`): emitted after `citationChange` to report the validation result for the citation.

### CitationViewComponent

A component to display a citation or a citation span. The input can be a string (which will be parsed), a `Citation`, or a `CitationSpan`.

- 🔑 `CitationViewComponent`
- 🚩 `cadmus-refs-citation-view`
- ▶️ input:
  - `citation` (`string|Citation|CitationSpan`): the citation to display, which can be its model or its textual representation. When the citation is rather a range, it can be either a `CitationSpan` or a text using " - " as separator.
  - `defaultSchemeId` (`string`)

### CompactCitationComponent

A compact editor for a citation. This combines a citation view component and an expandable citation editor component.

- 🔑 `CompactCitationComponent`
- 🚩 `cadmus-refs-compact-citation`
- ▶️ input:
  - `schemeKeys` (`string[]`)
  - `allowFreeMode` (`boolean`)
  - `allowPartial` (`boolean`)
  - `citation` (`Citation | CitationSpan`)
  - `defaultSchemeId` (`string`)
- 🔥 output:
  - `citationChange` (`Citation | CitationSpan`)

### CitationSetComponent

A set of editable citations and/or citation spans.

- 🔑 `CitationSetComponent`
- 🚩 `cadmus-refs-citation-set`
- ▶️ input:
  - `schemeKeys` (`string[]`)
  - `allowFreeMode` (`boolean`)
  - `allowPartial` (`boolean`)
  - `citations` (`(Citation | CitationSpan)[]`)
- 🔥 output:
  - `citationsChange` (`(Citation | CitationSpan)[]`)

### CitationPipe

This pipe is used to render a citation or citation span into a string.

- 🔑 `CitationPipe`
- 🚩 `citation`

Use like:

```html
{{ cit | citation }}
```

## History

- 2025-03-25: replaced token-based injection of scheme set with settings from storage. This aligns with lookup set configuration, and avoids issues with DI and standalone components, which may cause the creation of an unconfigured service instance.
