#!/usr/bin/env node
/**
 * Faux serveur Auth Supabase, LOCAL, pour mesurer les pages authentifiées
 * sans créer de compte ni appeler le projet Supabase (plan performance, lot 0).
 *
 * Il ne répond qu'à `GET /auth/v1/user` — l'appel que font `getUser()` (rendu)
 * et `getClaims()` (proxy, jeton HS256) — par un utilisateur fixe, et compte
 * ces appels (`GET /__compte`, `POST /__raz`). Tout le reste : 404, journalisé.
 *
 * L'application doit être construite avec
 * `NEXT_PUBLIC_SUPABASE_URL=http://localhost:<port>` : le cookie de session est
 * alors `sb-localhost-auth-token` (`fabriquerCookie`, ci-dessous).
 *
 *   node scripts/perf/faux-auth.mjs [--port 54399]
 */
import { createServer } from "node:http";

export const PERF_USER_ID = "00000000-0000-4000-8000-00000000fe11";
export const PERF_EMAIL = "perf@rojer.invalid";

const utilisateur = {
  id: PERF_USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: PERF_EMAIL,
  email_confirmed_at: "2026-01-01T00:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const b64url = (s) => Buffer.from(s).toString("base64url");

/** Cookie de session au format de `@supabase/ssr` (préfixe `base64-`). */
export function fabriquerCookie() {
  const maintenant = Math.floor(Date.now() / 1000);
  const exp = maintenant + 365 * 86400;
  const jeton = [
    b64url(JSON.stringify({ alg: "HS256", typ: "JWT" })),
    b64url(JSON.stringify({
      sub: PERF_USER_ID,
      aud: "authenticated",
      role: "authenticated",
      email: PERF_EMAIL,
      iat: maintenant,
      exp,
      session_id: "perf",
    })),
    b64url("signature-factice"),
  ].join(".");
  const session = {
    access_token: jeton,
    token_type: "bearer",
    expires_in: exp - maintenant,
    expires_at: exp,
    refresh_token: "perf",
    user: utilisateur,
  };
  return `sb-localhost-auth-token=base64-${b64url(JSON.stringify(session))}`;
}

function demarrer(port) {
  let appels = 0;
  createServer((req, res) => {
    const chemin = new URL(req.url, "http://x").pathname;
    if (req.method === "GET" && chemin === "/auth/v1/user") {
      appels += 1;
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(utilisateur));
    }
    if (chemin === "/__compte") {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ appels }));
    }
    if (chemin === "/__raz") {
      appels = 0;
      res.writeHead(204);
      return res.end();
    }
    console.error(`[faux-auth] non servi : ${req.method} ${chemin}`);
    res.writeHead(404);
    res.end();
  }).listen(port, "127.0.0.1", () => {
    console.log(`[faux-auth] prêt sur http://localhost:${port}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf("--port");
  demarrer(i === -1 ? 54399 : Number(process.argv[i + 1]));
}
