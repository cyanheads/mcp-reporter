# MCP Server Capabilities Report

Generated on: 2026-09-08T17:15:03.382Z

## Executive Summary

| Metric | Count |
| --- | --- |
| Configured servers | 1 |
| Connected servers | 1 |
| Failed connections | 0 |
| Tools | 1 |
| Direct Resources | 1 |
| Resource Templates | 1 |
| Prompts | 1 |

### Connected Servers Overview

| Server | Tools | Direct Resources | Resource Templates | Prompts |
| --- | --- | --- | --- | --- |
| catalog-demo | 1 | 1 | 1 | 1 |

Descriptors and annotations are server-reported hints, not verified safety or callability guarantees.

## Table of Contents

1. [catalog-demo](#server-1)

<a id="server-1"></a>

## catalog-demo

### Server Information

| Field | Value |
| --- | --- |
| Transport | Streamable HTTP (https://example.com; endpoint path omitted) |
| Implementation | catalog-server |
| Title | Catalog |
| Version | 1.0.0 |
| Protocol version | 2026-07-28 |
| Protocol era | modern |
| Connection time | 12ms |

#### Advertised capabilities

```json
{
  "tools": {},
  "resources": {},
  "prompts": {}
}
```

<details>
<summary>Server instructions</summary>

```json
"Search the catalog by name. Resource URIs identify catalog entries."
```


</details>

### Tools (1)

| Name | Title | Description |
| --- | --- | --- |
| catalog\_search | Search the catalog | Find catalog entries by name. |

<details>
<summary>catalog_search</summary>

#### Input Schema

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Name to find."
    }
  },
  "required": [
    "query"
  ]
}
```

#### Output Schema

```json
{
  "type": "object",
  "properties": {
    "names": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  }
}
```

#### Definition

```json
{
  "name": "catalog_search",
  "title": "Search the catalog",
  "description": "Find catalog entries by name.",
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

</details>

### Direct Resources (1)

| Name | Title | Description |
| --- | --- | --- |
| catalog-overview |  | Catalog summary. |

<details>
<summary>catalog-overview</summary>

#### Definition

```json
{
  "name": "catalog-overview",
  "uri": "catalog://overview",
  "description": "Catalog summary.",
  "mimeType": "text/plain"
}
```

</details>

### Resource Templates (1)

| Name | Title | Description |
| --- | --- | --- |
| catalog-entry |  |  |

<details>
<summary>catalog-entry</summary>

#### Definition

```json
{
  "name": "catalog-entry",
  "uriTemplate": "catalog://entries/{id}",
  "mimeType": "application/json"
}
```

</details>

### Prompts (1)

| Name | Title | Description |
| --- | --- | --- |
| compare-entries |  | Compare two catalog entries. |

<details>
<summary>compare-entries</summary>

#### Definition

```json
{
  "name": "compare-entries",
  "description": "Compare two catalog entries.",
  "arguments": [
    {
      "name": "first",
      "required": true
    },
    {
      "name": "second",
      "required": true
    }
  ]
}
```

</details>

