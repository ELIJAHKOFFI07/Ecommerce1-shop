import { describe, it, expect } from "vitest";
import { orderCreateSchema, addressSchema, registerSchema, productSchema, uuid, amount, adminUserUpdateSchema, profileSchema } from "@/lib/validators";

const ADDR = { fullName: "Awa", phone: "+2250700000000", city: "Abidjan", details: "Cocody, villa 14" };

const UUID = "3f2b1c4e-8d6a-4b2f-9c1e-7a5d3e2f1b0c";

describe("Validation des entrées (injection, assignation de masse, bornes)", () => {
  it("une commande ne peut pas fixer son propre prix (assignation de masse)", () => {
    const r = orderCreateSchema.parse({
      items: [{ productId: UUID, quantity: 2, unitPrice: 1 }],
      paymentMethod: "CASH_ON_DELIVERY",
      address: ADDR,
      total: 1,
      shippingFee: 0,
      status: "DELIVERED",
    });
    expect(r.items[0]).not.toHaveProperty("unitPrice");
    expect(r).not.toHaveProperty("total");
    expect(r).not.toHaveProperty("shippingFee");
    expect(r).not.toHaveProperty("status");
  });

  it("refuse une quantité nulle, négative ou non entière", () => {
    for (const quantity of [0, -1, 1.5, "2; DROP TABLE", 1e9]) {
      expect(() => orderCreateSchema.parse({ items: [{ productId: UUID, quantity }], paymentMethod: "CASH_ON_DELIVERY", address: ADDR })).toThrow();
    }
  });

  it("refuse un identifiant qui n'est pas un UUID (tentative d'injection)", () => {
    for (const bad of ["1 OR 1=1", "'; DROP TABLE \"User\"; --", "../../etc/passwd", "<script>", "", "3f2b1c4e"]) {
      expect(() => uuid.parse(bad)).toThrow();
    }
  });

  it("refuse un moyen de paiement inconnu ou une adresse incomplète", () => {
    expect(() => orderCreateSchema.parse({ items: [{ productId: UUID, quantity: 1 }], paymentMethod: "FREE", address: ADDR })).toThrow();
    expect(() => orderCreateSchema.parse({ items: [{ productId: UUID, quantity: 1 }], paymentMethod: "CASH_ON_DELIVERY", address: { ...ADDR, phone: "07" } })).toThrow();
    expect(() => orderCreateSchema.parse({ items: [{ productId: UUID, quantity: 1 }], paymentMethod: "CASH_ON_DELIVERY", address: { ...ADDR, details: "x" } })).toThrow();
  });

  it("refuse les montants négatifs, nuls, décimaux ou astronomiques", () => {
    for (const bad of [-5, 0, 10.5, 2_000_000_000, "abc", NaN, Infinity]) {
      expect(() => amount.parse(bad)).toThrow();
    }
    expect(amount.parse("15000")).toBe(15000);
  });

  it("un client ne peut pas modifier son rôle ni son e-mail via le profil", () => {
    const r = profileSchema.parse({ name: "Awa", role: "SUPER_ADMIN", blocked: false, email: "x@y.z" });
    expect(r).toEqual({ name: "Awa" });
  });

  it("l'inscription normalise l'e-mail et refuse les formats douteux", () => {
    const r = registerSchema.parse({ name: "Awa", email: "  Awa@Example.COM ", phone: "+225 07 00 00 00 00", password: "Abidjan2024plateau" });
    expect(r.email).toBe("awa@example.com");
    expect(r.phone).toBe("+2250700000000");
    expect(() => registerSchema.parse({ name: "Awa", email: "pas-un-email", phone: "07", password: "Abidjan2024plateau" })).toThrow();
  });

  it("les images produit doivent être des URL https", () => {
    expect(() => productSchema.parse({ sku: "A1", title: "T", price: 100, images: ["javascript:alert(1)"] })).toThrow();
    expect(() => productSchema.parse({ sku: "A1", title: "T", price: 100, images: ["http://evil/x.png"] })).toThrow();
    expect(() => productSchema.parse({ sku: "A1", title: "T", price: 100, images: ["data:text/html,<script>"] })).toThrow();
  });

  it("le SKU n'accepte que des caractères sûrs", () => {
    expect(() => productSchema.parse({ sku: "A1'; --", title: "T", price: 100 })).toThrow();
  });

  it("borne la taille des chaînes libres", () => {
    expect(() => addressSchema.parse({ ...ADDR, details: "x".repeat(301) })).toThrow();
    expect(() => adminUserUpdateSchema.parse({ name: "x".repeat(121) })).toThrow();
  });
});
