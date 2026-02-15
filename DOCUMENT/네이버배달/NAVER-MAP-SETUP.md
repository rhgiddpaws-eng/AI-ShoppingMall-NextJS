# 네이버 지도 연동 (배달 추적)

## 환경 변수

- `NAVER_MAPS_CLIENT_ID`: 네이버 클라우드 플랫폼에서 발급한 Maps API 클라이언트 ID  
  (지도 스크립트 로드, Geocoding, Directions 호출에 사용)
- `NAVER_MAPS_CLIENT_SECRET`: 네이버 클라우드 플랫폼에서 발급한 Maps API 시크릿  
  (서버 API: Geocoding/Directions 호출용)
- `NEXT_PUBLIC_STORE_LAT` / `NEXT_PUBLIC_STORE_LNG`: 매장(출발지) 좌표. 미설정 시 서울시청 좌표 기본값 사용.

## 구현 방향

1. **판매처 ↔ 주문자 위치**: Order.shippingLat, shippingLng(배송지), 고정 판매처 좌표를 지도에 마커로 표시.
2. **스크립트 로드**: `/api/naver/client-id`에서 `NAVER_MAPS_CLIENT_ID`를 받아 `next/script`로 네이버 지도 API를 클라이언트에서 로드.
3. **반응형**: 지도 컨테이너를 `w-full`·`min-h-[200px]` 등으로 두고, 모바일에서 높이/폭이 자연스럽게 보이도록 처리.

## 현재 적용 상태

- 공용 컴포넌트: `src/components/naver-delivery-map.tsx`
- 관리자 주문 상세: `src/app/admin/orders/[id]/page.tsx`
- 고객 주문 상세(OrderHistory): `src/components/order-history.tsx`

## 참고

- [연동 가이드(공식)](https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html)
- [지도 생성/기본 동작](https://navermaps.github.io/maps.js.ncp/docs/tutorial-Map.html)
- [마커](https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Marker.html)
- [정보창(InfoWindow)](https://navermaps.github.io/maps.js.ncp/docs/tutorial-3-InfoWindow.html)
- 배달 상태(주문완료→배송준비→배달중→도착중→배달완료)는 이미 Order.deliveryStatus로 저장·관리자에서 변경 가능.

