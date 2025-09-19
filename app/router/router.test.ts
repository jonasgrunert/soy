import { assertEquals } from "@std/assert/equals";
import { ResolvedConfig } from "../config/config.ts";
import { controller } from "../controller/controller.ts";
import { Err, Ok, RestError } from "../utils/result.ts";
import { createRouter } from "./router.ts";

const controllerMock: typeof controller = {
  listStates: () => Promise.resolve(Ok([])),
  getState: () => Promise.resolve(Ok(ReadableStream.from([]))),
  writeState: () => Promise.resolve(Ok(undefined)),
  deleteState: () => Promise.resolve(Ok(undefined)),
  applyLock: () => Promise.resolve(Ok(undefined)),
  removeLock: () => Promise.resolve(Ok(undefined)),
};

const config: ResolvedConfig = {
  server: {
    port: 80,
  },
  auth: {
    basic: {
      username: "username",
      password: "password",
    },
  },
  storage: {
    type: "file",
    opts: { dir: "/state" },
  },
};

const restError = new RestError(500, "Message");
const headers = {
  Authorization: `Basic ${
    btoa(config.auth.basic.username + ":" + config.auth.basic.password)
  }`,
};

Deno.test("Router GET /state - Fails", async () => {
  const router = createRouter({
    ...controllerMock,
    getState: () => Promise.resolve(Err(restError)),
  }, config);
  const req = new Request("https://test.com/state", {
    headers,
  });
  const res = await router(req);
  assertEquals(res.status, 500);
  assertEquals(await res.text(), restError.message);
});

Deno.test("Router GET /state - Success", async () => {
  const readble = ReadableStream.from([]);
  const router = createRouter({
    ...controllerMock,
    getState: () => Promise.resolve(Ok(readble)),
  }, config);
  const req = new Request("https://test.com/state", {
    headers,
  });
  const res = await router(req);
  assertEquals(res.status, 200);
  assertEquals(res.body, readble);
  assertEquals(res.headers.get("Content-Type"), "application/json");
});

Deno.test("Router POST /state - Fails no body", async () => {
  const router = createRouter({
    ...controllerMock,
  }, config);
  const req = new Request("https://test.com/state", {
    headers,
    method: "POST",
  });
  const res = await router(req);
  assertEquals(res.status, 400);
});

Deno.test("Router POST /state - Fails", async () => {
  const router = createRouter({
    ...controllerMock,
    writeState: () => Promise.resolve(Err(restError)),
  }, config);
  const req = new Request("https://test.com/state", {
    headers,
    method: "POST",
    body: "",
  });
  const res = await router(req);
  assertEquals(res.status, 500);
  assertEquals(await res.text(), restError.message);
});

Deno.test("Router POST /state - Succeeds", async () => {
  const router = createRouter({
    ...controllerMock,
    writeState: () => Promise.resolve(Ok(undefined)),
  }, config);
  const req = new Request("https://test.com/state", {
    headers,
    method: "POST",
    body: "",
  });
  const res = await router(req);
  assertEquals(res.status, 200);
});

Deno.test("Router DELETE /state - Fails", async () => {
  const router = createRouter({
    ...controllerMock,
    deleteState: () => Promise.resolve(Err(restError)),
  }, config);
  const req = new Request("https://test.com/state", {
    headers,
    method: "DELETE",
  });
  const res = await router(req);
  assertEquals(res.status, 500);
  assertEquals(await res.text(), restError.message);
});

Deno.test("Router DELETE /state - Success", async () => {
  const router = createRouter({
    ...controllerMock,
    deleteState: () => Promise.resolve(Ok(undefined)),
  }, config);
  const req = new Request("https://test.com/state", {
    headers,
    method: "DELETE",
  });
  const res = await router(req);
  assertEquals(res.status, 200);
});

Deno.test("Router PUT /lock - Fails no body", async () => {
  const router = createRouter({
    ...controllerMock,
    applyLock: () => Promise.resolve(Err(restError)),
  }, config);
  const req = new Request("https://test.com/lock", {
    headers,
    method: "PUT",
  });
  const res = await router(req);
  assertEquals(res.status, 400);
});

