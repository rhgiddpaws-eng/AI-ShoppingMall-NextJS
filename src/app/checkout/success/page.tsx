'use client'
// =============================================================================
// 결제 성공 페이지 - /checkout/success
// URL 쿼리(paymentKey, orderId, amount 등)로 결제 승인 API 호출, 성공 시 폭죽·Lottie·감사 메시지
// =============================================================================

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'

// 클라이언트 사이드에서만 로드될 수 있도록 동적 임포트
const Lottie = dynamic(() => import('react-lottie'), { ssr: false })

// confetti 함수로 정확히 가져오기
const getConfetti = async () => {
  const confettiModule = await import('canvas-confetti');
  return confettiModule.default;
};

// LottieFiles에서 제공하는 공개 애니메이션 사용
const thankYouAnimation =
  'https://assets10.lottiefiles.com/packages/lf20_touohxv0.json'
const successAnimation =
  'https://assets2.lottiefiles.com/private_files/lf30_rysgr4xj.json'

/** 결제 성공: 승인 API 호출 후 성공 시 애니메이션·결제 정보·홈/주문확인 버튼 표시 */
export default function SuccessPage() {
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)
  const searchParams = useSearchParams()
  const paymentKey = searchParams.get('paymentKey')
  const orderId = searchParams.get('orderId')
  const amount = searchParams.get('amount')
  const data = searchParams.get('data')

  console.log('data:', data)

  // 폭죽 효과 설정 - useEffect 내부로 이동
  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (isConfirmed && typeof window !== 'undefined') {
      const triggerConfetti = async () => {
        const confetti = await getConfetti();
        
        const duration = 5 * 1000
        const animationEnd = Date.now() + duration
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

        function randomInRange(min: number, max: number) {
          return Math.random() * (max - min) + min
        }

        const interval = setInterval(function () {
          const timeLeft = animationEnd - Date.now()

          if (timeLeft <= 0) {
            return clearInterval(interval)
          }

          const particleCount = 50 * (timeLeft / duration)

          // 왼쪽에서 발사
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          })

          // 오른쪽에서 발사
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          })
        }, 250)
      }

      triggerConfetti()

      // 감사 메시지 표시 타이밍
      setTimeout(() => {
        setShowThankYou(true)
      }, 1500)
    }
  }, [isConfirmed])

  async function confirmPayment() {
    // 로딩 효과를 위해 약간의 지연 추가
    await new Promise(resolve => setTimeout(resolve, 800))

    const response = await fetch('/api/tosspayments/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
        data,
      }),
    })

    if (response.ok) {
      setIsConfirmed(true)
    }
  }

  const thankYouOptions = {
    loop: false,
    autoplay: true,
    animationData: null,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
    path: thankYouAnimation,
  }

  const successOptions = {
    loop: false,
    autoplay: true,
    animationData: null,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
    path: successAnimation,
  }

  return (
    <div className="payment-success-container">
      <AnimatePresence>
        {!isConfirmed ? (
          <motion.div
            className="payment-confirm-container"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.5 }}
          >
            <div className="pulse-wrapper">
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <img
                  src="https://static.toss.im/lotties/loading-spot-apng.png"
                  width="150"
                  height="150"
                  className="loading-image"
                />
              </motion.div>
            </div>

            <motion.h2
              className="title text-gradient"
              animate={{
                color: ['#4A90E2', '#50E3C2', '#4A90E2'],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              결제 요청 성공!
            </motion.h2>

            <motion.h4
              className="description"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              결제를 완료하고 특별한 혜택을 받아보세요
            </motion.h4>

            <motion.button
              className="confirm-button"
              onClick={confirmPayment}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{
                boxShadow: [
                  '0px 0px 0px rgba(74, 144, 226, 0.3)',
                  '0px 0px 20px rgba(74, 144, 226, 0.7)',
                  '0px 0px 0px rgba(74, 144, 226, 0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              결제 승인하기
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            className="payment-success-message"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="success-animation-container">
              <Lottie options={successOptions} height={180} width={180} />
            </div>

            <motion.h1
              className="congratulations"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
            >
              결제 완료!
            </motion.h1>

            <AnimatePresence>
              {showThankYou && (
                <motion.div
                  className="thank-you-message"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Lottie options={thankYouOptions} height={150} width={300} />
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="customer-message"
                  >
                    고객님의 소중한 주문에 진심으로 감사드립니다. 최고의
                    서비스로 보답하겠습니다!
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              className="payment-details"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1, type: 'spring' }}
            >
              <div className="detail-card">
                <div className="detail-item">
                  <span className="detail-label">결제 금액</span>
                  <motion.span
                    className="detail-value amount"
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ delay: 1.5, duration: 0.5 }}
                  >
                    {new Intl.NumberFormat('ko-KR', {
                      style: 'currency',
                      currency: 'KRW',
                    }).format(+amount!)}
                  </motion.span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">주문번호</span>
                  <span className="detail-value">{orderId}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">결제 키</span>
                  <span className="detail-value payment-key">{paymentKey}</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="action-buttons"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              <motion.a
                className="action-button home"
                href="/"
                whileHover={{ scale: 1.05, backgroundColor: '#3870c9' }}
                whileTap={{ scale: 0.95 }}
              >
                쇼핑 계속하기
              </motion.a>
              <motion.a
                className="action-button order"
                href="/account"
                whileHover={{ scale: 1.05, backgroundColor: '#2db57f' }}
                whileTap={{ scale: 0.95 }}
              >
                주문 확인하기
              </motion.a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap');

        body {
          margin: 0;
          padding: 0;
          font-family: 'Noto Sans KR', sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #e8edf5 100%);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .payment-success-container {
          width: 100%;
          max-width: 650px;
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 80vh;
        }

        .payment-confirm-container {
          background: white;
          border-radius: 20px;
          padding: 40px 30px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }

        .payment-success-message {
          background: white;
          border-radius: 20px;
          padding: 40px 30px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .pulse-wrapper {
          position: relative;
        }

        .pulse-wrapper::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 140px;
          height: 140px;
          background: rgba(74, 144, 226, 0.2);
          border-radius: 50%;
          z-index: -1;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0.7;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.3;
          }
          100% {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0.7;
          }
        }

        .title {
          font-size: 2.5rem;
          font-weight: 900;
          margin: 20px 0 10px;
          text-align: center;
        }

        .text-gradient {
          background: linear-gradient(90deg, #4a90e2, #50e3c2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .description {
          font-size: 1.2rem;
          color: #666;
          margin-bottom: 40px;
          text-align: center;
        }

        .confirm-button {
          background: linear-gradient(90deg, #4a90e2, #6a5ae0);
          border: none;
          color: white;
          font-size: 1.2rem;
          padding: 16px 40px;
          border-radius: 30px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 20px rgba(74, 144, 226, 0.3);
          width: 100%;
          max-width: 300px;
        }

        .congratulations {
          font-size: 3rem;
          font-weight: 900;
          background: linear-gradient(90deg, #ff8a80, #ffd54f);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 10px;
          text-align: center;
        }

        .thank-you-message {
          margin: 10px 0 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .customer-message {
          text-align: center;
          font-size: 1.1rem;
          color: #555;
          line-height: 1.6;
          margin-top: 0;
        }

        .payment-details {
          width: 100%;
          margin-bottom: 30px;
        }

        .detail-card {
          background: linear-gradient(135deg, #f8f9fa 0%, #eef1f5 100%);
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .detail-item:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }

        .detail-label {
          font-weight: 600;
          color: #555;
        }

        .detail-value {
          font-weight: 700;
          color: #333;
        }

        .amount {
          color: #4a90e2;
          font-size: 1.2rem;
        }

        .payment-key {
          font-size: 0.85rem;
          word-break: break-all;
        }

        .action-buttons {
          display: flex;
          gap: 15px;
          width: 100%;
        }

        .action-button {
          flex: 1;
          text-align: center;
          padding: 16px 20px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1rem;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }

        .action-button.home {
          background-color: #4a90e2;
          color: white;
        }

        .action-button.order {
          background-color: #3ccf91;
          color: white;
        }

        .success-animation-container {
          margin-top: -50px;
          margin-bottom: -30px;
        }

        @media (max-width: 768px) {
          .title {
            font-size: 2rem;
          }

          .congratulations {
            font-size: 2.5rem;
          }

          .action-buttons {
            flex-direction: column;
          }

          .action-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
