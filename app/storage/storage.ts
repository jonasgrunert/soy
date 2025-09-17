import { fileStorage } from "./file.ts";

export type StorageProvider<
  O extends Record<string, string> = Record<string, string>,
> = (
  options: O,
) => Promise<{
  list: () => Promise<{ key: string }[]>;
  get: (key: string) => Promise<ReadableStream>;
  set: (key: string, value: ReadableStream) => Promise<void>;
  delete: () => Promise<void>;
  getLock: () => Promise<string | null>;
  lock: (lockId: string) => Promise<void>;
  unlock: () => Promise<void>;
}>;
export type StateStorage = Awaited<ReturnType<StorageProvider>>;

export const storages = { "file": fileStorage } as const;
