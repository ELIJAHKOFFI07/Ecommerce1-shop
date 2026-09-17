import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import sharp from "sharp";
import { readdirSync, writeFileSync } from "node:fs";
import { join, parse } from "node:path";
import { uploadFile } from "../src/lib/storage";

/// Compresse les photos de public/Products en WebP 900 px et les envoie sur
/// ImageKit. Écrit prisma/products-images.json (nom → URL) pour le seed.
async function main() {
  const dir = "public/Products";
  const out: Record<string, string> = {};
  for (const f of readdirSync(dir)) {
    const name = parse(f).name;
    const buf = await sharp(join(dir, f)).resize(900, 900, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const file = new File([new Uint8Array(buf)], `${name}.webp`, { type: "image/webp" });
    const res = await uploadFile(file, "product");
    out[name] = res.url;
    console.log(`${name.padEnd(22)} ${(buf.length / 1024).toFixed(0).padStart(4)} KB  ${res.url}`);
  }
  writeFileSync("prisma/products-images.json", JSON.stringify(out, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
