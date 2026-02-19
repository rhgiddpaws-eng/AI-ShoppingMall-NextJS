/**
 * 히어로 MP4 용량 최적화 스크립트입니다.
 * - 기본 입력 파일: public/main/1.mp4
 * - 기본 출력 파일: public/main/1.optimized.mp4
 * - --inplace 옵션을 주면 최적화 결과를 원본 파일에 덮어씁니다.
 *
 * 실행 예시:
 * 1) 별도 파일로 출력
 *    node scripts/optimize-hero-video.js
 * 2) 원본 덮어쓰기
 *    node scripts/optimize-hero-video.js --inplace
 * 3) 품질 옵션 조정
 *    node scripts/optimize-hero-video.js --crf=23 --preset=slow
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { randomUUID } = require('crypto')
const { spawnSync } = require('child_process')
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')

// 사람이 읽기 쉬운 단위(MB)로 파일 크기를 출력하기 위한 헬퍼입니다.
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(2)} ${units[unitIndex]}`
}

// CLI 옵션을 간단하게 파싱합니다.
function parseArgs(argv) {
  const options = {
    input: 'public/main/1.mp4',
    output: '',
    crf: 24,
    preset: 'slow',
    inplace: false,
    keepAudio: false,
  }

  for (const arg of argv) {
    if (arg === '--inplace') {
      options.inplace = true
      continue
    }
    if (arg === '--keep-audio') {
      options.keepAudio = true
      continue
    }
    if (arg.startsWith('--input=')) {
      options.input = arg.replace('--input=', '').trim()
      continue
    }
    if (arg.startsWith('--output=')) {
      options.output = arg.replace('--output=', '').trim()
      continue
    }
    if (arg.startsWith('--crf=')) {
      const parsed = Number(arg.replace('--crf=', '').trim())
      if (Number.isFinite(parsed)) {
        options.crf = parsed
      }
      continue
    }
    if (arg.startsWith('--preset=')) {
      options.preset = arg.replace('--preset=', '').trim()
      continue
    }
  }

  return options
}

// ffmpeg를 실행하고 실패 시 stderr를 함께 보여줍니다.
function runFfmpeg(ffmpegPath, args) {
  const result = spawnSync(ffmpegPath, args, {
    encoding: 'utf8',
    windowsHide: true,
  })

  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || '').trim()
    throw new Error(message || 'ffmpeg 실행에 실패했습니다.')
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  const ffmpegPath = ffmpegInstaller?.path

  if (typeof ffmpegPath !== 'string' || ffmpegPath.length === 0) {
    throw new Error('ffmpeg 경로를 찾지 못했습니다. @ffmpeg-installer/ffmpeg 설치 상태를 확인해 주세요.')
  }

  const inputPath = path.resolve(process.cwd(), options.input)
  if (!fs.existsSync(inputPath)) {
    throw new Error(`입력 파일이 없습니다: ${inputPath}`)
  }

  // 출력 경로를 지정하지 않으면 입력 파일 옆에 optimized 파일을 만듭니다.
  const parsedInput = path.parse(inputPath)
  const defaultOutput = path.join(parsedInput.dir, `${parsedInput.name}.optimized.mp4`)
  const outputPath = path.resolve(process.cwd(), options.output || defaultOutput)

  // 원본 덮어쓰기 모드에서는 먼저 임시 파일에 변환한 뒤 최종 교체합니다.
  const tempOutputPath = options.inplace
    ? path.join(os.tmpdir(), `hero-video-${randomUUID()}.mp4`)
    : outputPath

  const beforeSize = fs.statSync(inputPath).size

  // 화질 손실을 최소화하기 위해 해상도/프레임은 유지하고, 코덱/압축만 조정합니다.
  // - libx264 + CRF: 시각 품질을 유지하면서 용량을 줄이는 표준 조합입니다.
  // - +faststart: 웹 스트리밍에서 재생 시작 지연을 줄입니다.
  const ffmpegArgs = [
    '-y',
    '-hide_banner',
    '-i',
    inputPath,
    '-map_metadata',
    '0',
    '-c:v',
    'libx264',
    '-preset',
    options.preset,
    '-crf',
    String(options.crf),
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-vf',
    'scale=trunc(iw/2)*2:trunc(ih/2)*2',
  ]

  // 히어로 영상은 무음 자동재생이므로 기본값은 오디오 제거로 용량을 더 줄입니다.
  if (!options.keepAudio) {
    ffmpegArgs.push('-an')
  }

  ffmpegArgs.push(tempOutputPath)

  runFfmpeg(ffmpegPath, ffmpegArgs)

  // 원본 덮어쓰기 옵션이면 변환 완료 파일로 안전하게 교체합니다.
  if (options.inplace) {
    fs.copyFileSync(tempOutputPath, inputPath)
    fs.rmSync(tempOutputPath, { force: true })
  }

  const finalPath = options.inplace ? inputPath : outputPath
  const afterSize = fs.statSync(finalPath).size
  const savedBytes = beforeSize - afterSize
  const savedPercent = beforeSize > 0 ? (savedBytes / beforeSize) * 100 : 0

  console.log('[VIDEO] 입력 파일:', inputPath)
  console.log('[VIDEO] 출력 파일:', finalPath)
  console.log('[VIDEO] 원본 크기:', formatBytes(beforeSize))
  console.log('[VIDEO] 변환 크기:', formatBytes(afterSize))
  console.log(
    '[VIDEO] 절감 크기:',
    `${formatBytes(Math.max(savedBytes, 0))} (${Math.max(savedPercent, 0).toFixed(2)}%)`,
  )
  console.log('[VIDEO] 적용 옵션:', `crf=${options.crf}, preset=${options.preset}, keepAudio=${options.keepAudio}`)
}

try {
  main()
} catch (error) {
  console.error('[VIDEO] 변환 실패:', error instanceof Error ? error.message : error)
  process.exit(1)
}
