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
  const fetchCart = useShopStore(state => state.fetchCart)
  const fetchWishlist = useShopStore(state => state.fetchWishlist)

  useEffect(() => {
    if (user) {
      fetchCart()
      fetchWishlist()
    }
  }, [user, fetchCart, fetchWishlist])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
