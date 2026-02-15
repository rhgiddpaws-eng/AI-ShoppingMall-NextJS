# 이미지 에셋 라이선스/품질 운영 가이드

## 1) 라이선스 소스 원칙

- 상용 사용 가능한 소스만 사용: Pexels, Unsplash, 자체 촬영/제작 이미지
- 원본 URL, 작가, 라이선스 페이지 URL을 반드시 기록
- 출처 확인 불가 이미지는 업로드 금지

## 2) 수집/가공 스크립트

- 카테고리별 수집: `pnpm run download-clone-images`
- 고화질 업스케일: `pnpm run upscale-all`
- 품질 감사 리포트: `pnpm run audit-images`

`audit-images` 실행 후 `DOCUMENT/image-quality-report.json` 파일이 생성됩니다.

## 3) 최소 품질 기준

- 상품/모델 이미지 권장 최소: `1200 x 1200` 이상
- 썸네일만 있는 경우라도 원본은 고해상도 보관
- 흐림/노이즈가 큰 파일은 교체 또는 재업스케일

## 4) 라이선스 로그 템플릿

아래 형식으로 CSV를 관리합니다.

```csv
file_path,source,source_url,author,license_url,downloaded_at,notes
public/main/hero-2026-01.webp,Pexels,https://www.pexels.com/photo/...,Author Name,https://www.pexels.com/license/,2026-02-14,commercial-use-ok
```

