/**
 * 이미지 3x3 분할 스크립트
 *
 * 사용법 1 - 폴더 전체:
 *   npx tsx scripts/split-image-3x3.ts <폴더경로>
 *
 * 사용법 2 - 단일 이미지 → 지정 폴더:
 *   npx tsx scripts/split-image-3x3.ts <이미지경로> <출력폴더경로>
 *
 * 예시:
 *   npx tsx scripts/split-image-3x3.ts "기타자료/새로운 상품데이터/변경전이미지"
 *   npx tsx scripts/split-image-3x3.ts scripts/18.png scripts/products/18
 *
 * 동작:
 * - 폴더 지정 시: 해당 폴더 안의 모든 이미지를 3x3으로 잘라 파일명과 같은 하위 폴더에 1~9 저장.
 * - 이미지+폴더 지정 시: 해당 이미지만 3x3으로 잘라 지정한 폴더에 1~9.png 저장.
 */

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const SUPPORTED_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif']

function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return SUPPORTED_EXT.includes(ext)
}

function getImageFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    throw new Error(`폴더가 없습니다: ${dir}`)
  }
  return fs.readdirSync(dir).filter((name) => {
    const full = path.join(dir, name)
    return fs.statSync(full).isFile() && isImageFile(name)
  })
}

async function splitImage3x3(
  inputPath: string,
  outputDir: string,
  ext: string
): Promise<void> {
  const image = sharp(inputPath)
  const meta = await image.metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0

  if (width === 0 || height === 0) {
    throw new Error(`이미지 크기를 읽을 수 없습니다: ${inputPath}`)
  }

  const cellWidth = Math.floor(width / 3)
  const cellHeight = Math.floor(height / 3)

  // 3x3 순서: (0,0)=1, (1,0)=2, (2,0)=3, (0,1)=4, ... (2,2)=9
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const left = col * cellWidth
      const top = row * cellHeight
      const w = col === 2 ? width - left : cellWidth
      const h = row === 2 ? height - top : cellHeight
      const index = row * 3 + col + 1
      const outPath = path.join(outputDir, `${index}${ext}`)

      await image
        .clone()
        .extract({ left, top, width: w, height: h })
        .toFile(outPath)
    }
  }
}

async function processFolder(targetDir: string): Promise<void> {
  const resolvedDir = path.resolve(targetDir)
  const files = getImageFiles(resolvedDir)

  if (files.length === 0) {
    console.log(`이미지 파일이 없습니다: ${resolvedDir}`)
    return
  }

  console.log(`총 ${files.length}개 이미지 처리 시작: ${resolvedDir}\n`)

  for (const filename of files) {
    const baseName = path.basename(filename, path.extname(filename))
    const ext = path.extname(filename).toLowerCase()
    const inputPath = path.join(resolvedDir, filename)
    const outputDir = path.join(resolvedDir, baseName)

    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }
      await splitImage3x3(inputPath, outputDir, ext)
      console.log(`  ✓ ${filename} → ${baseName}/ (1${ext} ~ 9${ext})`)
    } catch (err) {
      console.error(`  ✗ ${filename} 실패:`, err)
    }
  }

  console.log('\n완료.')
}

async function processSingleImage(inputPath: string, outputDir: string): Promise<void> {
  const resolvedInput = path.resolve(inputPath)
  const resolvedOutput = path.resolve(outputDir)

  if (!fs.existsSync(resolvedInput)) {
    throw new Error(`이미지가 없습니다: ${resolvedInput}`)
  }
  if (!fs.statSync(resolvedInput).isFile()) {
    throw new Error(`파일이 아닙니다: ${resolvedInput}`)
  }
  const ext = path.extname(resolvedInput).toLowerCase()
  if (!SUPPORTED_EXT.includes(ext)) {
    throw new Error(`지원하지 않는 형식입니다: ${ext}`)
  }

  if (!fs.existsSync(resolvedOutput)) {
    fs.mkdirSync(resolvedOutput, { recursive: true })
  }
  await splitImage3x3(resolvedInput, resolvedOutput, ext)
  console.log(`✓ ${resolvedInput} → ${resolvedOutput}/ (1${ext} ~ 9${ext})\n완료.`)
}

function main(): void {
  const arg1 = process.argv[2]
  const arg2 = process.argv[3]

  if (!arg1 || arg1.startsWith('-')) {
    console.log(`
이미지 3x3 분할 스크립트

사용법 1 - 폴더 전체: npx tsx scripts/split-image-3x3.ts <폴더경로>
사용법 2 - 단일 이미지: npx tsx scripts/split-image-3x3.ts <이미지경로> <출력폴더경로>

예시:
  npx tsx scripts/split-image-3x3.ts "기타자료/새로운 상품데이터/변경전이미지"
  npx tsx scripts/split-image-3x3.ts scripts/18.png scripts/products/18

지원 형식: ${SUPPORTED_EXT.join(', ')}
`)
    process.exit(1)
  }

  const run = arg2
    ? processSingleImage(arg1, arg2)
    : processFolder(arg1)

  run.catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

main()
