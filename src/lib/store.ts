/**
 * store - Zustand 전역 스토어 (장바구니·위시리스트·인증)
 *
 * [장바구니/위시리스트 - 서버·로컬 이원화]
 * - 로그인 사용자: GET /api/user/cart, /api/user/wishlist 로 
 * - 서버에서 조회·갱신. 추가/삭제/수량 변경 시 API 호출 후 응답으로 스토어 갱신.
 * 
 * - 비로그인 사용자: API 401 시 로컬(persist) 상태로 fallback. 
 * - localStorage 키 'shop-storage'로 유지.
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
import type { CartItem } from './cart'
import type { WishlistItem } from './wishlist'
import { LoginResponse } from '@/app/api/login/route'
import { apiRoutes } from './apiRoutes'
import { logout } from './ironSessionControl'

const cartPath = apiRoutes.routes.user.routes.cart.path
const wishlistPath = apiRoutes.routes.user.routes.wishlist.path
const fetchOpts: RequestInit = { credentials: 'include' }

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
  addToCart: (item: CartItem) => void | Promise<void>
  removeFromCart: (id: string) => void | Promise<void>
  updateCartItemQuantity: (id: string, quantity: number) => void | Promise<void>
  clearCart: () => void | Promise<void>
  addToWishlist: (item: WishlistItem) => void | Promise<void>
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
          const res = await fetch(cartPath, fetchOpts)
          if (!res.ok) return
          const data = (await res.json()) as { cart: CartItem[] }
          set({ cart: data.cart ?? [] })
        } catch (e) {
          console.error('fetchCart:', e)
        }
      },
      fetchWishlist: async () => {
        try {
          const res = await fetch(wishlistPath, fetchOpts)
          if (!res.ok) return
          const data = (await res.json()) as { wishlist: WishlistItem[] }
          set({ wishlist: data.wishlist ?? [] })
        } catch (e) {
          console.error('fetchWishlist:', e)
        }
      },
      addToCart: item => {
        const state = get()
        const existing = state.cart.find(i => i.id === item.id)
        const quantity = existing ? existing.quantity + 1 : 1
        ;(async () => {
          try {
            const res = await fetch(cartPath, {
              ...fetchOpts,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: Number(item.id), quantity }),
            })
            if (res.ok) {
              const data = (await res.json()) as { cart: CartItem[] }
              set({ cart: data.cart ?? [] })
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
      },
      removeFromCart: id => {
        ;(async () => {
          try {
            const res = await fetch(`${cartPath}?productId=${id}`, {
              ...fetchOpts,
              method: 'DELETE',
            })
            if (res.ok) {
              const data = (await res.json()) as { cart: CartItem[] }
              set({ cart: data.cart ?? [] })
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
            const res = await fetch(cartPath, {
              ...fetchOpts,
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: Number(id), quantity }),
            })
            if (res.ok) {
              const data = (await res.json()) as { cart: CartItem[] }
              set({ cart: data.cart ?? [] })
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
            const res = await fetch(cartPath, { ...fetchOpts, method: 'DELETE' })
            if (res.ok) {
              const data = (await res.json()) as { cart: CartItem[] }
              set({ cart: data.cart ?? [] })
              return
            }
          } catch (e) {
            console.error('clearCart API:', e)
          }
          set({ cart: [] })
        })()
      },
      addToWishlist: item => {
        ;(async () => {
          try {
            const res = await fetch(wishlistPath, {
              ...fetchOpts,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: Number(item.id) }),
            })
            if (res.ok) {
              const data = (await res.json()) as { wishlist: WishlistItem[] }
              set({ wishlist: data.wishlist ?? [] })
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
      },
      removeFromWishlist: id => {
        ;(async () => {
          try {
            const res = await fetch(`${wishlistPath}?productId=${id}`, {
              ...fetchOpts,
              method: 'DELETE',
            })
            if (res.ok) {
              const data = (await res.json()) as { wishlist: WishlistItem[] }
              set({ wishlist: data.wishlist ?? [] })
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
            const res = await fetch(wishlistPath, { ...fetchOpts, method: 'DELETE' })
            if (res.ok) {
              const data = (await res.json()) as { wishlist: WishlistItem[] }
              set({ wishlist: data.wishlist ?? [] })
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
  isLoading: boolean
  isHydrated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

/** 인증 전역 스토어. localStorage 키 'auth-storage'로 persist */
export const useAuthStore = create(
  persist<AuthState>(
    set => ({
      user: null,
      isLoading: false,
      isHydrated: false,
      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const data = await fetchLogin(email, password)
          if (data.ok) {
            set({ user: data.user, isLoading: false })
            return true
          } else {
            set({ user: null, isLoading: false })
            return false
          }
        } catch (error) {
          console.error('Login failed:', error)
          set({ user: null, isLoading: false })
          return false
        }
      },
      logout: () => {
        set({ user: null })
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
  const data = (await response.json()) as LoginResponse
  return data
}
