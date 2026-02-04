import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { CartItem } from "./cart"
import type { WishlistItem } from "./wishlist"

interface ShopState {
  cart: CartItem[]
  wishlist: WishlistItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (id: string) => void
  updateCartItemQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  addToWishlist: (item: WishlistItem) => void
  removeFromWishlist: (id: string) => void
  clearWishlist: () => void
  isInWishlist: (id: string) => boolean
}

export const useShopStore = create(
  persist<ShopState>(
    (set, get) => ({
      cart: [],
      wishlist: [],
      addToCart: (item) =>
        set((state) => {
          const existingItem = state.cart.find((i) => i.id === item.id)
          if (existingItem) {
            return {
              cart: state.cart.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)),
            }
          }
          return { cart: [...state.cart, item] }
        }),
      removeFromCart: (id) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== id),
        })),
      updateCartItemQuantity: (id, quantity) =>
        set((state) => ({
          cart: state.cart.map((item) => (item.id === id ? { ...item, quantity } : item)),
        })),
      clearCart: () => set({ cart: [] }),
      addToWishlist: (item) =>
        set((state) => {
          if (!state.wishlist.some((i) => i.id === item.id)) {
            return { wishlist: [...state.wishlist, item] }
          }
          return state
        }),
      removeFromWishlist: (id) =>
        set((state) => ({
          wishlist: state.wishlist.filter((item) => item.id !== id),
        })),
      clearWishlist: () => set({ wishlist: [] }),
      isInWishlist: (id) => get().wishlist.some((item) => item.id === id),
    }),
    {
      name: "shop-storage",
    },
  ),
)

interface AuthState {
  user: { id: string; name: string; email: string } | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        set({ user: data.user, isLoading: false })
        return true
      } else {
        set({ user: null, isLoading: false })
        return false
      }
    } catch (error) {
      console.error("Login failed:", error)
      set({ user: null, isLoading: false })
      return false
    }
  },
  logout: () => set({ user: null }),
}))

