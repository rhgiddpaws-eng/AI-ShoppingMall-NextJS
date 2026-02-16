import { SweetTrackerDeliveryProvider } from "@/lib/courier/providers/sweetTrackerProvider"

// 과거 import 경로(kakaoProvider)를 쓰는 코드와의 호환을 위해 래퍼 클래스를 유지합니다.
export class KakaoDeliveryProvider extends SweetTrackerDeliveryProvider {}
