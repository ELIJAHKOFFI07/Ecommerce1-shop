import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { withApi, parseBody, ApiError } from "@/lib/apiError";
import { escapeHtml } from "@/lib/email";

const req = (body: unknown, len?: number) =>
  new Request("http://x/api/test", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json", ...(len ? { "content-length": String(len) } : {}) },
  });

describe("Enveloppe API : aucune fuite d'information", () => {
  it("une exception inattendue devient un 500 générique sans pile ni détail", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withApi(async () => {
      throw new Error("ECONNREFUSED postgresql://user:secret@72.62.31.97:5432/db at /srv/app/src/lib/db.ts:12");
    });
    const res = await handler(req({}), {});
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(JSON.stringify(json)).not.toMatch(/secret|72\.62|postgresql|db\.ts|ECONNREFUSED/);
    spy.mockRestore();
  });

  it("une erreur métier garde son code et son message utilisateur", async () => {
    const handler = withApi(async () => {
      throw new ApiError(403, "Vous n'avez pas les droits pour cette action.");
    });
    const res = await handler(req({}), {});
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Vous n'avez pas les droits pour cette action.");
  });

  it("une erreur de validation devient un 400 lisible", async () => {
    const handler = withApi(async (r) => {
      await parseBody(r, z.object({ amount: z.number().positive() }));
      return new Response("ok");
    });
    const res = await handler(req({ amount: -1 }), {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("amount");
  });

  it("refuse un corps trop volumineux avant de le lire", async () => {
    const handler = withApi(async (r) => {
      await parseBody(r, z.object({}));
      return new Response("ok");
    });
    const res = await handler(req({}, 10 * 1024 * 1024), {});
    expect(res.status).toBe(413);
  });

  it("refuse un JSON malformé sans planter", async () => {
    const handler = withApi(async (r) => {
      await parseBody(r, z.object({}));
      return new Response("ok");
    });
    const res = await handler(req("{not json"), {});
    expect(res.status).toBe(400);
  });
});

describe("Échappement HTML des e-mails", () => {
  it("neutralise les balises injectées dans un nom", () => {
    const out = escapeHtml(`<script>alert('x')</script>Awa & "Cie"`);
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
    expect(out).toContain("&amp;");
    expect(out).toContain("&quot;");
  });
});
