/**
 * store - Zustand 전역 스토어 (장바구니·위시리스트·인증)
 *
 * [장바구니/위시리스트 - 서버·로컬 이원화]
 * - 로그인 사용자: GET /api/user/cart, /api/user/wishlist 로 
 * - 서버에서 조회·갱신. 추가/삭제/수량 변경 시 API 호출 후 응답으로 스토어 갱신.
 * 
 * - 비로그인 사용자: 장바구니/위시리스트 추가 불가(로그인 유도 토스트). 노출은 비움(ShopContext).
 * - fetchCart/fetchWishlist: ShopProvider에서 로그인 시 한 번 호출해 
 * - 서버 데이터로 스토어 채움.
 *
 * [기능]
 * - useShopStore: setCart/setWishlist(API 응답 반영), fetchCart/fetchWishlist(초기 로드), addToCart 등(API 또는 로컬 갱신)
 * - useAuthStore: 로그인 사용자, login/logout, persist로 UI 캐시
 * - credentials: 'include': fetch 시 쿠키(세션) 포함
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'
import type { CartItem } from './cart'
import type { WishlistItem } from './wishlist'
import { LoginResponse } from '@/app/api/login/route'
import { apiRoutes } from './apiRoutes'
import { logout } from './ironSessionControl'

const cartPath = apiRoutes.routes.user.routes.cart.path
const wishlistPath = apiRoutes.routes.user.routes.wishlist.path

/** 응답이 JSON이 아닐 때(HTML 에러 페이지 등) JSON 파싱 오류 방지 */
async function safeJson<T>(res: Response): Promise<T | null> {
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) return null
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

/** 인증이 필요한 fetch 시 사용. JWT 있으면 Authorization 헤더 추가 */
function authFetchOpts(extra: RequestInit = {}): RequestInit {
  const token = typeof window !== 'undefined' ? useAuthStore.getState().token : null
  const headers: Record<string, string> = { ...(extra.headers as Record<string, string>) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return { credentials: 'include', ...extra, headers }
}

/**
   * addToWishlist:
   * 위시리스트란? - 사용자가 "나중에 다시 보고싶은 상품"/"관심 상품"을 등록해 두는 목록.
   * (즉, 찜, 관심상품, 유저별 즐겨찾기 같은 기능)
   * 실제 저장 방식은 로그인 시 서버의 /api/user/wishlist (자기 계정에 저장) 또는
   * 비로그인 시 로컬스토리지(브라우저) 사용.
   * addToWishlist는 상품을 위시리스트(찜 목록)에 추가한다.
   */
interface ShopState {
  cart: CartItem[]
  wishlist: WishlistItem[]
  setCart: (cart: CartItem[]) => void
  setWishlist: (wishlist: WishlistItem[]) => void
  fetchCart: () => Promise<void>
  fetchWishlist: () => Promise<void>
  addToCart: (item: CartItem) => boolean
  removeFromCart: (id: string) => void | Promise<void>
  updateCartItemQuantity: (id: string, quantity: number) => void | Promise<void>
  clearCart: () => void | Promise<void>
  addToWishlist: (item: WishlistItem) => boolean
  removeFromWishlist: (id: string) => void | Promise<void>
  clearWishlist: () => void | Promise<void>
  isInWishlist: (id: string) => boolean
}

/** 장바구니·위시리스트. 로그인 시 서버 API로 갱신, 401이면 로컬(persist) 유지 */
export const useShopStore = create(
  persist<ShopState>(
    (set, get) => ({
      cart: [],
      wishlist: [],
      setCart: cart => set({ cart }),
      setWishlist: wishlist => set({ wishlist }),
      fetchCart: async () => {
        try {
          const res = await fetch(cartPath, authFetchOpts())
          if (!res.ok) return
          const data = await safeJson<{ cart: CartItem[] }>(res)
          if (data?.cart) set({ cart: data.cart })
        } catch (e) {
          console.error('fetchCart:', e)
        }
      },
      fetchWishlist: async () => {
        try {
          const res = await fetch(wishlistPath, authFetchOpts())
          if (!res.ok) return
          const data = await safeJson<{ wishlist: WishlistItem[] }>(res)
          if (data?.wishlist) set({ wishlist: data.wishlist })
        } catch (e) {
          console.error('fetchWishlist:', e)
        }
      },
      addToCart: item => {
        if (!useAuthStore.getState().user) {
          toast.info('장바구니는 로그인 후 이용할 수 있습니다.')
          return false
        }
        const state = get()
        const existing = state.cart.find(i => i.id === item.id)
        const quantity = existing ? existing.quantity + 1 : 1
        ;(async () => {
          try {
            const res = await fetch(cartPath, authFetchOpts({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: Number(item.id), quantity }),
            }))
            if (res.ok) {
const data = await safeJson<{ cart: CartItem[] }>(res)
              if (data?.cart) set({ cart: data.cart })
              return
            }
          } catch (e) {
            console.error('addToCart API:', e)
          }
          set(s => {
            const existingItem = s.cart.find(i => i.id === item.id)
            if (existingItem) {
              return {
                cart: s.cart.map(i =>
                  i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
                ),
              }
            }
            return { cart: [...s.cart, item] }
          })
        })()
        return true
      },
      removeFromCart: id => {
        ;(async () => {
          try {
            const res = await fetch(`${cartPath}?productId=${id}`, authFetchOpts({ method: 'DELETE' }))
            if (res.ok) {
const data = await safeJson<{ cart: CartItem[] }>(res)
              if (data?.cart) set({ cart: data.cart })
              return
            }
          } catch (e) {
            console.error('removeFromCart API:', e)
          }
          set(s => ({ cart: s.cart.filter(item => item.id !== id) }))
        })()
      },
      updateCartItemQuantity: (id, quantity) => {
        ;(async () => {
          try {
            const res = await fetch(cartPath, authFetchOpts({
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: Number(id), quantity }),
            }))
            if (res.ok) {
const data = await safeJson<{ cart: CartItem[] }>(res)
              if (data?.cart) set({ cart: data.cart })
              return
            }
          } catch (e) {
            console.error('updateCartItemQuantity API:', e)
          }
          set(s => ({
            cart: s.cart.map(item =>
              item.id === id ? { ...item, quantity } : item,
            ),
          }))
        })()
      },
      clearCart: () => {
        ;(async () => {
          try {
            const res = await fetch(cartPath, authFetchOpts({ method: 'DELETE' }))
            if (res.ok) {
const data = await safeJson<{ cart: CartItem[] }>(res)
              if (data?.cart) set({ cart: data.cart })
              return
            }
          } catch (e) {
            console.error('clearCart API:', e)
          }
          set({ cart: [] })
        })()
      },
      addToWishlist: item => {
        if (!useAuthStore.getState().user) {
          toast.info('위시리스트는 로그인 후 이용할 수 있습니다.')
          return false
        }
        ;(async () => {
          try {
            const res = await fetch(wishlistPath, authFetchOpts({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: Number(item.id) }),
            }))
            if (res.ok) {
              const data = await safeJson<{ wishlist: WishlistItem[] }>(res)
              if (data?.wishlist) set({ wishlist: data.wishlist })
              return
            }
          } catch (e) {
            console.error('addToWishlist API:', e)
          }
          set(s => {
            if (!s.wishlist.some(i => i.id === item.id)) {
              return { wishlist: [...s.wishlist, item] }
            }
            return s
          })
        })()
        return true
      },
      removeFromWishlist: id => {
        ;(async () => {
          try {
            const res = await fetch(`${wishlistPath}?productId=${id}`, authFetchOpts({ method: 'DELETE' }))
            if (res.ok) {
              const data = await safeJson<{ wishlist: WishlistItem[] }>(res)
              if (data?.wishlist) set({ wishlist: data.wishlist })
              return
            }
          } catch (e) {
            console.error('removeFromWishlist API:', e)
          }
          set(s => ({
            wishlist: s.wishlist.filter(item => item.id !== id),
          }))
        })()
      },
      clearWishlist: () => {
        ;(async () => {
          try {
            const res = await fetch(wishlistPath, authFetchOpts({ method: 'DELETE' }))
            if (res.ok) {
              const data = await safeJson<{ wishlist: WishlistItem[] }>(res)
              if (data?.wishlist) set({ wishlist: data.wishlist })
              return
            }
          } catch (e) {
            console.error('clearWishlist API:', e)
          }
          set({ wishlist: [] })
        })()
      },
      isInWishlist: id => get().wishlist.some(item => item.id === id),
    }),
    { name: 'shop-storage' },
  ),
)

