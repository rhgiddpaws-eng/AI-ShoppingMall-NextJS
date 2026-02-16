  /**
 * cart - 장바구니 로직 (localStorage 기반)
 *
 * [기능]
 * - 장바구니 추가/수량 변경/삭제/비우기/조회/총액 계산
 * - 브라우저 localStorage 키 "cart"에 JSON 배열로 저장
 *
 * [문법]
 * - typeof window === "undefined": SSR(Next 등)에서 window 접근 시 에러 방지
 * - Omit<CartItem, "quantity">: quantity는 addToCart 내부에서 1로 설정
 * - reduce: 배열을 하나의 값(총액)으로 집계
 */

/** 장바구니 한 줄 아이템 타입. quantity는 개수, 나머지는 상품 정보 */
export interface CartItem {
  id: string
  name: string
  price: number
  imageSrc: string
  quantity: number
  category?: string
}

/**
 * 장바구니에 상품 추가. 이미 있으면 quantity만 1 증가
 * @param product - quantity 제외한 상품 정보 (Omit<CartItem, "quantity">)
 */
export function addToCart(product: Omit<CartItem, "quantity">) {
  if (typeof window === "undefined") return

  const cart = getCart()
  const existingItem = cart.find((item) => item.id === product.id)

  if (existingItem) {
    existingItem.quantity += 1
  } else {
    cart.push({
      ...product,
      quantity: 1,
    })
  }

  localStorage.setItem("cart", JSON.stringify(cart))
  return cart
}

/**
 * 특정 아이템 수량 변경. 0 이하면 해당 아이템 제거
 * @param id - CartItem.id
 * @param quantity - 새 수량 (0 이하 시 삭제)
 */
export function updateCartItemQuantity(id: string, quantity: number) {
  if (typeof window === "undefined") return

  const cart = getCart()
  const itemIndex = cart.findIndex((item) => item.id === id)

  if (itemIndex !== -1) {
    if (quantity <= 0) {
      cart.splice(itemIndex, 1)
    } else {
      cart[itemIndex].quantity = quantity
    }
    localStorage.setItem("cart", JSON.stringify(cart))
  }

  return cart
}

/** id에 해당하는 장바구니 아이템 삭제 */
export function removeFromCart(id: string) {
  if (typeof window === "undefined") return

  const cart = getCart()
  const updatedCart = cart.filter((item) => item.id !== id)

  localStorage.setItem("cart", JSON.stringify(updatedCart))
  return updatedCart
}

/** localStorage에서 장바구니 배열 읽기. 없거나 SSR이면 빈 배열 */
export function getCart(): CartItem[] {
  if (typeof window === "undefined") return []

  const cartData = localStorage.getItem("cart")
  return cartData ? JSON.parse(cartData) : []
}

/** 장바구니 전체 비우기 (localStorage 덮어쓰기) */
export function clearCart() {
  if (typeof window === "undefined") return

  localStorage.setItem("cart", JSON.stringify([]))
  return []
}

/** 장바구니 총 금액: sum(price * quantity) */
export function calculateCartTotal(cart: CartItem[]) {
  // reduce: cart 배열을 순회하며 총액을 누적 계산합니다.
  // total: 누산 결과(현재까지의 총합), item: 현재 장바구니 아이템
  // 0은 시작값(초깃값)입니다.
  return cart.reduce((total, item) => total + item.price * item.quantity, 0)
}
