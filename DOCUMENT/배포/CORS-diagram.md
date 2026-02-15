# CORS 동작 흐름 (그림 설명)

## 1. 같은 도메인 (CORS 없음)

```
[브라우저]  https://myshop.com
     |
     |  fetch('/api/products')  ← 같은 도메인
     v
[서버]  https://myshop.com/api
     |
     |  응답 (헤더 없어도 OK)
     v
[브라우저]  응답 받아서 JS에 전달 ✅
```

---

## 2. 다른 도메인 - CORS 허용 시 (서버가 "문 열어줌")

```
[프론트]                    [API 서버]
https://myshop.com          https://api.myshop.com

    |                              |
    |  (1) POST /api/login         |
    |  Origin: https://myshop.com  |
    |  --------------------------> |
    |                              |
    |     (2) OPTIONS (Preflight)  |
    |     먼저 보낼 수 있음         |
    |  <-------------------------> |
    |                              |
    |  (3) 응답 "헤더" 에             |
    |  Access-Control-Allow-Origin: https://myshop.com
    |  <-------------------------- |
    |                              |
    |  브라우저: "이 출처 허용됐다" |
    |  → 응답을 JS에 전달 ✅       |
```

---

## 3. 다른 도메인 - CORS 미허용 시 (서버가 "문 안 열어줌")

```
[프론트]                    [API 서버]
https://myshop.com          https://api.other.com

    |                              |
    |  (1) POST /api/data           |
    |  --------------------------> |
    |                              |
    |  (2) 응답 200 OK             |
    |  (CORS 헤더 없음!)           |
    |  <-------------------------- |
    |                              |
    |  브라우저: "Allow-Origin 없음"
    |  → 응답 버림 🚫
    |  → JS에는 CORS 에러만 보임   |
```

---

## 4. "문을 열어준다" = 누가 무엇을 하나

```
         프론트(요청 보냄)              API 서버(요청 받음)

    ┌─────────────────┐           ┌─────────────────┐
    │  myshop.com      │  요청     │  api.myshop.com  │
    │  (브라우저)      │ -------> │  (백엔드)        │
    │                 │           │                 │
    │  fetch(API주소) │           │  CORS 헤더 붙여서 │
    │                 │  응답     │  응답            │
    │                 │ <-------  │  Allow-Origin:   │
    │  응답 쓸 수 있음 │  ✅       │  myshop.com     │
    └─────────────────┘           └─────────────────┘
                                         ↑
                              "이 도메인(myshop.com)에서
                               온 요청에 대한 응답은
                               브라우저가 넘겨줘도 된다"
                              = 문을 열어줌
```

---

## 5. Preflight (GET이 아닌 요청 / 커스텀 헤더 시)

```
[브라우저]                          [API 서버]

    |  OPTIONS /api/products         |
    |  (어떤 메서드/헤더 쓸지 미리 물음) |
    |  -----------------------------> |
    |                                 |
    |  Allow-Origin, Allow-Methods,   |
    |  Allow-Headers 포함 응답       |
    |  <----------------------------- |
    |                                 |
    |  실제 POST /api/products       |
    |  -----------------------------> |
    |                                 |
    |  응답 + CORS 헤더               |
    |  <----------------------------- |
    |                                 |
    ✅ JS에 응답 전달
```

---
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "PUT"
        ],
        "AllowedOrigins": [
            "http://localhost:3000"
        ],
        "ExposeHeaders": [
            "ETag"
        ]
    }
]

CORSA 설정을 이렇게 하면 변경된 파일만 다운로드 받게 됨.