interface AuthState {
  user: { id: number; name?: string; email: string; role?: string } | null
  token: string | null
  isLoading: boolean
  isHydrated: boolean
  login: (email: string, password: string) => Promise<boolean>
  setAuthFromSession: () => Promise<boolean>
  logout: () => void
}

/** 인증 전역 스토어. localStorage 키 'auth-storage'로 persist. JWT token 저장 후 API 요청 시 Authorization 헤더로 전송 */
export const useAuthStore = create(
  persist<AuthState>(
    set => ({
      user: null,
      token: null,
      isLoading: false,
      isHydrated: false,
      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const data = await fetchLogin(email, password)
          if (data.ok) {
            set({ user: data.user, token: data.token ?? null, isLoading: false })
            return true
          } else {
            set({ user: null, token: null, isLoading: false })
            return false
          }
        } catch (error) {
          console.error('Login failed:', error)
          set({ user: null, token: null, isLoading: false })
          return false
        }
      },
      setAuthFromSession: async () => {
        try {
          const res = await fetch('/api/auth/me', { credentials: 'include' })
          const data = await safeJson<{ ok?: boolean; user?: AuthState['user']; token?: string }>(res)
          if (data?.ok && data.user && data.token) {
            set({ user: data.user, token: data.token })
            return true
          }
          return false
        } catch (e) {
          console.error('setAuthFromSession:', e)
          return false
        }
      },
      logout: () => {
        set({ user: null, token: null })
        /** 로그아웃 시 장바구니·위시리스트도 비움(나의 정보가 없으므로 노출하지 않음) */
        useShopStore.getState().setCart([])
        useShopStore.getState().setWishlist([])
        /** 서버 세션(쿠키)도 삭제 */
        logout()
      },
    }),
    {
      name: 'auth-storage',
      // isHydrated는 localStorage에 저장된 인증 정보(로그인 상태/유저 정보 등)가 
      // 클라이언트 스토어로 복구(초기화)됐는지 나타내는 플래그입니다.
      // 즉, 로그인 여부와 관계없이 저장된 데이터가 완전히 로드됐음을 확인하는 용도입니다.
      // 예를 들어, 앱이 처음 로드될 때 persisted state가 다 불러와졌는지 체크할 때 사용할 수 있습니다.
      // 저장된(로그인) 정보가 불러와진 뒤 isHydrated를 true로 바꿉니다. 
      // 이걸로 로그인 상태가 '완전히' 복구됐는지 쉽게 알 수 있습니다.
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true
      },
    },
  ),
)

/** 로그인 API 호출. apiRoutes.routes.login.path로 POST, 쿠키 포함 */
export async function fetchLogin(email: string, password: string) {
  const response = await fetch(apiRoutes.routes.login.path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  const data = await safeJson<LoginResponse>(response)
  if (!data) {
    return { ok: false, error: '서버 응답이 올바르지 않습니다.' } as LoginResponse
  }
  return data
}
