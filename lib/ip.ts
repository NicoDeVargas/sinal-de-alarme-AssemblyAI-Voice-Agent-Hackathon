import "server-only";
import { createHash } from "node:crypto";

export function hashIp(request: Request) {
  if (!process.env.IP_SALT) throw new Error("IP_SALT não definido");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return createHash("sha256").update(ip + process.env.IP_SALT).digest("hex");
}
