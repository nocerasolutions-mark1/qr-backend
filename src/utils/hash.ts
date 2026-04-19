import crypto from "crypto";

export function hashIp(ip?: string): string | undefined {
  if (!ip) return undefined;
  return crypto.createHash("sha256").update(ip).digest("hex");
}
