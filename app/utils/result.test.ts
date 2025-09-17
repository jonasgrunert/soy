import { assertEquals } from "@std/assert";
import { Err, ERROR, Ok, RestError, SUCCESS } from "./result.ts";

Deno.test("Utils Result - Ok", () => {
  const ok = Ok(null);
  assertEquals(ok.result, SUCCESS);
  assertEquals(ok.value, null);
});

Deno.test("Utils Result - Err", () => {
  const err = new Error();
  const ok = Err(err);
  assertEquals(ok.result, ERROR);
  assertEquals(ok.error, err);
});

Deno.test("Util RestError", () => {
  const err = new Error("");
  const rest = new RestError(500, "HTTP error", { cause: err });
  assertEquals(rest.status, 500);
  assertEquals(rest.message, "HTTP error");
  assertEquals(rest.cause, err);
});
