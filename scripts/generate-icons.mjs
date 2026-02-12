import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconsDir = join(root, "public", "icons");
const publicDir = join(root, "public");
const appDir = join(root, "app");

// Source files
const logoPng = join(iconsDir, "logo-tekyida.png"); // with background — for PWA icons
const logoNoBg = join(iconsDir, "logo-tekyida-removebg.png"); // no bg — for favicon & app

mkdirSync(iconsDir, { recursive: true });

// PWA icons from the full logo (with background)
const pwaIcons = [
  { size: 48, name: "icon-48.png" },
  { size: 72, name: "icon-72.png" },
  { size: 96, name: "icon-96.png" },
  { size: 128, name: "icon-128.png" },
  { size: 144, name: "icon-144.png" },
  { size: 152, name: "icon-152.png" },
  { size: 192, name: "icon-192.png" },
  { size: 256, name: "icon-256.png" },
  { size: 384, name: "icon-384.png" },
  { size: 512, name: "icon-512.png" },
];

// Apple touch icons from the full logo
const appleIcons = [
  { size: 180, name: "apple-touch-icon.png", dir: publicDir },
  { size: 180, name: "apple-touch-icon-precomposed.png", dir: publicDir },
  { size: 180, name: "apple-touch-icon.png", dir: iconsDir },
];

console.log("Generating PWA icons from logo...");
for (const { size, name } of pwaIcons) {
  await sharp(logoPng)
    .resize(size, size, { fit: "contain", background: { r: 14, g: 17, b: 32, alpha: 1 } })
    .png()
    .toFile(join(iconsDir, name));
  console.log(`  ✓ ${name} (${size}x${size})`);
}

console.log("\nGenerating Apple touch icons...");
for (const { size, name, dir } of appleIcons) {
  await sharp(logoPng)
    .resize(size, size, { fit: "contain", background: { r: 14, g: 17, b: 32, alpha: 1 } })
    .png()
    .toFile(join(dir, name));
  console.log(`  ✓ ${name} (${size}x${size}) -> ${dir === publicDir ? "public/" : "public/icons/"}`);
}

// Favicon (ICO-like): generate a 32x32 PNG favicon from the no-bg logo
// Next.js can use a favicon.ico in the app directory, but PNG works too
// We'll generate multiple sizes and create a proper favicon
console.log("\nGenerating favicons from no-bg logo...");

// Generate favicon as PNG (32x32) for the app directory
const favicon32 = await sharp(logoNoBg)
  .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const favicon16 = await sharp(logoNoBg)
  .resize(16, 16, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const favicon48 = await sharp(logoNoBg)
  .resize(48, 48, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

// Create ICO file (simple ICO format with PNG data)
function createIco(pngBuffers) {
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;
  
  let offset = headerSize + dirSize;
  const entries = [];
  
  for (const buf of pngBuffers) {
    entries.push({ offset, size: buf.length });
    offset += buf.length;
  }
  
  const totalSize = offset;
  const ico = Buffer.alloc(totalSize);
  
  // ICO header
  ico.writeUInt16LE(0, 0);      // reserved
  ico.writeUInt16LE(1, 2);      // ICO type
  ico.writeUInt16LE(numImages, 4); // number of images
  
  // Directory entries
  const sizes = [16, 32, 48];
  for (let i = 0; i < numImages; i++) {
    const entryOffset = headerSize + i * dirEntrySize;
    const size = sizes[i] || 32;
    ico.writeUInt8(size === 256 ? 0 : size, entryOffset);     // width
    ico.writeUInt8(size === 256 ? 0 : size, entryOffset + 1); // height
    ico.writeUInt8(0, entryOffset + 2);    // color palette
    ico.writeUInt8(0, entryOffset + 3);    // reserved
    ico.writeUInt16LE(1, entryOffset + 4); // color planes
    ico.writeUInt16LE(32, entryOffset + 6); // bits per pixel
    ico.writeUInt32LE(pngBuffers[i].length, entryOffset + 8); // image size
    ico.writeUInt32LE(entries[i].offset, entryOffset + 12);   // image offset
  }
  
  // Image data
  for (let i = 0; i < numImages; i++) {
    pngBuffers[i].copy(ico, entries[i].offset);
  }
  
  return ico;
}

const icoBuffer = createIco([favicon16, favicon32, favicon48]);
writeFileSync(join(appDir, "favicon.ico"), icoBuffer);
console.log("  ✓ app/favicon.ico (16x16, 32x32, 48x48)");

// Also generate a high-res icon for the app (used in Logo component)
await sharp(logoNoBg)
  .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(join(iconsDir, "logo-nobg-128.png"));
console.log("  ✓ icons/logo-nobg-128.png (128x128)");

await sharp(logoNoBg)
  .resize(64, 64, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(join(iconsDir, "logo-nobg-64.png"));
console.log("  ✓ icons/logo-nobg-64.png (64x64)");

console.log("\n✅ All icons generated successfully!");
