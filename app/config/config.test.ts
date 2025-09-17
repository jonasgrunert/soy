import { assertEquals } from "@std/assert/equals";
import { fillConfig } from "./config.ts";
import { assertRejects } from "@std/assert";

Deno.test("Config filling", async () => {
  const username = "username";
  const password = "password";
  const USERNAME_FILE = "USERNAME_FILE";
  const PASSWORD_FILE = "PASSWORD_FILE";
  const PORT = "PORT";
  // act
  const usernameFile = await Deno.makeTempFile();
  const passwordFile = await Deno.makeTempFile();
  Deno.env.set(USERNAME_FILE, usernameFile);
  Deno.env.set(PASSWORD_FILE, passwordFile);
  Deno.env.set(PORT, "80");
  try {
    await Deno.writeTextFile(usernameFile, username);
    await Deno.writeTextFile(passwordFile, password);
    // assert
    const c = await fillConfig();
    assertEquals(c.server.port, 80);
    assertEquals(c.auth.basic.password, password);
    assertEquals(c.auth.basic.username, username);
    assertEquals(c.storage.type, "file");
  } finally {
    [USERNAME_FILE, PASSWORD_FILE, PORT].map(Deno.env.delete);
    await Promise.all([usernameFile, passwordFile].map((f) => Deno.remove(f)));
  }
});

Deno.test("Config filling - missing username", () => {
  assertRejects(() => fillConfig());
});

Deno.test("Config filling - wrong storage type", async () => {
  const USERNAME = "USERNAME";
  const PASSWORD = "PASSWORD";
  const STORAGE = "STORAGE";
  Deno.env.set(PASSWORD, "password");
  Deno.env.set(USERNAME, "user");
  Deno.env.set(STORAGE, "wrong");
  try {
    await assertRejects(() => fillConfig());
  } finally {
    [USERNAME, PASSWORD, STORAGE].map((f) => Deno.env.delete(f));
  }
});

Deno.test("Config filling - File not readable", async () => {
  const USERNAME = "USERNAME_FILE";
  const PASSWORD = "PASSWORD";
  Deno.env.set(PASSWORD, "password");
  Deno.env.set(USERNAME, "Notexisting file");
  try {
    await assertRejects(() => fillConfig());
  } finally {
    [USERNAME, PASSWORD].map((f) => Deno.env.delete(f));
  }
});
