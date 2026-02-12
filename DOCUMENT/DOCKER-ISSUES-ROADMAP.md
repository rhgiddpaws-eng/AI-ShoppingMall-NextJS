# Docker Issues and Roadmap

## 1. Login / Cart / Purchase

- **Issue**: Purchase and cart appear to work without login.
- **Cause**: Cart API returns 401 when not logged in but client falls back to localStorage. Confirm API previously returned 200 with "login required" so success page showed "payment complete". In Docker, session cookie may not be sent (credentials / domain).
- **Fix**: Confirm returns 401 when not logged in. Success page uses credentials: 'include' and shows error on !response.ok. Checkout page requires login and redirects to /login?returnUrl=/checkout.

## 2. Recommended Products Fail (Detail Page)

- **Issue**: "Failed to load recommended products" on product detail when running in Docker.
- **Cause**: Recommended API uses OPENAI_API_KEY and pgClient (PG_HOST, PG_PORT). In Docker, PG_HOST=localhost points to the app container, not Postgres. Prisma uses DATABASE_URL (e.g. ecommerce_db:5432) so only recommended API fails.
- **Fix**: In Docker env set PG_HOST=ecommerce_db, PG_PORT=5432, and ensure OPENAI_API_KEY is set.

## 3. Admin Home Button

- Done: "Home" link at top of admin sidebar (href="/").

## 4. JWT Migration

- Current: iron-session cookie. Plan: issue JWT on login, validate in APIs via Authorization header, replace getSession() usage. Reduces cookie/domain issues in Docker.

## 5. Delivery (Naver Map + Status)

- Requirements: Naver Map for order location vs store location (D2D), delivery status: Order complete, Preparing, In delivery, Arriving, Delivered.
- Plan: Naver Maps API for coordinates and route; Order.deliveryStatus field; admin updates status; customer view on order detail. External delivery partners (e.g. Baemin) need separate partnership/API.

## Docker Checklist

- PG_HOST=ecommerce_db, PG_PORT=5432 when running in Docker
- OPENAI_API_KEY, SESSION_SECRET_1, SESSION_SECRET_2 set
- Verify login required for checkout and confirm
