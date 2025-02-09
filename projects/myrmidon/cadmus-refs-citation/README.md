# CadmusRefsCitation

📦 `@myrmidon/cadmus-refs-citation`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.1.0.

This library provides services and components for entering structured literary citations in an interactive and partially constrained UI. Such citations are defined as a hierarchy of structures, from the largest to the smallest, in a specific order.

For instance, the Iliad is cited by book number first, and then by verse number. So, the hierarchy here is:

1. book
2. verse

Dante's Commedia instead has 3 levels, as it is cited by cantica, canto and verse.

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

The Iliad has 2 levels: book (24, identified by uppercase letters of the classical Greek alphabet Α-Ω) and verse. Notice that some verses might have a letter as a suffix, e.g. `124a`.

>The alphabetic numbering requires the definition of a custom format; here for brevity we just define the first 4 values, but in a real-world example we would define all the 24 values.

```json
{
  "formats": {
    "alpha_greek_upper": {
      "Α": 1,
      "Β": 2,
      "Γ": 3,
      "Δ": 4
    }
  },
  "schemes": {
    "il": {
      "name": "Iliad",
      "path": ["book", "verse"],
      "optionalFrom": "verse",
      "steps": {
        "book": [
          {
            "format": "alpha_greek_upper",
            "step": {
              "range": {
                "min": 1,
                "max": 24,
              }
            }
          }
        ],
        "verse": [
          {
            "step": {
              "range": {
                "min": 1,
                "suffix": "^[a-z]$"
              }
            }
          }
        ]
      }
    }
  }
}
```

In this example, the schema is identified by `il` (Iliad); its human-friendly name is `Iliad`, and its path contains 2 steps, which are optional from the second one.

The `steps` section contains most of the parameters driving the UI behavior:

- each property in it defines the configuration of the corresponding step in the path. So here we have 2 properties for `book` and `verse`.
- each of these step configurations contains any number of step objects:
  - in the case of `book`, we have just 1: its display format refers a custom alphabetic numbering using capital letters from the Classical Greek alphabet (`alpha_greek_upper`), and its values are included between 1 and 24.
  - in the case of `verse`, we used a lazier approach which just allows any positive integer number starting from 1 as the verse number. Also, we allow for a suffix after it, which must match the given regular expression pattern: `^[a-z]$`. This means that we allow only a single letter a-z after the number (if the suffix is an empty string, it will allow for any text). Anyway, here we could be more granular and define the maximum verse number for each canto in each cantica. This way, users won't be allowed to enter a verse number which does not exist. Of course this requires us to specify conditioned ranges for each combination of ascendants: e.g. when `book` is 1, the `verse`'s `max` is 611, and so forth (see the example about Dante).

### Homer - Odyssey

For Odyssey, the sample is almost equal, except that we use lowercase letters to number the books:

```json
{
  "formats": {
    "alpha_greek_lower": {
      "α": 1,
      "β": 2,
      "γ": 3,
      "δ": 4
    }
  },
  "schemes": {
    "od": {
      "name": "Odyssey",
      "path": ["book", "verse"],
      "optionalFrom": "verse",
      "steps": {
        "book": [
          {
            "format": "alpha_greek_lower",
            "step": {
              "range": {
                "min": 1,
                "max": 24,
              }
            }
          }
        ],
        "verse": [
          {
            "step": {
              "range": {
                "min": 1,
                "suffix": "^[a-z]$"
              }
            }
          }
        ]
      }
    }
  }
}
```

### Dante - Commedia

Dante's _(Divina) Commedia_ has 3 levels: cantica (`If.`, `Purg.`, `Par.`), canto (1-34 or 1-33), verso (number). Often, and this is reflected by this example, the numeric format for canti is Roman (with uppercase letters), while verse numbers use the Arabic format.

>In this specific example, we allow citations targeting just a cantica; so the first optional step is defined as canto.Also, by convention preset numeric formats are identified by names starting with `$`. In this example `$roman_upper` refers to a Roman numeric system with uppercase letters.

```json
{
  "schemes": {
    "dc": {
      "name": "Commedia",
      "path": ["cantica", "canto", "verso"],
      "optionalFrom": "canto",
      "color": "BB4142",
      "steps": {
        "cantica": [
          {
            "color": "BB4142",
            "step": {
              "format": "$roman_upper",
              "set": ["If.", "Purg.", "Par."]
            }
          }
        ],
        "canto": [
          {
            "color": "7EC8B1",
            "ascendants": [
              {
                "name": "cantica",
                "op": "=",
                "value": "If."
              }
            ],
            "step": {
              "range": {
                "min": 1,
                "max": 34
              }
            }
          },
          {
            "step": {
              "range": {
                "min": 1,
                "max": 33
              }
            }
          }
        ],
        "verso": [
          {
            "color": "EFE6CC",
            "step": {
              "range": {
                "min": 1
              }
            }
          }
        ]
      }
    }
  }
}
```

In this example, the schema is identified by `dc` (Divina Commedia); its human-friendly name is `Commedia`, and its path contains 3 steps, which are optional from the second one. Additionally, here we added color keys for the scheme and each of its steps. These can be displayed in the UI.

The `steps` section contains most of the parameters driving the UI behavior:

- each property in it defines the configuration of the corresponding step in the path. So here we have 3 properties for `cantica`, `canto`, and `verso`.
- each of these step configurations contains any number of step objects:
  - in the case of `cantica`, we have just 1: its display format refers to uppercase Roman numerals, and its values are a closed set including `If.`, `Purg.`, and `Par.`.
  - in the case of `canto`, we have 2 steps: the first is conditioned by its ascendants: when `cantica` is equal to `If.`, the numeric range for `canto` is 1-34; otherwise (there are no conditions here as defined by ascendants), the numeric range is 1-33.
  - in the case of `verso`, we used a lazier approach which just allows any positive integer number starting from 1 as the verse number. Yet, we could be more granular and define the maximum verse number for each canto in each cantica. This way, users won't be allowed to enter a verse number which does not exist. Of course this requires specifies conditioned ranges for each combination of ascendants, e.g. for "If. I 1" (having 136 verses):

```json
"verso": [
  {
    "step": {
      "ascendants": [
        {
          "name": "canto",
          "op": "=",
          "value": "1"
        },
        {
          "name": "cantica",
          "op": "=",
          "value": "If."
        }
      ],
      "range": {
        "min": 1,
        "max": 136
      }
    }
  }
]
```

The same should be done for each combination of cantica and canto.
