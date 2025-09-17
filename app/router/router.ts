import { Router } from "subrouter";
import { ResolvedConfig } from "../config/config.ts";
import { verifyAuth } from "../auth/basic.ts";
import { StateStorage, storages } from "../storage/storage.ts";
import { controller } from "../controller/controller.ts";

export function createRouter(cont: typeof controller, config: ResolvedConfig) {
  const router = new Router();
  router
    .use(verifyAuth(config.auth.basic.username, config.auth.basic.password))
    .use(async (_req, ctx, next) => {
      ctx.storage = await storages[config.storage.type](config.storage.opts);
      return next();
    })
    .all(
      "/state",
      async (req, ctx) => {
        const storage = ctx.storage as StateStorage;
        const params = new URL(req.url).searchParams;
        switch (req.method) {
          case "GET": {
            const state = await cont.getState(
              storage,
              params.get("version") ?? undefined,
            );
            if (state.result === "ERROR") {
              console.error(state.error);
              return new Response(state.error.message, {
                status: state.error.status,
              });
            }
            return new Response(state.value, {
              headers: {
                "Content-Type": "application/json",
              },
            });
          }
          case "POST": {
            if (req.body === null) {
              return new Response("No body provided", { status: 400 });
            }
            const state = await cont.writeState(
              storage,
              req.body,
              params.get("ID") ?? undefined,
            );
            if (state.result === "ERROR") {
              console.error(state.error);
              return new Response(state.error.message, {
                status: state.error.status,
              });
            }
            return new Response("Written");
          }
          case "DELETE": {
            const state = await cont.deleteState(
              storage,
              params.get("ID") ?? undefined,
            );
            if (state.result === "ERROR") {
              console.error(state.error);
              return new Response(state.error.message, {
                status: state.error.status,
              });
            }
            return new Response("Deleted");
          }
          default:
            return new Response("Unknown Method", { status: 405 });
        }
      },
      ["GET", "POST", "DELETE"],
    )
    .all(
      "/lock",
      async (req, ctx) => {
        const storage = ctx.storage as StateStorage;
        const body = await req.text();
        try {
          const { ID } = JSON.parse(body);
          if (typeof ID !== "string") {
            return new Response("Lock Id not provided", { status: 400 });
          }
          switch (req.method) {
            case "PUT": {
              const lock = await cont.applyLock(storage, ID);
              if (lock.result === "ERROR") {
                console.error(lock.error);
                return new Response(lock.error.message, {
                  status: lock.error.status,
                });
              }
              return new Response("Locked");
            }
            case "DELETE": {
              const lock = await cont.removeLock(storage, ID);
              if (lock.result === "ERROR") {
                console.error(lock.error);
                return new Response(lock.error.message, {
                  status: lock.error.status,
                });
              }
              return new Response("Unlocked");
            }
            default:
              return new Response("Unknown Method", { status: 405 });
          }
        } catch (err) {
          console.error("Unable to decipher body: " + body);
          console.error(err);
          return new Response("Unable to decipher body", { status: 400 });
        }
      },
      ["PUT", "DELETE"],
    )
    .get("/list", async (req, ctx) => {
      const storage = ctx.storage as StateStorage;
      const states = await cont.listStates(storage);
      if (states.result === "ERROR") {
        console.error(states.error);
        return new Response(states.error.message, {
          status: states.error.status,
        });
      }
      return new Response(
        JSON.stringify(states.value.map((v) => {
          const u = new URL(req.url);
          u.searchParams.set("version", v.key);
          return { key: v.key, url: u.toString() };
        })),
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    });
  return router.serve();
}
