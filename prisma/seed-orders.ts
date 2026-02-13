/**
 * 주문 데이터 시드 스크립트
 * 1000개의 주문을 최근 5년간 고루 분산하여 생성
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 랜덤 날짜 생성 (시작일과 종료일 사이)
function randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// 랜덤 금액 생성 (10,000원 ~ 500,000원)
function randomAmount(): number {
    return Math.floor(Math.random() * (500000 - 10000 + 1) + 10000)
}

// 배송 상태 랜덤 선택
function randomDeliveryStatus(): "ORDER_COMPLETE" | "PREPARING" | "IN_DELIVERY" | "ARRIVING" | "DELIVERED" {
    const statuses: ("ORDER_COMPLETE" | "PREPARING" | "IN_DELIVERY" | "ARRIVING" | "DELIVERED")[] = [
        "ORDER_COMPLETE",
        "PREPARING",
        "IN_DELIVERY",
        "ARRIVING",
        "DELIVERED",
    ]
    return statuses[Math.floor(Math.random() * statuses.length)]
}

async function main() {
    console.log("🌱 주문 데이터 시딩 시작...")

    // 기존 사용자 확인
    const users = await prisma.user.findMany({
        take: 10,
    })

    if (users.length === 0) {
        console.log("❌ 사용자가 없습니다. 먼저 사용자를 생성해주세요.")
        return
    }

    console.log(`✅ ${users.length}명의 사용자 발견`)

    // 기존 상품 확인
    const products = await prisma.product.findMany({
        take: 20,
    })

    if (products.length === 0) {
        console.log("❌ 상품이 없습니다. 먼저 상품을 생성해주세요.")
        return
    }

    console.log(`✅ ${products.length}개의 상품 발견`)

    const now = new Date()
    const fiveYearsAgo = new Date(now.getFullYear() - 5, 0, 1) // 5년 전 1월 1일

    // 기간별 주문 수 분배
    const ordersPerPeriod = {
        // 최근 1개월: 200개 (일별 차트에 잘 보이도록)
        recentMonth: 200,
        // 최근 1년 (최근 1개월 제외): 400개 (월별 차트에 잘 보이도록)
        recentYear: 400,
        // 나머지 4년: 400개 (연별 차트에 잘 보이도록)
        olderYears: 400,
    }

    let createdCount = 0

    // 1. 최근 1개월 주문 생성 (200개)
    console.log("\n📅 최근 1개월 주문 생성 중...")
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth(), 1)
    for (let i = 0; i < ordersPerPeriod.recentMonth; i++) {
        const user = users[Math.floor(Math.random() * users.length)]
        const product = products[Math.floor(Math.random() * products.length)]
        const quantity = Math.floor(Math.random() * 3) + 1
        const totalAmount = randomAmount()
        const createdAt = randomDate(oneMonthAgo, now)

        await prisma.order.create({
            data: {
                userId: user.id,
                totalAmount,
                status: "PAID",
                deliveryStatus: randomDeliveryStatus(),
                createdAt,
                items: {
                    create: {
                        productId: product.id,
                        quantity,
                        price: totalAmount / quantity,
                    },
                },
                payment: {
                    create: {
                        paymentMethod: "카드",
                        amount: totalAmount,
                        transactionId: `TXN-${Date.now()}-${i}`,
                        paymentOrderId: `ORD-${Date.now()}-${i}`,
                        status: "PAID",
                        createdAt,
                    },
                },
            },
        })

        createdCount++
        if (createdCount % 50 === 0) {
            console.log(`  ✓ ${createdCount}개 생성됨...`)
        }
    }

    // 2. 최근 1년 주문 생성 (최근 1개월 제외, 400개)
    console.log("\n📅 최근 1년 주문 생성 중...")
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1)
    for (let i = 0; i < ordersPerPeriod.recentYear; i++) {
        const user = users[Math.floor(Math.random() * users.length)]
        const product = products[Math.floor(Math.random() * products.length)]
        const quantity = Math.floor(Math.random() * 3) + 1
        const totalAmount = randomAmount()
        const createdAt = randomDate(oneYearAgo, oneMonthAgo)

        await prisma.order.create({
            data: {
                userId: user.id,
                totalAmount,
                status: "PAID",
                deliveryStatus: randomDeliveryStatus(),
                createdAt,
                items: {
                    create: {
                        productId: product.id,
                        quantity,
                        price: totalAmount / quantity,
                    },
                },
                payment: {
                    create: {
                        paymentMethod: "카드",
                        amount: totalAmount,
                        transactionId: `TXN-${Date.now()}-${i + 200}`,
                        paymentOrderId: `ORD-${Date.now()}-${i + 200}`,
                        status: "PAID",
                        createdAt,
                    },
                },
            },
        })

        createdCount++
        if (createdCount % 50 === 0) {
            console.log(`  ✓ ${createdCount}개 생성됨...`)
        }
    }

    // 3. 나머지 4년 주문 생성 (400개)
    console.log("\n📅 과거 4년 주문 생성 중...")
    for (let i = 0; i < ordersPerPeriod.olderYears; i++) {
        const user = users[Math.floor(Math.random() * users.length)]
        const product = products[Math.floor(Math.random() * products.length)]
        const quantity = Math.floor(Math.random() * 3) + 1
        const totalAmount = randomAmount()
        const createdAt = randomDate(fiveYearsAgo, oneYearAgo)

        await prisma.order.create({
            data: {
                userId: user.id,
                totalAmount,
                status: "PAID",
                deliveryStatus: randomDeliveryStatus(),
                createdAt,
                items: {
                    create: {
                        productId: product.id,
                        quantity,
                        price: totalAmount / quantity,
                    },
                },
                payment: {
                    create: {
                        paymentMethod: "카드",
                        amount: totalAmount,
                        transactionId: `TXN-${Date.now()}-${i + 600}`,
                        paymentOrderId: `ORD-${Date.now()}-${i + 600}`,
                        status: "PAID",
                        createdAt,
                    },
                },
            },
        })

        createdCount++
        if (createdCount % 50 === 0) {
            console.log(`  ✓ ${createdCount}개 생성됨...`)
        }
    }

    console.log(`\n✅ 총 ${createdCount}개의 주문이 생성되었습니다!`)

    // 통계 출력
    const totalOrders = await prisma.order.count()
    const paidOrders = await prisma.order.count({ where: { status: "PAID" } })
    const totalRevenue = await prisma.order.aggregate({
        where: { status: "PAID" },
        _sum: { totalAmount: true },
    })

    console.log("\n📊 데이터베이스 통계:")
    console.log(`  - 총 주문 수: ${totalOrders}개`)
    console.log(`  - 결제 완료 주문: ${paidOrders}개`)
    console.log(`  - 총 매출: ${totalRevenue._sum.totalAmount?.toLocaleString()}원`)
}

main()
    .catch((e) => {
        console.error("❌ 에러 발생:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
