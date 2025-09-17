import { assertArrayIncludes, assertEquals, assertRejects } from "@std/assert";
import { fileStorage } from "../storage/file.ts";

async function readbleToString(r: ReadableStream): Promise<string> {
  let res = "";
  const decoder = new TextDecoder();
  for await (const d of r) {
    res += decoder.decode(d);
  }
  return res;
}

function stringToReadable(t: string): ReadableStream {
  const encoder = new TextEncoder();
  return ReadableStream.from([encoder.encode(t)]);
}

async function prepareDir() {
  const path = await Deno.makeTempDir();
  return {
    path,
    [Symbol.asyncDispose]: () => Deno.remove(path).catch((e) => e),
  };
}

Deno.test("File Storage state", async () => {
  await using tempDir = await prepareDir();
  const storage = await fileStorage({ dir: tempDir.path });
  // empty state
  let list = await storage.list();
  assertEquals(list.length, 0);
  // adding state
  const state0 = "hello";
  await storage.set("0", stringToReadable(state0));
  list = await storage.list();
  assertEquals(list.length, 1);
  assertArrayIncludes([{ key: "0" }], list);
  const stored0Stream = await storage.get("0");
  const stored0 = await readbleToString(stored0Stream);
  assertEquals(stored0, state0);
  // adding second state
  const state1 = "hello1";
  await storage.set("1", stringToReadable(state1));
  list = await storage.list();
  assertEquals(list.length, 2);
  assertArrayIncludes([{ key: "1" }, { key: "0" }], list);
  const stored1Stream = await storage.get("1");
  const stored1 = await readbleToString(stored1Stream);
  assertEquals(stored1, state1);
  const stored0aStream = await storage.get("0");
  const stored0a = await readbleToString(stored0aStream);
  assertEquals(stored0a, state0);
  // delete
  await storage.delete();
  list = await storage.list();
  assertEquals(list.length, 0);
  // getting nonexiting state
  assertRejects(() => storage.get("any"));
});

Deno.test("Files Storage lock", async () => {
  await using tempDir = await prepareDir();
  const storage = await fileStorage({ dir: tempDir.path });
  const lockId = "lock";
  // not locked
  let lock = await storage.getLock();
  assertEquals(lock, null);
  // locked
  await storage.lock(lockId);
  lock = await storage.getLock();
  assertEquals(lock, lockId);
  // unlocked
  await storage.unlock();
  lock = await storage.getLock();
  assertEquals(lock, null);
});
