# CLI Contract

All commands return JSON on stdout.

## Result envelope

```json
{
  "success": true,
  "data": {}
}
```

Errors:

```json
{
  "success": false,
  "error": {
    "message": "Readable error message"
  }
}
```

## Create page

```bash
cat payload.json | hubspot-page-builder create-page --input -
```

```json
{
  "name": "AI Webinar Landing Page",
  "slug": "ai-webinar",
  "templatePath": "@hubspot/elevate/templates/blank.hubl.html",
  "htmlContent": "<main><h1>Join our webinar</h1></main>",
  "htmlTitle": "AI Webinar",
  "metaDescription": "Register for our AI webinar"
}
```

## Update page

```bash
cat payload.json | hubspot-page-builder update-page --input -
```

```json
{
  "pageId": "123",
  "htmlContent": "<main><h1>Updated content</h1></main>",
  "metaDescription": "Updated description"
}
```

You can also update by HubSpot editor URL instead of `pageId`:

```json
{
  "pageUrl": "https://app-na2.hubspot.com/pages/245654093/editor/327615359711/content",
  "htmlContent": "<main><h1>Updated content</h1></main>",
  "metaDescription": "Updated description"
}
```

## Read-only examples

```bash
hubspot-page-builder list-templates
hubspot-page-builder list-pages --status draft --limit 10
hubspot-page-builder get-page --page-id 123
hubspot-page-builder get-page --page-url "https://app-na2.hubspot.com/pages/245654093/editor/327615359711/content"
hubspot-page-builder preview-url --page-id 123
hubspot-page-builder publish-page --page-id 123
```

## Template defaults

The create flow uses this precedence for template selection:

1. `templatePath` in the create payload
2. `--default-template-path` or stored `defaultTemplatePath`
3. built-in fallback `@hubspot/elevate/templates/blank.hubl.html`

## Raw HTML safety boundary

Raw HTML body creation and replacement is only supported for the verified blank landing page template:

`@hubspot/elevate/templates/blank.hubl.html`

Scaffolded Elevate templates should be treated as unsupported for body replacement until template-native field editing is implemented.
