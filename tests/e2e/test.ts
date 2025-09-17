import { join } from "@std/path";
import { start } from "../../index.ts";
import { assertEquals } from "@std/assert/equals";

const client = Deno.createHttpClient({
  proxy: {
    transport: "unix",
    path: "/var/run/docker.sock",
  },
});

async function runDocker(dir: string, username: string, password: string) {
  const create = await fetch(
    "http://docker/containers/create?name=tofu." + dir,
    {
      client,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Image: "ghcr.io/opentofu/opentofu:latest",
        HostConfig: {
          Mounts: [
            {
              Target: "/tofu",
              Source: join(import.meta.dirname ?? "./", dir),
              Type: "bind",
            },
          ],
          ExtraHosts: ["host.docker.internal:host-gateway"],
        },
        Env: [`TF_HTTP_USERNAME=${username}`, `TF_HTTP_PASSWORD=${password}`],
        WorkingDir: "/tofu",
        EntryPoint: "/bin/ash",
        Cmd: ["-c", "tofu init && tofu apply -auto-approve"],
      }),
    },
  );
  if (!create.ok) {
    throw new Error("Unable to create container: " + await create.text());
  }
  const { Id } = await create.json();
  const start = await fetch(
    "http://docker/containers/" + Id + "/start",
    {
      client,
      method: "POST",
    },
  );
  if (!start.ok) {
    throw new Error("Unable to start container: " + await start.text());
  }
  const wait = await fetch(
    "http://docker/containers/" + Id + "/wait?condition=next-exit",
    {
      client,
      method: "POST",
    },
  );
  if (!wait.ok) {
    throw new Error("Unable to wait for container: " + await wait.text());
  }
  const { StatusCode } = await wait.json();
  const logs = await fetch(
    "http://docker/containers/" + Id + "/logs?stdout=true&stderr=true",
    {
      client,
    },
  );
  if (!logs.ok) {
    throw new Error("Unable to get logs for container: " + await logs.text());
  }
  await logs.body?.pipeTo(Deno.stdout.writable, { preventClose: true });
  const remove = await fetch(
    "http://docker/containers/" + Id + "?force=true",
    {
      client,
      method: "DELETE",
    },
  );
  if (!remove.ok) {
    throw new Error("Unable to remove container: " + await remove.text());
  }
  return StatusCode;
}

const username = "username";
const password = "password";

["lock", "simple"].map((d) =>
  Deno.test("E2E " + d, async () => {
    const dir = await Deno.makeTempDir();
    Deno.env.set("USERNAME", username);
    Deno.env.set("PASSWORD", password);
    Deno.env.set("STATEDIR", dir);
    Deno.env.set("PORT", "9000");
    const ac = await start();
    try {
      const code = await runDocker(d, username, password);
      assertEquals(code, 0);
    } finally {
      await Deno.remove(dir, { recursive: true });
      ac.abort();
    }
  })
);
