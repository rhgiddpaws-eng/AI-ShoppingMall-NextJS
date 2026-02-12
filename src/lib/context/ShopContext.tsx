/**
 * ShopContext - React Query Provider + 로그인 시 장바구니/위시리스트 서버 동기화
 *
 * [역할]
 * - QueryClientProvider: 앱 전체에서 useQuery, useMutation 등 React Query 사용 가능.
 * - 로그인 사용자: useAuthStore.user가 있으면 fetchCart(), fetchWishlist()를 한 번 호출해
 *   /api/user/cart, /api/user/wishlist 에서 데이터를 받아 useShopStore에 반영(서버가 소스).
 *
 * [참고] 예전에는 cartItems/wishlistItems를 Context로 넘기고 useShopContext()로 쓰는 구조였으나,
 * 현재는 장바구니/위시리스트 데이터는 useShopStore(Zustand)에서만 사용하므로 Context 값은 제거됨.
 */

'use client'

import type React from 'react'
import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store'
import { useShopStore } from '@/lib/store'

/** React Query Provider. 로그인 시 장바구니/위시리스트를 서버에서 한 번 불러와 스토어에 채움 */
export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [queryClient] = useState(() => new QueryClient())
  const user = useAuthStore(state => state.user)
  const isHydrated = useAuthStore(state => state.isHydrated)
  const fetchCart = useShopStore(state => state.fetchCart)
  const fetchWishlist = useShopStore(state => state.fetchWishlist)
  const setCart = useShopStore(state => state.setCart)
  const setWishlist = useShopStore(state => state.setWishlist)

  //isHydrated === true이고 user === null
  //복구는 끝났고 유저가 없다는 뜻이니까, 
  //진짜 비로그인으로 보고 장바구니/위시리스트를 비우면 됨.

  useEffect(() => {
    if (user) {
      fetchCart()
      fetchWishlist()
    } else if (isHydrated) {
      /** 비로그인 상태가 확정되면 장바구니·위시리스트 비움(persist된 데이터 노출 방지) */
      setCart([])
      setWishlist([])
    }
  }, [user, isHydrated, fetchCart, fetchWishlist, setCart, setWishlist])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
