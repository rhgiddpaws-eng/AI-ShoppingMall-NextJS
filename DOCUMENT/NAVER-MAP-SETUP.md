# 네이버 지도 연동 (배달 추적)

## 환경 변수

- `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`: 네이버 클라우드 플랫폼에서 발급한 Maps API 클라이언트 ID  
  (지도 표시·마커·경로 등에 사용)

## 구현 방향

1. **판매처 ↔ 주문자 위치**: Order.shippingLat, shippingLng(배송지), 고정 판매처 좌표를 지도에 마커로 표시.
2. **스크립트 로드**: `next/script`로 네이버 지도 API 스크립트를 클라이언트에서 로드.
3. **반응형**: 지도 컨테이너를 `w-full`·`min-h-[200px]` 등으로 두고, 모바일에서 높이/폭이 자연스럽게 보이도록 처리.

## 참고

- [네이버 지도 API](https://navermaps.github.io/maps.js.ncp/)
- 배달 상태(주문완료→배송준비→배달중→도착중→배달완료)는 이미 Order.deliveryStatus로 저장·관리자에서 변경 가능.
