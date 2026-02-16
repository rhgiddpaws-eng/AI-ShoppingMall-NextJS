// npx tsx scripts/cleanup_all_except_user.ts

import { PrismaClient } from '@prisma/client'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('데이터베이스 초기화를 시작합니다 (User 테이블 제외)...')

        // 삭제 순서 중요 (Foreign Key 제약조건 때문)
        // 1. 하위 테이블부터 삭제
        // RiderLocationLog, DeliveryEvent, Payment, Inquiry, OrderItem
        // WishlistEntry, CartItem, Image
        // Order, Wishlist, Cart
        // Product, Address
        // User (삭제 안 함)

        console.log('1. 주문 관련 데이터 삭제 중...')
        await prisma.riderLocationLog.deleteMany({})
        await prisma.deliveryEvent.deleteMany({})
        await prisma.payment.deleteMany({})
        await prisma.inquiry.deleteMany({})
        await prisma.orderItem.deleteMany({})
        await prisma.order.deleteMany({}) // OrderItem 삭제 후 Order 삭제

        console.log('2. 장바구니/위시리스트 데이터 삭제 중...')
        await prisma.cartItem.deleteMany({})
        await prisma.wishlistEntry.deleteMany({})
        await prisma.cart.deleteMany({}) // CartItem 삭제 후 Cart 삭제가능하지만 User 종속이라 유지? 
        // Cart, Wishlist는 User와 1:1 관계이므로 데이터만 비우거나 삭제 후 재생성
        // 여기서는 Cart, Wishlist 자체를 삭제 (필요시 회원가입 로직에서 재생성됨)
        await prisma.cart.deleteMany({})
        await prisma.wishlist.deleteMany({})

        console.log('3. 상품 및 이미지 데이터 삭제 중...')
        await prisma.image.deleteMany({})
        await prisma.product.deleteMany({}) // Image, OrderItem, CartItem, WishlistEntry 삭제 후 가능

        console.log('4. 주소 데이터 삭제 중...')
        await prisma.address.deleteMany({})

        console.log('\n초기화 완료: User 테이블을 제외한 모든 데이터가 삭제되었습니다.')

    } catch (error) {
        console.error('초기화 중 오류 발생:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
