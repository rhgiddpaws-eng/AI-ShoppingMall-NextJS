/**
 * Audit image dimensions in public/ and generate a quality report.
 *
 * Usage:
 *   node scripts/audit-image-quality.js
 *
 * Output:
 *   DOCUMENT/image-quality-report.json
 */

const fs = require("fs")
const path = require("path")
const sharp = require("sharp")

const ROOT = process.cwd()
const PUBLIC_DIR = path.join(ROOT, "public")
const OUTPUT = path.join(ROOT, "DOCUMENT", "image-quality-report.json")
const MIN_WIDTH = 1200
const MIN_HEIGHT = 1200
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"])

function shouldIgnore(absPath) {
  const lower = absPath.toLowerCase()
  const base = path.basename(lower)

  if (base.startsWith("placeholder")) return true

  const ext = path.extname(absPath)
  const stem = absPath.slice(0, -ext.length)
  const hqCandidate = `${stem}-hq${ext}`
  if (!base.includes("-hq") && fs.existsSync(hqCandidate)) return true

  return false
}

function walk(dir, list = []) {
  if (!fs.existsSync(dir)) return list
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, list)
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (ALLOWED_EXT.has(ext) && !shouldIgnore(full)) list.push(full)
  }
  return list
}

async function inspectImage(absPath) {
  const meta = await sharp(absPath).metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  return {
    file: path.relative(ROOT, absPath).replace(/\\/g, "/"),
    width,
    height,
    format: meta.format ?? "unknown",
    ok: width >= MIN_WIDTH && height >= MIN_HEIGHT,
  }
}

async function main() {
  const files = walk(PUBLIC_DIR)
  const rows = []
  for (const abs of files) {
    try {
      rows.push(await inspectImage(abs))
    } catch (error) {
      rows.push({
        file: path.relative(ROOT, abs).replace(/\\/g, "/"),
        width: 0,
        height: 0,
        format: "unreadable",
        ok: false,
        error: error instanceof Error ? error.message : "unknown error",
      })
    }
  }

  const lowQuality = rows.filter((r) => !r.ok)
  const report = {
    generatedAt: new Date().toISOString(),
    minimum: { width: MIN_WIDTH, height: MIN_HEIGHT },
    total: rows.length,
    lowQualityCount: lowQuality.length,
    lowQuality,
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true })
  fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2), "utf8")

  console.log(`Inspected ${rows.length} images`)
  console.log(`Low quality: ${lowQuality.length}`)
  console.log(`Report: ${path.relative(ROOT, OUTPUT)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
