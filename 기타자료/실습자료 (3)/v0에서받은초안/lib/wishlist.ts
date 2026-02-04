// 위시리스트 타입 정의
export interface WishlistItem {
  id: string
  name: string
  price: number
  imageSrc: string
  category?: string
  salePrice?: number
}

// 위시리스트 아이템 추가
export function addToWishlist(product: WishlistItem) {
  if (typeof window === "undefined") return

  const wishlist = getWishlist()
  const existingItem = wishlist.find((item) => item.id === product.id)

  if (!existingItem) {
    wishlist.push(product)
    localStorage.setItem("wishlist", JSON.stringify(wishlist))
  }

  return wishlist
}

// 위시리스트 아이템 삭제
export function removeFromWishlist(id: string) {
  if (typeof window === "undefined") return

  const wishlist = getWishlist()
  const updatedWishlist = wishlist.filter((item) => item.id !== id)

  localStorage.setItem("wishlist", JSON.stringify(updatedWishlist))
  return updatedWishlist
}

// 위시리스트 가져오기
export function getWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return []

  const wishlistData = localStorage.getItem("wishlist")
  return wishlistData ? JSON.parse(wishlistData) : []
}

// 위시리스트에 있는지 확인
export function isInWishlist(id: string): boolean {
  if (typeof window === "undefined") return false

  const wishlist = getWishlist()
  return wishlist.some((item) => item.id === id)
}

// 위시리스트 비우기
export function clearWishlist() {
  if (typeof window === "undefined") return

  localStorage.setItem("wishlist", JSON.stringify([]))
  return []
}

