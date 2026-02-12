# 히어로 배경 (GIF / 동영상 / 이미지) 및 에셋 퀄리티

## 히어로 배경

- **구성**: [src/components/hero-section.tsx](../src/components/hero-section.tsx)에서 **GIF**, 동영상 또는 이미지 배경 지원.
- **GIF 사용 (권장)**: 애니메이션 GIF는 브라우저 호환이 좋고 별도 코덱 없이 재생됩니다.
  - `public/` 폴더에 gif 파일을 넣고 `NEXT_PUBLIC_HERO_GIF_URL=/hero.gif` 또는 `<HeroSection gifSrc="/hero.gif" />` 로 전달.
- **동영상 사용**: mp4 파일을 넣고 `NEXT_PUBLIC_HERO_VIDEO_URL=/hero.mp4` 또는 `videoSrc` prop으로 전달.
- **GIF가 브라우저에서 안 돌아가는 경우**: 일반적으로 없음. 모든 현대 브라우저에서 GIF(정적/애니메이션) 지원. 예외는 데이터 절약 모드에서 이미지 자동 일시정지, 또는 매우 오래된 브라우저 정도이며, 그런 환경에서는 `posterSrc` 이미지로 fallback 하면 됨.

## 상품/모델 이미지

- 고해상도·고퀄리티 이미지는 라이선스를 준수해 확보.
- 기존 스크립트: [scripts/download-pexels-by-category.js](../scripts/download-pexels-by-category.js) 등으로 카테고리별 이미지 추가 가능.
- CDN 사용 시 [DOCUMENT/IMAGE-CDN-CHECK.md](IMAGE-CDN-CHECK.md) 참고.

## 모바일

- 히어로 CTA 버튼에 `min-h-[44px]` 등 터치 영역 확보.
- 반응형 타이포(텍스트 크기·줄 수)는 [tasks.md](tasks.md) 항목 7 반응형 작업에서 적용.
