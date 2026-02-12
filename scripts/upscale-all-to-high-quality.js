/**
 * 변경전이미지 폴더 하나만 지정하면, 그 하부의 모든 이미지를 고화질로 업스케일
 * (선명·실제처럼 보이도록 2배 확대 + Lanczos3 + 언샵마스크 + 최고 품질 인코딩)
 *
 * 사용법:
 *   node scripts/upscale-all-to-high-quality.js [폴더경로]
 *
 * 인자 생략 시 기본 경로: 기타자료/새로운 상품데이터/변경전이미지
 *
 * 동작:
 * - 지정 폴더 및 모든 하위 폴더를 재귀 탐색
 * - 각 이미지를 2배 업스케일 + 선명도 보정 후
 *   같은 구조로 "변경후이미지" 폴더에 저장
 *   (예: 변경전이미지/1/3.png → 변경후이미지/1/3.png)
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const DEFAULT_INPUT = "기타자료/새로운 상품데이터/변경전이미지";
const OUTPUT_DIRNAME = "변경후이미지";

const SUPPORTED_EXT = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
const SCALE = 2;

function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_EXT.includes(ext);
}

/**
 * rootDir 아래의 모든 이미지 파일 경로를 상대 경로로 수집 (재귀)
 */
function collectAllImagePaths(rootDir, baseDir = rootDir, list = []) {
  if (!fs.existsSync(rootDir)) return list;
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(rootDir, e.name);
    const relative = path.relative(baseDir, full);
    if (e.isDirectory()) {
      collectAllImagePaths(full, baseDir, list);
    } else if (e.isFile() && isImageFile(e.name)) {
      list.push(relative);
    }
  }
  return list;
}

async function upscaleOne(inputPath, outputPath, ext) {
  const image = sharp(inputPath);
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width === 0 || height === 0) {
    throw new Error(`이미지 크기 없음: ${inputPath}`);
  }

  const newWidth = Math.round(width * SCALE);
  const newHeight = Math.round(height * SCALE);

  let pipeline = image
    .resize(newWidth, newHeight, {
      kernel: sharp.kernel.lanczos3,
      fit: "fill",
    })
    .sharpen({ sigma: 1.4, m1: 1.2, m2: 0.4 }); // 선명·자연스러운 언샵

  const lower = ext.toLowerCase();
  if (lower === ".jpg" || lower === ".jpeg") {
    pipeline = pipeline.jpeg({ quality: 98, mozjpeg: true });
  } else if (lower === ".webp") {
    pipeline = pipeline.webp({ quality: 98, effort: 6 });
  } else if (lower === ".gif") {
    pipeline = pipeline.gif();
  } else {
    pipeline = pipeline.png({ compressionLevel: 6 });
  }

  await pipeline.toFile(outputPath);
}

async function main() {
  const rawPath =
    process.argv.slice(2).find((a) => a !== "--" && !a.startsWith("-")) ||
    DEFAULT_INPUT;
  const inputDir = path.resolve(process.cwd(), rawPath);
  const parentDir = path.dirname(inputDir);
  const outputDir = path.join(parentDir, OUTPUT_DIRNAME);

  if (!fs.existsSync(inputDir)) {
    console.error("입력 폴더가 없습니다:", inputDir);
    process.exit(1);
  }

  const files = collectAllImagePaths(inputDir);
  if (files.length === 0) {
    console.log("이미지 파일이 없습니다:", inputDir);
    return;
  }

  console.log("고화질 업스케일 (2x + 선명도 보정)");
  console.log("입력:", inputDir);
  console.log("출력:", outputDir);
  console.log("총", files.length, "개 파일\n");

  let done = 0;
  for (const rel of files) {
    const inputPath = path.join(inputDir, rel);
    const outputPath = path.join(outputDir, rel);
    const outputSubDir = path.dirname(outputPath);
    if (!fs.existsSync(outputSubDir)) {
      fs.mkdirSync(outputSubDir, { recursive: true });
    }
    const ext = path.extname(rel);
    try {
      await upscaleOne(inputPath, outputPath, ext);
      done++;
      console.log(`  [${done}/${files.length}] ${rel}`);
    } catch (err) {
      console.error(`  ✗ ${rel}`, err.message);
    }
  }

  console.log("\n완료. 저장 위치:", outputDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
