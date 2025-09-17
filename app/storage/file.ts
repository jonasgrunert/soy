import { join } from "@std/path";
import { StorageProvider } from "./storage.ts";

function keyToFilename(key: string) {
  return `${key}_state.json`;
}
const fileNameMatcher = /^(.*)_state\.json$/;

async function listStates(dir: string): Promise<{ key: string }[]> {
  const files: { key: string }[] = [];
  for await (const file of Deno.readDir(dir)) {
    if (file.isFile) {
      const result = fileNameMatcher.exec(file.name);
      if (result !== null) {
        files.push({ key: result[1] });
      }
    }
  }
  return files;
}

async function getState(dir: string, key: string) {
  try {
    const f = await Deno.open(join(dir, keyToFilename(key)));
    return f.readable;
  } catch (err) {
    throw new Error("Unable to find state version " + key, { cause: err });
  }
}

async function writeState(
  dir: string,
  key: string,
  content: ReadableStream,
) {
  const f = await Deno.open(join(dir, keyToFilename(key)), {
    createNew: true,
    write: true,
  });
  return content.pipeTo(f.writable);
}

async function deleteState(dir: string) {
  await Deno.remove(dir, { recursive: true });
  return Deno.mkdir(dir);
}

const lockFilePath = (path: string) => join(path, ".lock");

async function getLock(path: string): Promise<null | string> {
  const lockFile = lockFilePath(path);
  const locked = await Deno.readTextFile(lockFile).catch(() => "");
  return locked !== "" ? locked : null;
}

function applyLock(path: string, lockId: string) {
  const lockFile = lockFilePath(path);
  return Deno.writeTextFile(lockFile, lockId);
}

function unlockState(
  dir: string,
) {
  return Deno.remove(lockFilePath(dir));
}

export const fileStorage: StorageProvider<{ dir: string }> = (
  opts: { dir: string },
) =>
  Promise.resolve({
    list: () => listStates(opts.dir),
    get: (key) => getState(opts.dir, key),
    set: (key, value) => writeState(opts.dir, key, value),
    delete: () => deleteState(opts.dir),
    getLock: () => getLock(opts.dir),
    lock: (lockId) => applyLock(opts.dir, lockId),
    unlock: () => unlockState(opts.dir),
  });
