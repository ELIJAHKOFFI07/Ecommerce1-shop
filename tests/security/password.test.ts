import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, validatePasswordPolicy, generateToken, hashToken, safeEqual, generateTempPassword } from "@/lib/password";

describe("Mots de passe", () => {
  it("ne stocke jamais le mot de passe en clair", async () => {
    const hash = await hashPassword("MonMotDePasse2024");
    expect(hash).not.toContain("MonMotDePasse2024");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("vérifie correctement et refuse un mauvais mot de passe", async () => {
    const hash = await hashPassword("MonMotDePasse2024");
    expect(await verifyPassword("MonMotDePasse2024", hash)).toBe(true);
    expect(await verifyPassword("MonMotDePasse2025", hash)).toBe(false);
  });

  it("compare contre un hash factice quand le compte n'existe pas (pas d'énumération par le temps)", async () => {
    const t0 = performance.now();
    const r = await verifyPassword("nimportequoi123", null);
    const dt = performance.now() - t0;
    expect(r).toBe(false);
    // bcrypt coût 12 : la comparaison factice doit prendre un temps réel,
    // pas revenir immédiatement.
    expect(dt).toBeGreaterThan(20);
  });

  it("deux hachages du même mot de passe diffèrent (sel)", async () => {
    const [a, b] = await Promise.all([hashPassword("MonMotDePasse2024"), hashPassword("MonMotDePasse2024")]);
    expect(a).not.toBe(b);
  });

  it("applique la politique : longueur, mélange, mots de passe courants", () => {
    expect(validatePasswordPolicy("court1")).toBeTruthy();
    expect(validatePasswordPolicy("motdepasse")).toBeTruthy();
    expect(validatePasswordPolicy("seulementdeslettres")).toBeTruthy();
    expect(validatePasswordPolicy("12345678901234")).toBeTruthy();
    expect(validatePasswordPolicy("x".repeat(129) + "1")).toBeTruthy();
    expect(validatePasswordPolicy("Abidjan2024plateau")).toBeNull();
  });

  it("les jetons sont stockés hachés et se retrouvent par leur empreinte", () => {
    const { token, hash } = generateToken();
    expect(token).not.toBe(hash);
    expect(hashToken(token)).toBe(hash);
    expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it("safeEqual est constant et exact", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("le mot de passe temporaire respecte la politique", () => {
    for (let i = 0; i < 20; i++) expect(validatePasswordPolicy(generateTempPassword())).toBeNull();
  });
});
