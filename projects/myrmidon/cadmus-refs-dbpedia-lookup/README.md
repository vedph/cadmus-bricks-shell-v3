# CadmusRefsDbpediaLookup

📦 `@myrmidon/cadmus-refs-dbpedia-lookup`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.0.

This library provides a DBPedia lookup service for Cadmus. DBPedia is a project that extracts structured information from Wikipedia and makes it available on the Web.

## Keyword Lookup

Essential types from DBPedia ontology:

- person: <http://dbpedia.org/ontology/Person>
- place: <http://dbpedia.org/ontology/Place>
- organisation: <http://dbpedia.org/ontology/Organisation>

Main properties:

- `docs` (array):
  - `resource`: array with (usually a single?) DBPedia URI.
  - `label`: array with (usually a single?) string.
  - `type`: array with DBPedia ontology types (you can use `typeName` to get their user friendly names, which are just the last token in the corresponding type URI).
  - `category`: array with DBPedia category URIs.
  - `comment`: array with comment.

Note that all the values may include `<B></B>` for bold, and presumably also `<I>` and `<U>`.

## SPARQL

DBpedia returns results in the standard W3C SPARQL 1.1 JSON format. This is not DBpedia‑specific — it’s the same structure you get from any SPARQL endpoint.

SPARQL query result skeleton:

```json
{
  "head": {
    "link": [],
    "vars": ["var1", "var2"]
  },
  "results": {
    "distinct": false,
    "ordered": true,
    "bindings": [
      {
        "var1": {
          "type": "uri",
          "value": "http://dbpedia.org/resource/Example"
        },
        "var2": {
          "type": "literal",
          "datatype": "http://www.w3.org/2001/XMLSchema#string",
          "value": "Example value"
        }
      },
      // More results...
    ]
  }
}
```

Every binding has:

- `type`: `uri | literal | bnode`
- `value`: the actual string value
- optional:
  - `datatype` (for typed literals)
  - `xml:lang` (for language‑tagged strings)

In this schema:

- head contains metadata about the response.
- vars is a list of variable names used in the SPARQL query.
- results contains the actual query results.
- bindings is an array of result objects, each representing a single result.

Each result object contains properties for each variable in vars. The value of each property is another object that describes the value of the variable in the result. This object includes:

- type: The type of the value (uri, literal, or bnode).
- value: The actual value.
- datatype (optional): The datatype of the value. This property is only present for typed literals.

Example:

```json
{
  "head": { "link": [], "vars": ["entity", "name"] },
  "results": {
    "distinct": false,
    "ordered": true,
    "bindings": [
      {
        "entity": {
          "type": "uri",
          "value": "http://dbpedia.org/resource/Amicus_Plato,_sed_magis_amica_veritas"
        },
        "name": {
          "type": "literal",
          "xml:lang": "en",
          "value": "Amicus Plato, sed magis amica veritas"
        }
      },
      {
        "entity": {
          "type": "uri",
          "value": "http://dbpedia.org/resource/List_of_ancient_Platonists"
        },
        "name": {
          "type": "literal",
          "xml:lang": "en",
          "value": "List of ancient Platonists"
        }
      },
      {
        "entity": {
          "type": "uri",
          "value": "http://dbpedia.org/resource/Denis_Platonov"
        },
        "name": {
          "type": "literal",
          "xml:lang": "en",
          "value": "Denis Platonov"
        }
      },
      {
        "entity": {
          "type": "uri",
          "value": "http://dbpedia.org/resource/Alina_Platon"
        },
        "name": { "type": "literal", "xml:lang": "en", "value": "Alina Platon" }
      },
      {
        "entity": {
          "type": "uri",
          "value": "http://dbpedia.org/resource/Ann_Plato"
        },
        "name": { "type": "literal", "xml:lang": "en", "value": "Ann Plato" }
      },
      {
        "entity": {
          "type": "uri",
          "value": "http://dbpedia.org/resource/John_Smith_(Platonist)"
        },
        "name": {
          "type": "literal",
          "xml:lang": "en",
          "value": "John Smith (Platonist)"
        }
      },
      {
        "entity": {
          "type": "uri",
          "value": "http://dbpedia.org/resource/Pavel_Platonaw"
        },
        "name": {
          "type": "literal",
          "xml:lang": "en",
          "value": "Pavel Platonaw"
        }
      },
      {
        "entity": {
          "type": "uri",
          "value": "http://dbpedia.org/resource/Republic_(Plato)"
        },
        "name": {
          "type": "literal",
          "xml:lang": "en",
          "value": "Republic (Plato)"
        }
      },
      {
        "entity": {
          "type": "uri",
          "value": "http://dbpedia.org/resource/Valentyn_Platonov"
        },
        "name": {
          "type": "literal",
          "xml:lang": "en",
          "value": "Valentyn Platonov"
        }
      },
      {
        "entity": {
          "type": "uri",
          "value": "http://dbpedia.org/resource/Veaceslav_Platon"
        },
        "name": {
          "type": "literal",
          "xml:lang": "en",
          "value": "Veaceslav Platon"
        }
      }
    ]
  }
}
```
