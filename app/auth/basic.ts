function createAuthInvalidResponse(message: string) {
  console.error(message);
  return new Response(message, {
    status: 401,
    headers: {
      "WWW-Authenticate": "Basic",
    },
  });
}

export function verifyAuth(
  confUser: string,
  confPassword: string,
): (
  req: Request,
  _: unknown,
  next: () => Promise<Response>,
) => Promise<Response> {
  return async (req, _, next) => {
    const headerName = "Authorization";
    const header = req.headers.get(headerName);
    if (header === null) {
      return createAuthInvalidResponse(`${headerName} header is not present`);
    }
    if (!header.startsWith("Basic ")) {
      return createAuthInvalidResponse(
        `${headerName} header not starting with Basic. Only Basic authentication is uspported`,
      );
    }
    const [username, password] = atob(header.replace("Basic ", "")).split(":");
    if (username === undefined || password === undefined) {
      return createAuthInvalidResponse(
        `Unable to parse Basic ${headerName} header`,
      );
    }
    if (confUser !== username || confPassword !== password) {
      return createAuthInvalidResponse("Username and/or Password do not match");
    }
    return await next();
  };
}
