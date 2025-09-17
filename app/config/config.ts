export type ResolvedConfig = {
  server: {
    port: number;
  };
  auth: {
    basic: {
      username: string;
      password: string;
    };
  };
  storage: {
    type: "file";
    opts: {
      dir: string;
    };
  };
};

async function readConfig(
  key: string,
  fromFile = false,
  def?: string,
): Promise<string> {
  const fromEnv = Deno.env.get(key);
  if (fromEnv) return Promise.resolve(fromEnv);
  const path = Deno.env.get(key + "_FILE");
  if (fromFile && path) {
    try {
      return await Deno.readTextFile(path);
    } catch (err) {
      console.error(`Unable to read from file ${path} due to ${err}`);
    }
  }
  if (def !== undefined) return Promise.resolve(def);
  throw new Error(
    `Unable to read configuration from env ${key} ${
      fromFile ? `and file ${path}` : ""
    } and no default is set.`,
  );
}

// this can overall be improved for more adaptability.
export async function fillConfig(): Promise<ResolvedConfig> {
  const [port, username, password, storageType, storageDir] = await Promise.all(
    [
      readConfig("PORT", false, "80"),
      readConfig("USERNAME", true),
      readConfig("PASSWORD", true),
      readConfig("STORAGE", false, "file"),
      readConfig("STATEDIR", false, "/state"),
    ],
  );
  if (storageType !== "file") {
    throw new Error(
      `Unable to use storage type "${storageType}". Possible values: "file"`,
    );
  }
  return {
    server: { port: Number.parseInt(port) },
    auth: {
      basic: {
        username,
        password,
      },
    },
    storage: {
      type: storageType,
      opts: {
        dir: storageDir,
      },
    },
  };
}
