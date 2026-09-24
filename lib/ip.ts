import "server-only";
import { createHash } from "node:crypto";

export function hashIp(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return createHash("sha256").update(ip + process.env.IP_SALT).digest("hex");
}
