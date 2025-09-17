import { StateStorage } from "../storage/storage.ts";
import { Err, ERROR, Ok, RestError, Result } from "../utils/result.ts";

async function getLatestState(
  storage: StateStorage,
): Promise<Result<string | null, RestError>> {
  const versions = await listStates(storage);
  if (versions.result === ERROR) return versions;
  if (versions.value.length === 0) {
    return Ok(null);
  }
  const latestState =
    versions.value.reduce((p, c) =>
      Number.parseInt(p.key) < Number.parseInt(c.key) ? c : p
    ).key;
  return Ok(latestState);
}

function listStates(
  storage: StateStorage,
): Promise<Result<{ key: string }[], RestError>> {
  return storage.list()
    .then(Ok)
    .catch((err) =>
      Err(new RestError(500, "Unable to list states", { cause: err }))
    );
}

async function getState(
  storage: StateStorage,
  version?: string,
): Promise<Result<ReadableStream, RestError>> {
  if (version) {
    return storage.get(version).then(Ok).catch((err) => {
      if (err instanceof Deno.errors.NotFound) {
        return Err(
          new RestError(404, `State version ${version} not available`),
        );
      }
      return Err(
        new RestError(500, `State version ${version} cannot be read.`, {
          cause: err,
        }),
      );
    });
  }
  const latestState = await getLatestState(storage);
  if (latestState.result === ERROR) return latestState;
  if (latestState.value === null) {
    return Err(new RestError(404, `No states stored`));
  }
  return getState(storage, latestState.value);
}

async function checkLock(
  storage: StateStorage,
  lockId?: string,
): Promise<Result<string | null, RestError>> {
  const lock = await storage.getLock().then(Ok).catch((err) =>
    Err(new RestError(500, "Unable to get Lock", { cause: err }))
  );
  if (lock.result === ERROR) return lock;
  if (lock.value !== null && lock.value !== lockId) {
    return Err(new RestError(423, lock.value));
  }
  return lock;
}

async function writeState(
  storage: StateStorage,
  content: ReadableStream,
  lockId?: string,
): Promise<Result<void, RestError>> {
  const lock = await checkLock(storage, lockId);
  if (lock.result === ERROR) return lock;
  const latestState = await getLatestState(storage);
  if (latestState.result === ERROR) return latestState;
  const nextState = Number.parseInt(latestState.value ?? "-1") + 1;
  if (Number.isNaN(nextState)) {
    return Err(new RestError(500, "Unable to compute next version name"));
  }
  return storage.set(nextState.toString(), content).then(Ok).catch((err) =>
    Err(new RestError(500, "Unable to write state", { cause: err }))
  );
}

async function deleteState(storage: StateStorage, lockId?: string) {
  const lock = await checkLock(storage, lockId);
  if (lock.result === ERROR) return lock;
  return storage.delete().then(Ok).catch((err) =>
    Err(new RestError(500, "Unable to delete state", { cause: err }))
  );
}

async function applyLock(storage: StateStorage, lockId: string) {
  const lock = await checkLock(storage, lockId);
  if (lock.result === "ERROR") return lock;
  return storage.lock(lockId).then(Ok).catch((err) =>
    Err(new RestError(500, "Unable to lock state", { cause: err }))
  );
}

async function removeLock(storage: StateStorage, lockId: string) {
  const lock = await checkLock(storage, lockId);
  if (lock.result === "ERROR") return lock;
  return storage.unlock().then(Ok).catch((err) =>
    Err(new RestError(500, "Unable to unlock state", { cause: err }))
  );
}

export const controller = {
  listStates,
  getState,
  writeState,
  deleteState,
  applyLock,
  removeLock,
};
