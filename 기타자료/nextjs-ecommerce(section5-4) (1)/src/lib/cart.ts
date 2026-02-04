// 장바구니 타입 정의
export interface CartItem {
  id: string
  name: string
  price: number
  imageSrc: string
  quantity: number
  category?: string
}

// 장바구니 아이템 추가
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

// 장바구니 아이템 수량 변경
export function updateCartItemQuantity(id: string, quantity: number) {
  if (typeof window === "undefined") return

  const cart = getCart()
  const itemIndex = cart.findIndex((item) => item.id === id)

  if (itemIndex !== -1) {
    if (quantity <= 0) {
      // 수량이 0 이하면 아이템 삭제
      cart.splice(itemIndex, 1)
    } else {
      cart[itemIndex].quantity = quantity
    }

    localStorage.setItem("cart", JSON.stringify(cart))
  }

  return cart
}

// 장바구니 아이템 삭제
export function removeFromCart(id: string) {
  if (typeof window === "undefined") return

  const cart = getCart()
  const updatedCart = cart.filter((item) => item.id !== id)

  localStorage.setItem("cart", JSON.stringify(updatedCart))
  return updatedCart
}

// 장바구니 가져오기
export function getCart(): CartItem[] {
  if (typeof window === "undefined") return []

  const cartData = localStorage.getItem("cart")
  return cartData ? JSON.parse(cartData) : []
}

// 장바구니 비우기
export function clearCart() {
  if (typeof window === "undefined") return

  localStorage.setItem("cart", JSON.stringify([]))
  return []
}

// 장바구니 총액 계산
export function calculateCartTotal(cart: CartItem[]) {
  return cart.reduce((total, item) => total + item.price * item.quantity, 0)
}

