const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const sizes = [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024]
const svgPath = path.join(__dirname, '..', 'resources', 'icon.svg')
const pngDir = path.join(__dirname, '..', 'resources')

async function generate() {
  const svg = fs.readFileSync(svgPath, 'utf-8')

  // Generate 1024x1024 base PNG
  const basePng = path.join(pngDir, 'icon.png')
  await sharp(Buffer.from(svg)).resize(1024, 1024).png().toFile(basePng)
  console.log('✓ Generated icon.png (1024x1024)')

  // Generate smaller sizes for electron-builder
  for (const size of sizes.filter(s => s < 1024)) {
    const out = path.join(pngDir, `icon-${size}x${size}.png`)
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out)
  }
  console.log('✓ Generated multi-size PNGs')

  // On macOS, generate .icns (placeholder - requires iconutil)
  // On Windows, electron-builder will use icon.png directly
  console.log('\nDone. electron-builder will use resources/icon.png')
}

generate().catch(err => { console.error(err); process.exit(1) })
