import { resolveRuntimeConfig } from "../src/config.js";
import { HubspotApiClient } from "../src/hubspot/client.js";
import { createPageBuilder } from "../src/page-builder.js";

async function main() {
  const config = await resolveRuntimeConfig({
    flags: {},
  });
  const service = createPageBuilder({
    client: new HubspotApiClient({
      accessToken: config.accessToken,
    }),
    portalId: config.portalId,
  });

  const templates = await service.listTemplates();

  console.log(
    JSON.stringify(
      {
        success: true,
        data: {
          templatesFound: templates.length,
          sample: templates.slice(0, 3),
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      success: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    }),
  );
  process.exit(1);
});
