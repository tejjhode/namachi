import crypto from "crypto";

const SECRET =
  process.env.BROCHURE_SECRET_KEY ||
  (process.env.SUPABASE_SERVICE_ROLE_KEY || "nomichi-brochure-secret-2026").slice(0, 32);

/** Generate a signed token for a brochure URL (server-side only) */
export function generateBrochureToken(tripId: string, index: number): string {
  const expiry = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days
  const payload = `${tripId}:${index}:${expiry}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url").slice(0, 22);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

/** Verify a signed brochure token (server-side only) */
export function verifyBrochureToken(tripId: string, index: number, token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 4) return false;
    const [tId, idxStr, expiryStr, sig] = parts;
    if (tId !== tripId) return false;
    if (parseInt(idxStr, 10) !== index) return false;
    const expiry = parseInt(expiryStr, 10);
    if (Number.isNaN(expiry) || Math.floor(Date.now() / 1000) > expiry) return false;
    const payload = `${tId}:${idxStr}:${expiryStr}`;
    const expectedSig = crypto
      .createHmac("sha256", SECRET)
      .update(payload)
      .digest("base64url")
      .slice(0, 22);
    return sig === expectedSig;
  } catch {
    return false;
  }
}
