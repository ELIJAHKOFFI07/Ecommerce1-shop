import { describe, it, expect } from "vitest";
import { uploadFile } from "@/lib/storage";

const file = (bytes: number[] | Buffer, name: string, type: string) =>
  new File([Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)], name, { type });

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0];

describe("Envoi de fichiers : le contenu prime sur l'extension", () => {
  it("refuse un exécutable renommé en .png (extension et Content-Type mentent)", async () => {
    const exe = file([0x4d, 0x5a, 0x90, 0x00, 0x03, 0, 0, 0, 4, 0, 0, 0, 0xff, 0xff], "photo.png", "image/png");
    await expect(uploadFile(exe, "product")).rejects.toMatchObject({ status: 415 });
  });

  it("refuse une page HTML déguisée en image", async () => {
    const html = file(Buffer.from("<html><script>alert(1)</script></html>   "), "x.jpg", "image/jpeg");
    await expect(uploadFile(html, "avatar")).rejects.toMatchObject({ status: 415 });
  });

  it("refuse un SVG contenant un script", async () => {
    const svg = file(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg"><script>fetch('//evil')</script></svg>`), "logo.svg", "image/svg+xml");
    await expect(uploadFile(svg, "logo")).rejects.toMatchObject({ status: 415 });
  });

  it("refuse un PDF là où seule une image est attendue", async () => {
    const pdf = file(Buffer.from("%PDF-1.4 ......."), "x.pdf", "application/pdf");
    await expect(uploadFile(pdf, "product")).rejects.toMatchObject({ status: 415 });
  });

  it("refuse un fichier trop lourd avant de lire son contenu", async () => {
    const big = new File([Buffer.alloc(6 * 1024 * 1024, 0)], "big.png", { type: "image/png" });
    await expect(uploadFile(big, "product")).rejects.toMatchObject({ status: 413 });
  });

  it("un vrai PNG passe la vérification de type (échoue plus loin faute de clé ImageKit)", async () => {
    const saved = process.env.IMAGEKIT_PRIVATE_KEY;
    delete process.env.IMAGEKIT_PRIVATE_KEY;
    const png = file(PNG, "ok.png", "image/png");
    await expect(uploadFile(png, "product")).rejects.toMatchObject({ status: 503 });
    if (saved) process.env.IMAGEKIT_PRIVATE_KEY = saved;
  });
});
