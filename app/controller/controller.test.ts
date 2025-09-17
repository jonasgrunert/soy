import { assertEquals } from "@std/assert";
import { StateStorage } from "../storage/storage.ts";
import { controller } from "./controller.ts";
import { ERROR, SUCCESS } from "../utils/result.ts";

const storageMock: StateStorage = {
  list: () => Promise.resolve([]),
  get: () => Promise.resolve(ReadableStream.from([])),
  set: () => Promise.resolve(),
  delete: () => Promise.resolve(),
  getLock: () => Promise.resolve(null),
  lock: () => Promise.resolve(),
  unlock: () => Promise.resolve(),
};

Deno.test("Controller List states - Success", async () => {
  const result = await controller.listStates(storageMock);
  assertEquals(result.result, SUCCESS);
  // @ts-expect-error unable to assert
  assertEquals(result.value.length, 0);
});

Deno.test("Controller List states - Fails", async () => {
  const result = await controller.listStates({
    ...storageMock,
    list: () => Promise.reject(),
  });
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 500);
});

Deno.test("Controller Get state version - Not existent", async () => {
  const result = await controller.getState({
    ...storageMock,
    get: () => Promise.reject(new Deno.errors.NotFound("Unable to find file")),
  }, "state");
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 404);
});

Deno.test("Controller Get state version - Failed reading", async () => {
  const result = await controller.getState({
    ...storageMock,
    get: () => Promise.reject(new Error()),
  }, "state");
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 500);
});

Deno.test("Controller Get state version - Success", async () => {
  const stream = ReadableStream.from([]);
  const result = await controller.getState({
    ...storageMock,
    get: () => Promise.resolve(stream),
  }, "state");
  assertEquals(result.result, SUCCESS);
  // @ts-expect-error unable to assert
  assertEquals(result.value, stream);
});

Deno.test("Controller Get latest version - Not existent", async () => {
  const result = await controller.getState({
    ...storageMock,
    list: () => Promise.resolve([]),
  });
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 404);
});

Deno.test("Controller Get latest version - Failed listing", async () => {
  const result = await controller.getState({
    ...storageMock,
    list: () => Promise.reject(new Error()),
  });
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 500);
});

Deno.test("Controller Get latest version - Success", async () => {
  const key = "5";
  const result = await controller.getState({
    ...storageMock,
    get: (key) =>
      Promise.resolve(ReadableStream.from([new TextEncoder().encode(key)])),
    list: () => Promise.resolve([{ key: "3" }, { key: "1" }, { key }]),
  });
  assertEquals(result.result, SUCCESS);
  let s = "";
  const textDecoder = new TextDecoder();
  // @ts-expect-error unable to assert
  for await (const d of result.value) {
    s += textDecoder.decode(d);
  }
  assertEquals(s, key);
});

Deno.test("Conrtoller Write State - Unable to get lock", async () => {
  const result = await controller.writeState({
    ...storageMock,
    getLock: () => Promise.reject(),
  }, ReadableStream.from([]));
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 500);
});

Deno.test("Controller Write State - Wrong lock", async () => {
  const lockId = "different";
  const result = await controller.writeState(
    {
      ...storageMock,
      getLock: () => Promise.resolve(lockId),
    },
    ReadableStream.from([]),
    "lock",
  );
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 423);
  // @ts-expect-error unable to assert
  assertEquals(result.error.message, lockId);
});

Deno.test("Controller Write State - No lock pased", async () => {
  const lockId = "different";
  const result = await controller.writeState(
    {
      ...storageMock,
      getLock: () => Promise.resolve(lockId),
    },
    ReadableStream.from([]),
  );
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 423);
  // @ts-expect-error unable to assert
  assertEquals(result.error.message, lockId);
});

Deno.test("Controller Write State - Error getting latest state", async () => {
  const result = await controller.writeState(
    {
      ...storageMock,
      list: () => Promise.reject(),
    },
    ReadableStream.from([]),
  );
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 500);
});

Deno.test("Controller Write State - Latest state non numeric", async () => {
  const result = await controller.writeState(
    {
      ...storageMock,
      list: () => Promise.resolve([{ key: "hello" }]),
    },
    ReadableStream.from([]),
  );
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 500);
});

Deno.test("Controller Write State - Writing fails", async () => {
  const result = await controller.writeState({
    ...storageMock,
    set: () => Promise.reject(),
  }, ReadableStream.from([]));
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 500);
});

Deno.test("Controller Write State - No State No Lock", async () => {
  const result = await controller.writeState({
    ...storageMock,
  }, ReadableStream.from([]));
  assertEquals(result.result, SUCCESS);
});

