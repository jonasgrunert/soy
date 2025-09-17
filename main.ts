import { fillConfig } from "./app/config/config.ts";
import { controller } from "./app/controller/controller.ts";
import { createRouter } from "./app/router/router.ts";

export async function start() {
  const config = await fillConfig();
  const router = createRouter(controller, config);

  const ac = new AbortController();
  await Deno.serve({ port: config.server.port, signal: ac.signal }, router);
  return ac;
}

if (import.meta.main) {
  await start();
}
