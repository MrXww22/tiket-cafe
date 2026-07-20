import { cookies } from "next/headers";
import type { StaffRole } from "@/generated/prisma/enums";

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  role: StaffRole;
};

export const sessionCookieName = "tableflow_session";
export const shiftHours = Number(process.env.AUTH_SHIFT_HOURS || 12);
export const shiftMaxAge = shiftHours * 60 * 60;

const getSecret = () => process.env.AUTH_SECRET || process.env.DATABASE_URL || "tableflow-dev-secret";

type JwtPayload = SessionUser & {
  iat: number;
  exp: number;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const base64UrlToBytes = (value: string) => {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const encodeJson = (value: unknown) => bytesToBase64Url(textEncoder.encode(JSON.stringify(value)));

const decodeJson = <T>(value: string) => JSON.parse(textDecoder.decode(base64UrlToBytes(value))) as T;

const sign = async (value: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
};

const isValidRole = (role: string): role is StaffRole => ["ADMIN", "WAITER", "KITCHEN", "BAR"].includes(role);

export async function createSessionToken(user: SessionUser) {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: "HS256", typ: "JWT" });
  const payload = encodeJson({
    ...user,
    iat: now,
    exp: now + shiftMaxAge,
  });
  const unsignedToken = `${header}.${payload}`;

  return `${unsignedToken}.${await sign(unsignedToken)}`;
}

export async function verifySessionToken(token?: string): Promise<SessionUser | null> {
  if (!token) return null;

  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return null;

  const expected = await sign(`${header}.${payload}`);

  if (signature !== expected) {
    return null;
  }

  try {
    const data = decodeJson<JwtPayload>(payload);
    const now = Math.floor(Date.now() / 1000);

    if (!data.id || !data.username || !data.name || !isValidRole(data.role) || data.exp <= now) {
      return null;
    }

    return {
      id: data.id,
      username: data.username,
      name: data.name,
      role: data.role,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const store = await cookies();
  return verifySessionToken(store.get(sessionCookieName)?.value);
}
