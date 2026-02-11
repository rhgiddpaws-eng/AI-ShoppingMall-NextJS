/**
 * wishlist - 위시리스트 로직 (localStorage 기반)
 *
 * [기능]
 * - 위시리스트 추가/삭제/조회/포함 여부/비우기
 * - 브라우저 localStorage 키 "wishlist"에 JSON 배열로 저장
 *
 * [문법]
 * - typeof window === "undefined": SSR 환경에서 window 접근 방지
 * - Array.prototype.some(): id 일치하는 항목 존재 여부
 */

/** 위시리스트 한 줄 아이템 타입. 장바구니와 달리 quantity 없음 */
export interface WishlistItem {
  id: string
  name: string
  price: number
  imageSrc: string
  category?: string
  salePrice?: number
}

/**
   * WishlistItem 인터페이스는 많이 쓰지만 ( api )
   * 로컬스토리지에 저장하고 불러오는 아래 함수는 사용 안함.
   */
  
/** 위시리스트에 상품 추가. 이미 있으면 무시 */
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

/** id에 해당하는 위시리스트 아이템 삭제 */
export function removeFromWishlist(id: string) {
  if (typeof window === "undefined") return

  const wishlist = getWishlist()
  const updatedWishlist = wishlist.filter((item) => item.id !== id)

  localStorage.setItem("wishlist", JSON.stringify(updatedWishlist))
  return updatedWishlist
}

/** localStorage에서 위시리스트 배열 읽기. 없거나 SSR이면 빈 배열 */
export function getWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return []

  const wishlistData = localStorage.getItem("wishlist")
  return wishlistData ? JSON.parse(wishlistData) : []
}

/** id가 위시리스트에 포함되어 있는지 여부 */
export function isInWishlist(id: string): boolean {
  if (typeof window === "undefined") return false

  const wishlist = getWishlist()
  return wishlist.some((item) => item.id === id)
}

/** 위시리스트 전체 비우기 */
export function clearWishlist() {
  if (typeof window === "undefined") return

  localStorage.setItem("wishlist", JSON.stringify([]))
  return []
}
