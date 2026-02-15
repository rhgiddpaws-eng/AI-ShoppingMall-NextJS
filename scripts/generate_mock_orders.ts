// npx tsx scripts/generate_mock_orders.ts

import { PrismaClient, OrderStatus, DeliveryStatus, DeliveryProvider, PaymentStatus, Category } from '@prisma/client'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const prisma = new PrismaClient()

// 랜덤 함수들
const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const getRandomFloat = (min: number, max: number) => parseFloat((Math.random() * (max - min) + min).toFixed(2))
const getRandomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))

// 설정
const ORDER_COUNT = 1000

// 더미 데이터 소스
const MOCK_ADDRESSES = [
    { address: '서울시 강남구 테헤란로 123', postalCode: '06234' },
    { address: '경기도 성남시 분당구 판교역로 456', postalCode: '13529' },
    { address: '부산시 해운대구 센텀중앙로 78', postalCode: '48058' },
    { address: '인천시 연수구 송도과학로 90', postalCode: '21990' },
    { address: '대전시 유성구 대학로 99', postalCode: '34134' }
]

const MOCK_TRACKING_NUMBERS = [
    'KR1234567890', 'KR0987654321', 'KR1122334455', 'KR5544332211', 'KR6677889900'
]

async function main() {
    try {
        console.log(`랜덤 주문 ${ORDER_COUNT}개 생성 시작...`)

        // 1. 필요한 기본 데이터 조회
        const users = await prisma.user.findMany({ select: { id: true } })
        const products = await prisma.product.findMany({ select: { id: true, price: true } })

        if (users.length === 0) throw new Error('User가 없습니다. 먼저 회원을 생성해주세요.')
        if (products.length === 0) throw new Error('Product가 없습니다. 먼저 상품을 등록해주세요.')

        console.log(`- 기준 데이터: User ${users.length}명, Product ${products.length}개`)

        const ordersBatch = []

        // 2. 주문 생성 루프
        for (let i = 0; i < ORDER_COUNT; i++) {
            const user = getRandomItem(users)
            const itemCount = getRandomInt(1, 4) // 1~4개 상품 주문
            const selectedProducts = []

            let totalAmount = 0

            // 주문 상품 선정
            for (let j = 0; j < itemCount; j++) {
                const product = getRandomItem(products)
                const quantity = getRandomInt(1, 3)
                selectedProducts.push({
                    productId: product.id,
                    productPrice: product.price,
                    quantity
                })
                totalAmount += product.price * quantity
            }

            const status: OrderStatus = getRandomItem(['PAID', 'PAID', 'PAID', 'PENDING', 'CANCELED'])
            const deliveryStatus: DeliveryStatus = status === 'PAID'
                ? getRandomItem(['ORDER_COMPLETE', 'PREPARING', 'IN_DELIVERY', 'DELIVERED'])
                : 'ORDER_COMPLETE'

            const isDelivered = deliveryStatus === 'DELIVERED'
            const createdAt = getRandomDate(new Date('2023-01-01'), new Date())

            const addressInfo = getRandomItem(MOCK_ADDRESSES)

            // 주문 생성 쿼리 준비
            const orderPromise = prisma.order.create({
                data: {
                    userId: user.id,
                    totalAmount,
                    status,
                    deliveryStatus: status === 'PAID' ? deliveryStatus : undefined,
                    deliveryProvider: status === 'PAID' ? 'MOCK' : undefined,
                    trackingNumber: status === 'PAID' ? getRandomItem(MOCK_TRACKING_NUMBERS) + i : undefined,
                    shippingAddress: addressInfo.address,
                    createdAt,
                    updatedAt: createdAt,
                    items: {
                        create: selectedProducts.map(p => ({
                            productId: p.productId,
                            quantity: p.quantity,
                            price: p.productPrice
                        }))
                    },
                    payment: status === 'PAID' ? {
                        create: {
                            paymentMethod: 'CARD',
                            amount: totalAmount,
                            transactionId: `tx_${i}_${Date.now()}`,
                            paymentOrderId: `ord_${i}_${Date.now()}`,
                            status: 'PAID',
                            createdAt: createdAt
                        }
                    } : undefined
                }
            })
            ordersBatch.push(orderPromise)

            // 진행상황 로그
            if ((i + 1) % 100 === 0) console.log(`${i + 1} / ${ORDER_COUNT} 주문 생성 준비 중...`)
        }

        // 3. 병렬 실행 (너무 많으면 청크로 나눌 수 있음, 여기선 Promise.all로 시도)
        // 안전하게 50개씩 끊어서 실행
        const CHUNK_SIZE = 50
        for (let i = 0; i < ordersBatch.length; i += CHUNK_SIZE) {
            const chunk = ordersBatch.slice(i, i + CHUNK_SIZE)
            await prisma.$transaction(chunk)
            console.log(`[${i + chunk.length}/${ORDER_COUNT}] 주문 DB 저장 완료`)
        }

        console.log('모든 주문 생성 완료!')

    } catch (error) {
        console.error('주문 생성 중 오류 발생:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
