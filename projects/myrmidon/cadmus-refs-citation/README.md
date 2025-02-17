# CadmusRefsCitation

📦 `@myrmidon/cadmus-refs-citation`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.1.0.

- [CadmusRefsCitation](#cadmusrefscitation)
  - [Editing Citations](#editing-citations)
  - [Scheme Examples](#scheme-examples)
    - [Homer - Iliad](#homer---iliad)
    - [Homer - Odyssey](#homer---odyssey)
    - [Dante - Commedia](#dante---commedia)
  - [Additional Services](#additional-services)
    - [Citation as Text](#citation-as-text)
    - [Sorting Citations](#sorting-citations)
  - [Usage](#usage)
    - [CitSchemeService](#citschemeservice)
    - [CitationComponent](#citationcomponent)

## Editing Citations

This library provides services and components for entering structured literary citations in an interactive and partially constrained UI. Such citations are defined as a hierarchy of structures, from the largest to the smallest, in a specific order.

For instance, the _Iliad_ is cited by book number first, and then by verse number. So, the hierarchy here is:

1. book
2. verse

Dante's _Commedia_ instead has 3 levels, as it is cited by cantica, canto and verse.

We can thus say that such hierarchies define _paths_, where each _step_ brings closer to the portion of the text we want to address. This is our terminology here.

This brick displays the hierarchy in a selectable form: each step in the path of a citation is shown, and you can click on it to edit its value. When editing, the UI varies according to the citation scheme used for that citation, so we can have:

- a positive integer number, free or constrained into a range (min and/or max).
- a string, free, partially free (=constrained by a regexp mask), or bound to a closed set (e.g. "If." = Inferno from the cantica set including "If.", "Purg.", "Par.").

To provide a UI which eases data entry of such citations, constraining the choices where required, we must take into account that:

- no hole can be present in the path steps, but starting from a specific level one might omit all the following steps up to the end. So we can never have a step without its ascendant, but (if allowed) we can have a step without its descendants.
- steps can be either labelled with a conventional string or numbered. Numbering can belong to different formats: Arabic, Roman, alphabetic, etc.; but in the end, we just have a number which is to be displayed in some format.
- constraining the value we can pick for a step is dependent on the step type (e.g. one of "If.", "Purg." or "Par." for a cantica, but a number for canto or verse) and optionally on the value of its ascendant steps. For instance, given that If. has 34 canti while Purg. and Par. have 33, one could set the allowed range of numeric values to 1-34 and 1-33 respectively according to the cantica.

The model which defines the data entry behavior for a citation scheme ([CitDefinition](models.ts)) is defined in the settings of the component consuming the brick. This is formally defined in [models](models.ts); here we just show examples in their JSON encoding.

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
        "template": "{book} {verse}"
      },
      "steps": {
        "book": {
          "numeric": true,
          "format": "agu",
          "value": {
            "range": {
              "min": 1,
              "max": 24
            }
          }
        },
        "verse": {
          "numeric": true,
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
  - in the case of `verse`, we used a lazier approach which just allows any positive integer number starting from 1 as the verse number. Also, we allow for a suffix after it, which must match the given regular expression pattern: `^[a-z]$`. This means that we allow only a single letter a-z after the number (if the suffix is an empty string, it will allow for any text). Anyway, here we could be more granular and define the maximum verse number for each canto in each cantica. This way, users won't be allowed to enter a verse number which does not exist. Of course this requires us to specify conditioned ranges for each combination of ascendants: e.g. when `book` is 1, the `verse`'s `max` is 611, and so forth (see the example about Dante).

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
        "template": "{book} {verse}"
      },
      "steps": {
        "book": {
          "numeric": true,
          "format": "agl",
          "value": {
            "range": {
              "min": 1,
              "max": 24
            }
          }
        },
        "verse": {
          "numeric": true,
          "suffixPattern": "([a-z])$",
          "suffixValidPattern": "^[a-z]$",
          "value": {
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
        "template": "{cantica} {canto} {verso}"
      },
      "color": "#BB4142",
      "steps": {
        "cantica": {
          "color": "#BB4142",
          "value": {
            "set": ["If.", "Purg.", "Par."]
          },
        },
        "canto": {
          "color": "#7EC8B1",
          "numeric": true,
          "format": "$ru",
          "conditions": [
            {
              "ascendants": [
                {
                  "id": "cantica",
                  "op": "=",
                  "value": "If."
                }
              ],
              "value": {
                "range": {
                  "min": 1,
                  "max": 34
                }
              }
            },
          ],
          {
            "value": {
              "range": {
                "min": 1,
                "max": 33
              }
            }
          }
        },
        "verso": {
          "color": "#EFE6CC",
          "numeric": true,
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
    "color": "#EFE6CC",
    "numeric": true,
    "conditions": [
      {
        "ascendants": [
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
        "value": {
          "range": {
            "min": 1,
            "max": 142
          }
        }
      }
    ],
    "value": {
      "range": {
        "min": 1
      }
    }
  }
}
```

>Note that the operator used for `canto` is `==` because this implies a numeric comparison; `cantica` instead is based on a closed set of strings, and uses the string comparison operator (`=`).

The same should be done for each combination of `cantica` and `canto`.

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

### Sorting Citations

An additional benefit of this model is that citations can be sorted. Whatever their step form (sets or numbers in any format with or without suffix), the model always provides a numeric value for each; so, sorting them is just a matter of comparing them step by step.

## Usage

For the UI, configure your citation schemes in your [app configuration](../../../src/app/app.config.ts) using the `CIT_SCHEME_SERVICE_TOKEN` injection token.To configure the schemes, use `CitSchemeService.configure`, e.g.:

```ts
// citation schemes
{
  provide: CIT_SCHEME_SERVICE_TOKEN,
  useFactory: () => {
    const service = new CitSchemeService();
    service.configure({
      formats: {},
      schemes: {
        dc: DC_SCHEME,
        od: OD_SCHEME,
      },
    } as CitSchemeSet);
    // agl formatter for Odyssey
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
    service.addFormatter('agl', aglFormatter);

    return service;
  },
},
```

### CitSchemeService

- `CitSchemeService`:
  - 🟢 `configure(set: ChitSchemeSet)`
  - 🟢 `getStepAt(index: number, schemeId: string): string`
  - 🟢 `getStepDomain(schemeId: string, stepId: string, citation?: CitationModel): CitSchemeStepValue | undefined`
  - 🟢 `hasScheme(id: string): boolean`
  - 🟢 `getScheme(id: string): CitScheme | undefined`
  - 🟢 `getSchemeIds(ids?: string[]): string[]`
  - 🟢 `addFormatter(key: string, formatter: CitNumberFormatter): void`
  - 🟢 `getFormatter(key: string): CitNumberFormatter | undefined`
  - 🟢 `format(key: string, value: number): string`
  - 🟢 `addParser(key: string, parser: CitParser): void`
  - 🟢 `getParser(key: string): CitParser | undefined`
  - 🟢 `parse(text: string, schemeId: string): CitationModel`
  - 🟢 `toString(citation: CitationModel, schemeId: string): string`
  - 🟢 `sortCitations(citations: CitationModel[], schemeId: string): void`

### CitationComponent

- 🔑 `CitationComponent`
- 🚩 `cadmus-refs-citation`
- ▶️ input:
  - `schemeKeys` (`string[]`): the scheme keys to use in this component. The full list of schemes is drawn from the service, but users might want to restrict the list to a subset of schemes.
  - `allowFreeMode` (`boolean`): true if the component allows free mode, where the user can type the citation as a free text, using the scheme parser.
  - `allowPartial` (`boolean`): true if the component allows a partial citation, i.e. a citation missing the final step(s) starting from the first one defined as optional in the scheme.
  - `citation` (`citationModel`): the citation to edit.
- 🔥 output:
  - `citationChange` (`citationModel`)
  - `citationValidate` (`citationError | null`)
