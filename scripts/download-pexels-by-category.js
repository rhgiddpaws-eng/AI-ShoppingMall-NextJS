/**
 * Pexels API로 쇼핑몰용 이미지만 다운로드
 * - 옷 입은 모델, 신발/악세사리 제품·모델 사진 위주 검색어 사용
 * 대상: 기타자료/새로운 상품데이터 클론/남성옷, 여성옷, 신발, 악세사리
 *
 * Pexels에는 fashion model, clothes, shoes product, jewelry 등 수만 장 있음.
 * 사용법:
 *   1. https://www.pexels.com/api/new/ 에서 무료 API 키 발급
 *   2. PEXELS_API_KEY=your_key node scripts/download-pexels-by-category.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const BASE_DIR = path.join(
  process.cwd(),
  "기타자료",
  "새로운 상품데이터 클론"
);

// 쇼핑몰용: 옷 입은 모델, 신발/제품 사진 위주 검색어 (Pexels 실제 검색 결과 기준)
const CATEGORIES = [
  {
    folder: "남성옷",
    queries: [
      "fashion model man",
      "male model clothing",
      "men clothing model",
      "man wearing jacket",
      "menswear model",
    ],
  },
  {
    folder: "여성옷",
    queries: [
      "fashion model woman",
      "female fashion model",
      "woman wearing dress",
      "women clothing model",
      "womenswear model",
    ],
  },
  {
    folder: "신발",
    queries: [
      "sneakers product",
      "shoes product",
      "footwear fashion",
      "running shoes",
      "leather shoes product",
    ],
  },
  {
    folder: "악세사리",
    queries: [
      "jewelry product",
      "watch product",
      "handbag fashion",
      "accessories fashion",
      "necklace model",
    ],
  },
];

const PER_CATEGORY = 50;
const API_BASE = "https://api.pexels.com/v1";

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === "https:" ? https : http;
    const req = lib.get(
      url,
      { headers: options.headers || {} },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      }
    );
    req.on("error", reject);
  });
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === "https:" ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function getExtension(url) {
  const pathname = new URL(url).pathname;
  const ext = path.extname(pathname).toLowerCase();
  if (ext === ".jpeg" || ext === ".jpg" || ext === ".png" || ext === ".webp") return ext;
  return ".jpg";
}

async function searchPexels(apiKey, query, perPage = 80, page = 1) {
  const q = encodeURIComponent(query);
  const url = `${API_BASE}/search?query=${q}&per_page=${perPage}&page=${page}`;
  const body = await request(url, {
    headers: { Authorization: apiKey },
  });
  const text = body.toString();
  const data = JSON.parse(text);
  if (data.error) throw new Error(data.error);
  return data;
}

async function downloadCategory(apiKey, category) {
  const dir = path.join(BASE_DIR, category.folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const collected = [];
  const seen = new Set();
  for (const q of category.queries) {
    if (collected.length >= PER_CATEGORY) break;
    for (let page = 1; page <= 2; page++) {
      if (collected.length >= PER_CATEGORY) break;
      const needed = PER_CATEGORY - collected.length;
      const res = await searchPexels(
        apiKey,
        q,
        Math.min(80, needed + 20),
        page
      );
      const photos = (res.photos || []).filter(
        (p) => p.src && (p.src.original || p.src.large2x)
      );
      for (const p of photos) {
        if (collected.length >= PER_CATEGORY) break;
        const imgUrl = p.src.original || p.src.large2x;
        if (!imgUrl || seen.has(imgUrl)) continue;
        seen.add(imgUrl);
        collected.push(imgUrl);
      }
      if (!(res.photos && res.photos.length >= 80)) break;
    }
  }

  let saved = 0;
  for (let i = 0; i < collected.length && saved < PER_CATEGORY; i++) {
    const url = collected[i];
    const ext = getExtension(url);
    const filePath = path.join(dir, `${saved + 1}${ext}`);
    try {
      const buf = await downloadFile(url);
      fs.writeFileSync(filePath, buf);
      saved++;
      process.stdout.write(`  ${saved}/${PER_CATEGORY} ${path.basename(filePath)}\r`);
    } catch (e) {
      console.error(`  다운로드 실패: ${url}`, e.message);
    }
  }
  console.log(`  ${category.folder}: ${saved}장 저장 완료`);
  return saved;
}

async function main() {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.error("PEXELS_API_KEY 환경 변수를 설정하세요.");
    console.error("무료 키 발급: https://www.pexels.com/api/new/");
    console.error("예: PEXELS_API_KEY=your_key node scripts/download-pexels-by-category.js");
    process.exit(1);
  }

  console.log("대상 폴더:", BASE_DIR);
  console.log("카테고리당 목표:", PER_CATEGORY, "장\n");

  for (const cat of CATEGORIES) {
    console.log(`[${cat.folder}] 다운로드 중...`);
    try {
      await downloadCategory(apiKey, cat);
    } catch (e) {
      console.error(`[${cat.folder}] 오류:`, e.message);
    }
  }

  console.log("\n모든 카테고리 처리 완료.");
}

main();