Deno.test("Router PUT /lock - Fails lock Id not provided", async () => {
  const router = createRouter({
    ...controllerMock,
    applyLock: () => Promise.resolve(Err(restError)),
  }, config);
  const req = new Request("https://test.com/lock", {
    headers,
    method: "PUT",
    body: JSON.stringify({}),
  });
  const res = await router(req);
  assertEquals(res.status, 400);
});

Deno.test("Router PUT /lock - Fails", async () => {
  const router = createRouter({
    ...controllerMock,
    applyLock: () => Promise.resolve(Err(restError)),
  }, config);
  const req = new Request("https://test.com/lock", {
    headers,
    method: "PUT",
    body: JSON.stringify({
      ID: "hello",
    }),
  });
  const res = await router(req);
  assertEquals(res.status, 500);
  assertEquals(await res.text(), restError.message);
});

Deno.test("Router PUT /lock - Success", async () => {
  const router = createRouter({
    ...controllerMock,
    applyLock: () => Promise.resolve(Ok(undefined)),
  }, config);
  const req = new Request("https://test.com/lock", {
    headers,
    method: "PUT",
    body: JSON.stringify({
      ID: "hello",
    }),
  });
  const res = await router(req);
  assertEquals(res.status, 200);
});

Deno.test("Router DELETE /lock - No body", async () => {
  const router = createRouter({
    ...controllerMock,
    removeLock: () => Promise.resolve(Err(restError)),
  }, config);
  const req = new Request("https://test.com/lock", {
    headers,
    method: "DELETE",
  });
  const res = await router(req);
  assertEquals(res.status, 400);
});

Deno.test("Router DELETE /lock - Fails lock Id not provided", async () => {
  const router = createRouter({
    ...controllerMock,
    removeLock: () => Promise.resolve(Err(restError)),
  }, config);
  const req = new Request("https://test.com/lock", {
    headers,
    method: "DELETE",
    body: JSON.stringify({}),
  });
  const res = await router(req);
  assertEquals(res.status, 400);
});

Deno.test("Router DELETE /lock - Fails", async () => {
  const router = createRouter({
    ...controllerMock,
    removeLock: () => Promise.resolve(Err(restError)),
  }, config);
  const req = new Request("https://test.com/lock", {
    headers,
    method: "DELETE",
    body: JSON.stringify({
      ID: "hello",
    }),
  });
  const res = await router(req);
  assertEquals(res.status, 500);
  assertEquals(await res.text(), restError.message);
});

Deno.test("Router DELETE /lock - Success", async () => {
  const router = createRouter({
    ...controllerMock,
    removeLock: () => Promise.resolve(Ok(undefined)),
  }, config);
  const req = new Request("https://test.com/lock", {
    headers,
    method: "DELETE",
    body: JSON.stringify({
      ID: "hello",
    }),
  });
  const res = await router(req);
  assertEquals(res.status, 200);
});

Deno.test("Router GET /list - Fails", async () => {
  const router = createRouter({
    ...controllerMock,
    listStates: () => Promise.resolve(Err(restError)),
  }, config);
  const req = new Request("https://test.com/list", {
    headers,
  });
  const res = await router(req);
  assertEquals(res.status, 500);
  assertEquals(await res.text(), restError.message);
});

Deno.test("Router GET /list - Success", async () => {
  const states = [{ key: "v1" }];
  const router = createRouter({
    ...controllerMock,
    listStates: () => Promise.resolve(Ok(states)),
  }, config);
  const url = "https://test.com/list";
  const req = new Request(url, {
    headers,
  });
  const res = await router(req);
  assertEquals(res.status, 200);
  assertEquals(
    await res.json(),
    states.map((s) => ({
      url: url.replace("/list", "/state") + "?version=" + s.key,
      key: s.key,
    })),
  );
  assertEquals(res.headers.get("Content-Type"), "application/json");
});
