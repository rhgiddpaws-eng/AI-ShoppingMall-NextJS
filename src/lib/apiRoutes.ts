/**
 * apiRoutes - API 경로 상수 및 타입 정의
 *
 * [기능]
 * - 앱 전체에서 사용하는 API URL을 한 곳에서 관리 (오타·경로 변경 시 유지보수 용이)
 * - 타입으로 경로 구조를 보장해 자동완성·리팩터링에 활용
 *
 * [문법]
 * - interface ApiRoutes: 중첩된 routes 구조에 대한 타입 (admin, products, login 등)
 * - '[id]': 동적 세그먼트 라우트를 객체 키로 표현 (Next.js [id] 폴더 대응)
 * - export const apiRoutes: 실제 경로 문자열을 담은 객체 (자동 생성/수동 관리)
 */

/** API 라우트 트리 타입 — path와 중첩 routes로 구성 */
/**
 * [쉬운 설명]
 * 
 * 이 코드는 "apiRoutes" 라는 객체에 프로젝트에서 자주 쓰이는 API 경로(주소)를 
 * 한 군데에 다 모아두고, 주소가 바뀌면 한 군데만 고치면 되도록 하는 역할을 합니다.
 * TypeScript 타입을 이용해 구조(모양)까지 엄격하게 잡아주는 역할을 합니다.
 * 
 * 쉽게 말해, API 주소를 하드코딩해서 여기저기 쓰는 게 아니라,
 * 미리 정해놓은 정리표(apiRoutes)에서 꺼내서 쓰도록 하는 것!
 * 나중에 주소가 바뀌어도 여기에 한 번만 고치면 돼서 편리함.
 * 
 * [문법 설명]
 * 
 * - interface ApiRoutes:
 *     구조(모양)를 정의. 중첩 객체로 구성이 복잡해보이지만,
 *     이 덕분에 "apiRoutes.routes.admin.routes.orders.routes['[id]'].path" 처럼
 *     자동완성도 빵빵하게 잘 됨!
 *     '[id]': 동적 라우팅에 쓰는 부분(Next.js의 /[id])
 * 
 * - export const apiRoutes:
 *     실제 값(객체). 위에서 만든 interface에 맞게 실제 주소들을 채워넣은 모습.
 *     "apiRoutes.routes.login.path" 이런 식으로 쓰면 "/api/login" 값을 바로 얻을 수 있음.
 * 
 * [실전 예시]
 * fetch(apiRoutes.routes.products.path) === fetch("/api/products")
 * // [id]가 들어간 예시:
 * fetch(apiRoutes.routes.products.routes['[id]'].path.replace('[id]', '123'))
 *   === fetch("/api/products/123")
 */

// 1. 타입 정의: API 경로 구조를 엄격하게 관리할 수 있도록 함
interface ApiRoutes {
  routes: {
    admin: {
      routes: {
        dashboard: { path: string }
        orders: {
          path: string
          routes: { '[id]': { path: string } }
        }
        products: {
          path: string
          routes: { '[id]': { path: string } }
        }
        users: {
          path: string
          routes: { '[id]': { path: string } }
        }
      }
    }
    embeddings: { path: string }
    embeddings_alibaba_qwen: { path: string }
    login: { path: string }
    presignedUrl: { path: string }
    products: {
      path: string
      routes: {
        infinite: { path: string }
        '[id]': { path: string }
      }
    }
    register: { path: string }
    /** 로그인 사용자 전용: 장바구니·위시리스트·주문 (서버 DB 연동) */
    user: {
      routes: {
        cart: { path: string }
        wishlist: { path: string }
        orders: { path: string }
      }
    }
  }
}

// 2. 실제 값(주소들) 채우기. 위 타입(interface)에 맞게 정확히 입력해야 타입 오류 없음
export const apiRoutes: ApiRoutes = {
  routes: {
    admin: {
      routes: {
        dashboard: { path: "/api/admin/dashboard" },
        orders: {
          path: "/api/admin/orders",
          routes: { "[id]": { path: "/api/admin/orders/[id]" } }
        },
        products: {
          path: "/api/admin/products",
          routes: { "[id]": { path: "/api/admin/products/[id]" } }
        },
        users: {
          path: "/api/admin/users",
          routes: { "[id]": { path: "/api/admin/users/[id]" } }
        }
      }
    },
    embeddings: { path: "/api/embeddings" },
    embeddings_alibaba_qwen: { path: "/api/embeddings_alibaba_qwen" },
    login: { path: "/api/login" },
    presignedUrl: { path: "/api/presignedUrl" },
    products: {
      path: "/api/products",
      routes: {
        infinite: { path: "/api/products/infinite" },
        "[id]": { path: "/api/products/[id]" }
      }
    },
    register: { path: "/api/register" },
    user: {
      routes: {
        cart: { path: "/api/user/cart" },
        wishlist: { path: "/api/user/wishlist" },
        orders: { path: "/api/user/orders" },
      },
    },
  },
}
