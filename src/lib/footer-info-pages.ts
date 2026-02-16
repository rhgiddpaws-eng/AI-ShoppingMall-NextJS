// =============================================================================
// 푸터 안내 페이지 데이터 모음
// - 홈 푸터 링크(/help, /faq, /shipping 등)에서 공통으로 사용하는 더미 안내 문구를 정의한다.
// - 개인정보성 값은 사용자 요청대로 이름/이메일/전화번호를 모두 XXX로 고정한다.
// =============================================================================

export type FooterInfoSection = {
  title: string
  description: string
  items: string[]
}

export type FooterInfoContact = {
  name: string
  email: string
  phone: string
}

export type FooterInfoRelatedLink = {
  href: string
  label: string
}

export type FooterInfoPageData = {
  menuLabel: string
  title: string
  summary: string
  sections: FooterInfoSection[]
  relatedLinks: FooterInfoRelatedLink[]
  contact: FooterInfoContact
}

// 사용자 요청사항: 이름/이메일/전화번호는 실제값 대신 XXX만 사용한다.
const DEMO_CONTACT: FooterInfoContact = {
  name: 'XXX',
  email: 'XXX',
  phone: 'XXX',
}

export const FOOTER_INFO_PAGES = {
  help: {
    menuLabel: '고객 서비스',
    title: '고객센터 안내',
    summary:
      '주문 전후에 가장 많이 요청되는 상담 흐름을 정리한 데모용 고객센터 페이지입니다.',
    sections: [
      {
        title: '상담 채널',
        description: '대부분의 패션 쇼핑몰이 제공하는 기본 상담 채널 흐름을 참고해 구성했습니다.',
        items: [
          '실시간 채팅: 주문/결제/배송 관련 즉시 문의 접수',
          '게시판 문의: 첨부 파일과 함께 상세 요청 등록',
          '전화 상담: 긴급 주문 변경 및 취소 요청 처리',
        ],
      },
      {
        title: '처리 기준 시간',
        description: '문의 유형별 우선순위에 따라 답변 순서가 달라질 수 있습니다.',
        items: [
          '일반 문의: 접수 후 영업일 기준 1~2일 이내 답변',
          '배송 지연 문의: 운송사 상태 확인 후 순차 안내',
          '환불 문의: 결제 수단별 환불 진행 상태 단계별 공유',
        ],
      },
      {
        title: '문의 전 확인 사항',
        description: '사전 정보가 많을수록 처리 속도가 빨라집니다.',
        items: [
          '주문번호, 상품명, 요청 내용을 함께 작성',
          '하자/오배송은 수령 후 7일 이내 증빙 이미지 첨부',
          '중복 문의 등록 시 처리 지연 가능성 안내',
        ],
      },
    ],
    relatedLinks: [
      { href: '/faq', label: '자주 묻는 질문' },
      { href: '/shipping', label: '배송 정보' },
      { href: '/returns', label: '교환 및 반품' },
    ],
    contact: DEMO_CONTACT,
  },
  faq: {
    menuLabel: '고객 서비스',
    title: '자주 묻는 질문',
    summary:
      '실무 운영에서 반복되는 질문 유형을 기준으로 만든 데모 FAQ입니다.',
    sections: [
      {
        title: '주문/결제',
        description: '결제 전후 문의 비중이 가장 큰 항목입니다.',
        items: [
          'Q. 주문 후 주소를 바꿀 수 있나요? A. 출고 전 상태에서만 변경 요청 가능합니다.',
          'Q. 결제 수단을 변경할 수 있나요? A. 기존 주문 취소 후 재주문이 기본 정책입니다.',
          'Q. 무통장 입금 확인은 언제 되나요? A. 입금 확인 배치 시간에 맞춰 순차 반영됩니다.',
        ],
      },
      {
        title: '배송',
        description: '택배사 연동 상태에 따라 실시간 반영 시점이 달라질 수 있습니다.',
        items: [
          'Q. 배송 추적은 어디서 확인하나요? A. 마이페이지 주문 상세에서 확인할 수 있습니다.',
          'Q. 부분 배송이 가능한가요? A. 재고/물류 위치에 따라 부분 배송될 수 있습니다.',
          'Q. 배송이 멈춘 것처럼 보여요. A. 택배사 스캔 지연 구간일 수 있어 1일 추가 확인이 필요합니다.',
        ],
      },
      {
        title: '교환/반품',
        description: '패션 카테고리 특성상 사이즈/색상 문의가 자주 발생합니다.',
        items: [
          'Q. 사이즈 교환이 가능한가요? A. 동일 상품 재고가 있을 때 교환 접수됩니다.',
          'Q. 환불은 언제 완료되나요? A. 반품 검수 완료 후 결제 수단별 정산 일정이 적용됩니다.',
          'Q. 사용 흔적이 있으면 반품되나요? A. 사용/세탁 흔적이 있으면 반품이 제한될 수 있습니다.',
        ],
      },
    ],
    relatedLinks: [
      { href: '/help', label: '고객센터' },
      { href: '/shipping', label: '배송 정보' },
      { href: '/returns', label: '교환 및 반품' },
    ],
    contact: DEMO_CONTACT,
  },
  shipping: {
    menuLabel: '고객 서비스',
    title: '배송 정보',
    summary: '국내 일반 패션몰 배송 정책을 참고해 구성한 데모 배송 안내입니다.',
    sections: [
      {
        title: '배송 옵션',
        description: '상품별 재고 위치와 출고 마감 시간에 따라 옵션이 달라질 수 있습니다.',
        items: [
          '일반 배송: 결제 완료 후 순차 출고',
          '당일 출고 가능 상품: 지정 시간 이전 결제 시 우선 출고',
          '예약 배송 상품: 입고 일정에 맞춰 출고 예정일 별도 안내',
        ],
      },
      {
        title: '배송 상태 단계',
        description: '주문부터 수령 완료까지 추적 상태를 단계별로 확인할 수 있습니다.',
        items: [
          '결제 완료 > 출고 준비 > 배송 중 > 배송 완료',
          '출고 이후 주소 변경/취소는 제한될 수 있음',
          '운송장 등록 직후에는 조회 반영까지 시간이 필요함',
        ],
      },
      {
        title: '도서산간 및 예외',
        description: '지역/기상/물류 이슈 발생 시 배송 일정이 변동될 수 있습니다.',
        items: [
          '도서산간 지역은 추가 운송일이 필요할 수 있음',
          '연휴/프로모션 기간에는 배송량 증가로 지연 가능',
          '장기 미수령 건은 고객센터를 통해 재배송 요청 가능',
        ],
      },
    ],
    relatedLinks: [
      { href: '/help', label: '고객센터' },
      { href: '/faq', label: '자주 묻는 질문' },
      { href: '/returns', label: '교환 및 반품' },
    ],
    contact: DEMO_CONTACT,
  },
  returns: {
    menuLabel: '고객 서비스',
    title: '교환 및 반품 안내',
    summary:
      '의류/잡화 쇼핑몰에서 일반적으로 운영하는 교환·반품 절차를 반영한 데모 페이지입니다.',
    sections: [
      {
        title: '접수 가능 조건',
        description: '제품 상태와 기간이 기준에 맞아야 정상 접수됩니다.',
        items: [
          '수령 후 7일 이내 접수된 건',
          '상품 택/구성품이 훼손되지 않은 상태',
          '맞춤 제작/위생 상품은 제한될 수 있음',
        ],
      },
      {
        title: '접수 방법',
        description: '마이페이지에서 주문 단위로 교환 또는 반품 신청이 가능합니다.',
        items: [
          '마이페이지 > 주문 내역 > 교환/반품 신청',
          '사유 선택 후 사진 첨부 시 검수 속도 향상',
          '회수 신청 완료 후 택배 수거 일정 확인',
        ],
      },
      {
        title: '환불 및 재배송',
        description: '검수 결과에 따라 환불 또는 교환 출고가 진행됩니다.',
        items: [
          '검수 완료 후 환불 승인 단계로 이동',
          '교환은 재고 확보 시 재출고 일정 안내',
          '프로모션 쿠폰 사용 주문은 재계산 기준이 적용될 수 있음',
        ],
      },
    ],
    relatedLinks: [
      { href: '/help', label: '고객센터' },
      { href: '/faq', label: '자주 묻는 질문' },
      { href: '/shipping', label: '배송 정보' },
    ],
    contact: DEMO_CONTACT,
  },
  about: {
    menuLabel: '회사 정보',
    title: '회사 소개',
    summary:
      '온라인 패션 편집숍에서 자주 사용하는 소개 페이지 구성을 기준으로 만든 데모입니다.',
    sections: [
      {
        title: '브랜드 방향',
        description: '빠른 트렌드 반영과 기본 품질 확보를 핵심 원칙으로 설정했습니다.',
        items: [
          '시즌별 큐레이션 중심 상품 구성',
          '모바일 중심 구매 경험 최적화',
          '데이터 기반 재고 운영으로 품절 리스크 완화',
        ],
      },
      {
        title: '서비스 약속',
        description: '주문 이후 경험까지 포함해 서비스 품질을 관리합니다.',
        items: [
          '상품 정보의 명확한 표기',
          '주문 단계별 상태 알림 제공',
          '문의 대응 SLA 기반의 운영 체계 유지',
        ],
      },
      {
        title: '운영 구조',
        description: '기획, 상품, 물류, CS 부서가 같은 지표를 공유하도록 설계했습니다.',
        items: [
          '상품팀: 트렌드 분석과 셀렉션 운영',
          '운영팀: 주문/출고/재고 흐름 관리',
          '고객경험팀: VOC 수집과 정책 개선',
        ],
      },
    ],
    relatedLinks: [
      { href: '/careers', label: '채용 정보' },
      { href: '/press', label: '보도 자료' },
      { href: '/sustainability', label: '지속 가능성' },
    ],
    contact: DEMO_CONTACT,
  },
  careers: {
    menuLabel: '회사 정보',
    title: '채용 정보',
    summary:
      '이커머스 기업 채용 페이지 패턴을 참고해 만든 데모 채용 안내입니다.',
    sections: [
      {
        title: '모집 직무',
        description: '서비스 성장 단계에서 우선 확보가 필요한 직무 중심으로 정리했습니다.',
        items: [
          '프론트엔드/백엔드 개발',
          '상품 운영 및 MD',
          '물류 운영/고객 경험(CX)',
        ],
      },
      {
        title: '전형 절차',
        description: '지원 직무에 따라 과제 또는 포트폴리오 검토가 추가될 수 있습니다.',
        items: [
          '서류 접수 > 1차 인터뷰 > 2차 인터뷰 > 최종 안내',
          '직무 역량 중심 질문과 협업 방식 확인',
          '지원서 접수 후 단계별 결과 개별 공지',
        ],
      },
      {
        title: '근무 문화',
        description: '실행 속도와 문서 기반 협업을 동시에 중요하게 다룹니다.',
        items: [
          '목표 기반 스프린트 운영',
          '직무 간 리뷰 문화와 회고 정례화',
          '개선 제안이 실제 정책 변경으로 연결되는 구조',
        ],
      },
    ],
    relatedLinks: [
      { href: '/about', label: '회사 소개' },
      { href: '/press', label: '보도 자료' },
      { href: '/sustainability', label: '지속 가능성' },
    ],
    contact: DEMO_CONTACT,
  },
  press: {
    menuLabel: '회사 정보',
    title: '보도 자료',
    summary:
      '브랜드 소식, 캠페인, 업데이트 공지를 위한 데모 보도 자료 페이지입니다.',
    sections: [
      {
        title: '최근 공지 예시',
        description: '아래 항목은 실제 기사/보도문이 아닌 샘플 텍스트입니다.',
        items: [
          '시즌 신상품 큐레이션 캠페인 오픈',
          '배송 추적 화면 개선 및 알림 기능 업데이트',
          '반품 접수 UX 단순화로 처리 시간 단축',
        ],
      },
      {
        title: '미디어 요청',
        description: '콘텐츠 사용 요청은 사전 접수 후 검토됩니다.',
        items: [
          '브랜드 소개 문구 사용 전 사전 승인 요청',
          '로고/이미지 사용은 가이드라인 준수 필요',
          '인터뷰/코멘트 요청은 일정 협의 후 진행',
        ],
      },
      {
        title: '자료 제공 범위',
        description: '대외 공개 가능한 범위 내에서만 정보가 제공됩니다.',
        items: [
          '서비스 개요 및 운영 정책 요약',
          '공개 가능한 캠페인/이벤트 정보',
          '비공개 데이터 및 개인 정보는 제외',
        ],
      },
    ],
    relatedLinks: [
      { href: '/about', label: '회사 소개' },
      { href: '/careers', label: '채용 정보' },
      { href: '/sustainability', label: '지속 가능성' },
    ],
    contact: DEMO_CONTACT,
  },
  sustainability: {
    menuLabel: '회사 정보',
    title: '지속 가능성',
    summary:
      '패션 이커머스에서 일반적으로 공시하는 지속 가능성 항목을 참고한 데모 콘텐츠입니다.',
    sections: [
      {
        title: '포장 정책',
        description: '불필요한 포장재를 줄이고 재활용 가능한 자재 사용을 우선합니다.',
        items: [
          '단일 주문 합포장 기본 적용',
          '완충재 최소화 기준 운영',
          '재활용 가능한 포장 비율 단계적 확대',
        ],
      },
      {
        title: '상품 운영',
        description: '장기적으로 친환경 기준을 충족하는 라인업을 늘리는 것을 목표로 합니다.',
        items: [
          '소재/원단 정보 표기 강화',
          '내구성 중심의 기본 상품 확대',
          '시즌 종료 재고의 순환 판매 정책 도입',
        ],
      },
      {
        title: '물류와 반품',
        description: '운송/반품 과정에서 발생하는 자원 낭비를 줄이는 데 집중합니다.',
        items: [
          '회수 동선 최적화로 이동 거리 절감',
          '반품 사유 분석 기반 품질 개선',
          '재판매 가능 상품의 재검수 프로세스 운영',
        ],
      },
    ],
    relatedLinks: [
      { href: '/about', label: '회사 소개' },
      { href: '/careers', label: '채용 정보' },
      { href: '/press', label: '보도 자료' },
    ],
    contact: DEMO_CONTACT,
  },
  terms: {
    menuLabel: '법적 고지',
    title: '이용약관',
    summary:
      '일반적인 쇼핑몰 이용약관 목차를 단순화해 제공하는 데모 약관 페이지입니다.',
    sections: [
      {
        title: '서비스 이용 기본',
        description: '회원/비회원 모두에게 적용되는 공통 이용 기준입니다.',
        items: [
          '서비스 제공 범위와 변경 가능성 안내',
          '시스템 점검/장애 시 공지 원칙',
          '약관 개정 시 사전 공지 및 효력 발생 시점 명시',
        ],
      },
      {
        title: '주문 및 결제',
        description: '주문 성립 조건과 결제 실패/취소 처리 기준을 명시합니다.',
        items: [
          '주문 완료 후 재고/가격 오류 발생 시 별도 안내',
          '결제 수단별 승인 및 취소 처리 시간 차이 존재',
          '부정 결제 의심 거래는 보류 또는 취소될 수 있음',
        ],
      },
      {
        title: '회원 의무',
        description: '계정 보안과 서비스 질서 유지를 위한 최소 의무 항목입니다.',
        items: [
          '계정 정보 최신 상태 유지',
          '타인 정보 도용 및 비정상 접근 금지',
          '약관 위반 시 서비스 이용 제한 가능',
        ],
      },
    ],
    relatedLinks: [
      { href: '/privacy', label: '개인정보처리방침' },
      { href: '/cookies', label: '쿠키 정책' },
      { href: '/help', label: '고객센터' },
    ],
    contact: DEMO_CONTACT,
  },
  privacy: {
    menuLabel: '법적 고지',
    title: '개인정보처리방침',
    summary:
      '실서비스 정책이 아닌 데모 목적의 개인정보 처리 항목 예시입니다.',
    sections: [
      {
        title: '수집 항목',
        description: '서비스 제공에 필요한 최소 범위 항목만 수집하는 것을 원칙으로 합니다.',
        items: [
          '회원 식별 정보(계정 생성 시 입력 정보)',
          '주문/배송 처리 정보',
          '서비스 이용 로그 및 접속 환경 정보',
        ],
      },
      {
        title: '이용 목적',
        description: '수집된 정보는 명시된 목적 범위 안에서만 사용됩니다.',
        items: [
          '주문 이행 및 고객 문의 대응',
          '서비스 품질 개선 및 오류 분석',
          '이벤트/혜택 안내(동의한 경우에 한함)',
        ],
      },
      {
        title: '보관 및 파기',
        description: '관계 법령 또는 내부 보관 기준에 따라 관리됩니다.',
        items: [
          '목적 달성 후 지체 없이 파기',
          '법령상 보관 의무 항목은 예외적으로 보관',
          '파기 시 복구 불가 방식 적용',
        ],
      },
    ],
    relatedLinks: [
      { href: '/terms', label: '이용약관' },
      { href: '/cookies', label: '쿠키 정책' },
      { href: '/help', label: '고객센터' },
    ],
    contact: DEMO_CONTACT,
  },
  cookies: {
    menuLabel: '법적 고지',
    title: '쿠키 정책',
    summary:
      '쿠키 사용 목적과 관리 방법을 이해하기 쉽게 정리한 데모 정책 페이지입니다.',
    sections: [
      {
        title: '쿠키 종류',
        description: '서비스 운영에 필요한 필수 쿠키와 선택 쿠키를 구분합니다.',
        items: [
          '필수 쿠키: 로그인 유지, 장바구니 상태 유지',
          '성능 쿠키: 페이지 로딩/오류 지표 분석',
          '맞춤 쿠키: 사용자 선호 설정 반영',
        ],
      },
      {
        title: '활용 목적',
        description: '쿠키 데이터는 서비스 안정화와 사용자 경험 개선에 활용됩니다.',
        items: [
          '반복 입력 최소화 및 편의 기능 제공',
          '비정상 트래픽 탐지 및 보안 강화',
          '화면 개선을 위한 사용 패턴 통계 확인',
        ],
      },
      {
        title: '관리 방법',
        description: '브라우저 설정을 통해 쿠키 저장을 제한하거나 삭제할 수 있습니다.',
        items: [
          '브라우저 설정에서 쿠키 차단/삭제 가능',
          '쿠키 비활성화 시 일부 기능 제한 가능',
          '정책 변경 시 공지 후 갱신 버전 적용',
        ],
      },
    ],
    relatedLinks: [
      { href: '/terms', label: '이용약관' },
      { href: '/privacy', label: '개인정보처리방침' },
      { href: '/help', label: '고객센터' },
    ],
    contact: DEMO_CONTACT,
  },
} as const satisfies Record<string, FooterInfoPageData>

export const FOOTER_INFO_PAGE_KEYS = Object.keys(FOOTER_INFO_PAGES) as Array<
  keyof typeof FOOTER_INFO_PAGES
>

export type FooterInfoPageKey = (typeof FOOTER_INFO_PAGE_KEYS)[number]

// 동적 라우트에서 안전하게 키를 판별하기 위한 타입 가드 함수다.
export const isFooterInfoPageKey = (
  value: string,
): value is FooterInfoPageKey => value in FOOTER_INFO_PAGES