Deno.test("Controller Write State - One State No Lock", async () => {
  const lockId = "lock";
  const result = await controller.writeState(
    {
      ...storageMock,
      list: () => Promise.resolve([{ key: "1" }]),
    },
    ReadableStream.from([]),
    lockId,
  );
  assertEquals(result.result, SUCCESS);
});

Deno.test("Controller Write State - No State Lock", async () => {
  const lockId = "lock";
  const result = await controller.writeState(
    {
      ...storageMock,
      getLock: () => Promise.resolve(lockId),
    },
    ReadableStream.from([]),
    lockId,
  );
  assertEquals(result.result, SUCCESS);
});

Deno.test("Controller Write State - One State Lock", async () => {
  const lockId = "lock";
  const result = await controller.writeState(
    {
      ...storageMock,
      list: () => Promise.resolve([{ key: "1" }]),
      getLock: () => Promise.resolve(lockId),
    },
    ReadableStream.from([]),
    lockId,
  );
  assertEquals(result.result, SUCCESS);
});

Deno.test("Conrtoller Delete State - Unable to get lock", async () => {
  const result = await controller.deleteState({
    ...storageMock,
    getLock: () => Promise.reject(),
  });
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 500);
});

Deno.test("Controller Delete State - Wrong lock", async () => {
  const lockId = "different";
  const result = await controller.deleteState(
    {
      ...storageMock,
      getLock: () => Promise.resolve(lockId),
    },
    "lock",
  );
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 423);
  // @ts-expect-error unable to assert
  assertEquals(result.error.message, lockId);
});

Deno.test("Controller Delete State - No lock pased", async () => {
  const lockId = "different";
  const result = await controller.deleteState(
    {
      ...storageMock,
      getLock: () => Promise.resolve(lockId),
    },
  );
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 423);
  // @ts-expect-error unable to assert
  assertEquals(result.error.message, lockId);
});

Deno.test("Controller Delete State - Fails deleting", async () => {
  const result = await controller.deleteState(
    {
      ...storageMock,
      delete: () => Promise.reject(),
    },
  );
  assertEquals(result.result, ERROR);
});

Deno.test("Contoller Delete State - No Lock", async () => {
  const result = await controller.deleteState({
    ...storageMock,
  });
  assertEquals(result.result, SUCCESS);
});

Deno.test("Controller Delete State - Lock", async () => {
  const lockId = "lock";
  const result = await controller.deleteState(
    {
      ...storageMock,
      getLock: () => Promise.resolve(lockId),
    },
    lockId,
  );
  assertEquals(result.result, SUCCESS);
});

Deno.test("Conrtoller Lock - Unable to get lock", async () => {
  const result = await controller.applyLock({
    ...storageMock,
    getLock: () => Promise.reject(),
  }, "lock");
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 500);
});

Deno.test("Controller Lock - Lock already applied", async () => {
  const lockId = "different";
  const result = await controller.applyLock(
    {
      ...storageMock,
      getLock: () => Promise.resolve(lockId),
    },
    "lock",
  );
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 423);
  // @ts-expect-error unable to assert
  assertEquals(result.error.message, lockId);
});

Deno.test("Controller Lock - Locking fails", async () => {
  const result = await controller.applyLock(
    {
      ...storageMock,
      lock: () => Promise.reject(),
    },
    "lock",
  );
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 500);
});

Deno.test("Controller Lock - Locking succeeds", async () => {
  const result = await controller.applyLock(
    {
      ...storageMock,
    },
    "lock",
  );
  assertEquals(result.result, SUCCESS);
});

Deno.test("Conrtoller Unlock - Unable to get lock", async () => {
  const result = await controller.removeLock({
    ...storageMock,
    getLock: () => Promise.reject(),
  }, "lock");
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 500);
});

Deno.test("Controller Unlock - Wrong lock trying to unlock", async () => {
  const lockId = "different";
  const result = await controller.removeLock(
    {
      ...storageMock,
      getLock: () => Promise.resolve(lockId),
    },
    "lock",
  );
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 423);
  // @ts-expect-error unable to assert
  assertEquals(result.error.message, lockId);
});

Deno.test("Controller Unlock - Unlocking fails", async () => {
  const result = await controller.removeLock(
    {
      ...storageMock,
      unlock: () => Promise.reject(),
    },
    "lock",
  );
  assertEquals(result.result, ERROR);
  // @ts-expect-error unable to assert
  assertEquals(result.error.status, 500);
});

Deno.test("Controller Unlock - Unlocking succeeds", async () => {
  const result = await controller.applyLock(
    {
      ...storageMock,
    },
    "lock",
  );
  assertEquals(result.result, SUCCESS);
});
