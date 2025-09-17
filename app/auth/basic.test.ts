import { assertEquals, assertInstanceOf } from "@std/assert";
import { verifyAuth } from "./basic.ts";

const username = "User";
const password = "Password";
const headers: { description: string; header: undefined | string }[] = [
  { description: "No header", header: undefined },
  { description: "Wrong method", header: "Bearer" },
  { description: "Unable to parse", header: "basic hello&" },
  { description: "Not required format", header: `Basic ${btoa("uasdh")}` },
  {
    description: "Wrong password",
    header: `Basic ${btoa(username + ":" + "wrong")}`,
  },
  {
    description: "Worng username",
    header: `Basic ${btoa("wrong" + ":" + password)}`,
  },
];

const authenticate = verifyAuth(username, password);

headers.forEach((h) => {
  Deno.test(`Auth fails ${h.description}`, async () => {
    const res = await authenticate(
      new Request(
        "https://test.test",
        h.header
          ? {
            headers: {
              Authorization: h.header,
            },
          }
          : {},
      ),
      {},
      () => Promise.resolve(new Response()),
    );
    assertInstanceOf(res, Response);
    assertEquals(res.status, 401);
  });
});

Deno.test("Auth succeeds", async () => {
  const res = await authenticate(
    new Request("https://test.test", {
      headers: {
        Authorization: `Basic ${btoa(username + ":" + password)}`,
      },
    }),
    {},
    () => Promise.resolve(new Response()),
  );
  assertEquals(res.status, 200);
});
