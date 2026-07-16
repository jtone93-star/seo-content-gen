export function isDatabaseUnreachable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error ? String(error.code) : "";
  if (
    code === "P1001" ||
    code === "P1000" ||
    code === "P1017" ||
    code === "ECONNREFUSED"
  ) {
    return true;
  }

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";
  if (
    /ECONNREFUSED|Can't reach database server|DatabaseNotReachable/i.test(
      message,
    )
  ) {
    return true;
  }

  if ("cause" in error && error.cause) {
    return isDatabaseUnreachable(error.cause);
  }

  return false;
}
