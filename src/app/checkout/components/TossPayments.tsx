// =============================================================================
// 토스페이먼츠 결제 위젯 컴포넌트
// 결제 수단·약관 렌더링, requestPayment로 결제 요청(successUrl/failUrl 리다이렉트)
// =============================================================================

import { useEffect, useRef, useState } from 'react'
import {
  loadTossPayments,
  ANONYMOUS,
  TossPaymentsWidgets,
} from '@tosspayments/tosspayments-sdk'
import { CartItem } from '@/lib/cart'

const generateRandomString = () =>
  window.btoa(Math.random().toString()).slice(0, 20)


// 실제 토스 키로 변경 필요
const clientKey = 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm'

interface TossPaymentsProps {
  address: string
  orderName: string
  customerName: string
  customerEmail: string
  cart: CartItem[]
  /** 결제 금액(원). 미전달 시 위젯 기본값 사용 */
  amount?: number
  /** 테스트 결제 성공 시 호출 (장바구니 비우기·리다이렉트 등) */
  onTestPaymentSuccess?: () => void
}

/** 토스 위젯: setAmount → renderPaymentMethods/renderAgreement 
 * → 결제하기 시 requestPayment */
export default function TossPayments({
  address,
  orderName,
  customerName,
  customerEmail,
  cart,
  amount: amountProp = 50_000,
  onTestPaymentSuccess,
}: TossPaymentsProps) {
  const [ready, setReady] = useState(false)
  const [widgets, setWidgets] = useState<TossPaymentsWidgets | null>(null)
  const [amount, setAmount] = useState({
    currency: 'KRW' as const,
    value: amountProp,
  })

  const preData = {
    orderName,
    customerName,
    customerEmail,
    address,
    cart,
  }

  const stringifiedData = JSON.stringify(preData)

  useEffect(() => {
    async function fetchPaymentWidgets() {
      const tossPayments = await loadTossPayments(clientKey)
      const widgets = tossPayments.widgets({ customerKey: ANONYMOUS })
      setWidgets(widgets)
    }

    fetchPaymentWidgets()
  }, [clientKey])

  // 부모에서 전달한 금액이 바뀌면 위젯 금액도 동기화
  useEffect(() => {
    setAmount((prev) => ({ ...prev, value: amountProp }))
  }, [amountProp])

  useEffect(() => {
    async function renderPaymentWidgets() {
      if (widgets == null) {
        return
      }
      /**
       * 위젯의 결제금액을 결제하려는 금액으로 초기화하세요.
       * renderPaymentMethods, renderAgreement, requestPayment 보다 반드시 선행되어야 합니다.
       * @docs https://docs.tosspayments.com/sdk/v2/js#widgetssetamount
       */
      await widgets.setAmount({ currency: 'KRW', value: amountProp })

      await Promise.all([
        /**
         * 결제창을 렌더링합니다.
         * @docs https://docs.tosspayments.com/sdk/v2/js#widgetsrenderpaymentmethods
         */
        widgets.renderPaymentMethods({
          selector: '#payment-method',
          // 렌더링하고 싶은 결제 UI의 variantKey
          // 결제 수단 및 스타일이 다른 멀티 UI를 직접 만들고 싶다면 계약이 필요해요.
          // @docs https://docs.tosspayments.com/guides/v2/payment-widget/admin#새로운-결제-ui-추가하기
          variantKey: 'DEFAULT',
        }),
        /**
         * 약관을 렌더링합니다.
         * @docs https://docs.tosspayments.com/reference/widget-sdk#renderagreement선택자-옵션
         */
        widgets.renderAgreement({
          selector: '#agreement',
          variantKey: 'AGREEMENT',
        }),
      ])

      setReady(true)
    }

    renderPaymentWidgets()
  }, [widgets, amountProp])

  return (
    <div className="wrapper w-full">
      <div className="max-w-540 w-full">
        <div id="payment-method" className="w-full" />
        <div id="agreement" className="w-full" />
        <div className="btn-wrapper w-full space-y-2">
          <button
            className="btn primary w-full"
            onClick={async () => {
              try {
                /**
                 * 결제 요청
                 * 결제를 요청하기 전에 orderId, amount를 서버에 저장하세요.
                 * 결제 과정에서 악의적으로 결제 금액이 바뀌는 것을 확인하는 용도입니다.
                 * @docs https://docs.tosspayments.com/sdk/v2/js#widgetsrequestpayment
                 */
                await widgets?.requestPayment({
                  orderId: generateRandomString(),
                  orderName: orderName,
                  customerName: customerName,
                  customerEmail: customerEmail,
                  successUrl:
                    window.location.origin +
                    `/checkout/success?data=${encodeURIComponent(stringifiedData)}`,
                  failUrl:
                    window.location.origin +
                    '/checkout/fail' +
                    window.location.search,
                })
              } catch (error) {
                // TODO: 에러 처리
              }
            }}
          >
            결제하기
          </button>
          <button
            type="button"
            className="btn w-full border border-dashed border-muted-foreground/50 text-muted-foreground hover:bg-muted/50"
            onClick={async () => {
              try {
                const res = await fetch('/api/tosspayments/test-confirm', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    amount: amountProp,
                    data: preData,
                  }),
                })
                const json = await res.json()
                if (!res.ok) {
                  throw new Error(json.message || '테스트 결제 실패')
                }
                onTestPaymentSuccess?.()
              } catch (err) {
                console.error(err)
                alert(err instanceof Error ? err.message : '테스트 결제에 실패했습니다.')
              }
            }}
          >
            테스트 결제하기
          </button>
        </div>
      </div>
    </div>
  )
}
