# TechNest AI

> **AI-powered e-commerce platform for consumer technology products.**  
> A production-oriented full-stack app with React 19 + TypeScript, FastAPI, PostgreSQL, Redis, VNPay payments, Cloudinary image optimization, and AI shopping assistance.

![CI](https://github.com/VanTruong475/techsphere-ai/actions/workflows/ci.yml/badge.svg)
![Tests](https://img.shields.io/badge/Tests-449/449-brightgreen)
![Coverage](https://img.shields.io/badge/Coverage-87%25-green)
![Python](https://img.shields.io/badge/Python-3.12-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688)
![React](https://img.shields.io/badge/React-19-61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1)
![Lighthouse Performance](https://img.shields.io/badge/Lighthouse_Performance-71-yellow)
![Lighthouse Accessibility](https://img.shields.io/badge/Lighthouse_Accessibility-96-brightgreen)
![Lighthouse Best Practices](https://img.shields.io/badge/Lighthouse_Best_Practices-100-brightgreen)
![Lighthouse SEO](https://img.shields.io/badge/Lighthouse_SEO-92-brightgreen)

**Production highlights:** 387 backend tests + 62 frontend tests · 87% backend coverage · atomic stock updates · transaction-safe checkout · VNPay replay protection · hybrid cookie/Bearer authentication · admin 2FA · multi-provider LLM chatbot with Gemini/Groq fallback · SSE streaming chatbot · Redis caching · Cloudinary CDN · N+1 query optimization · security headers · Sentry · CI/CD · Light/Dark/System theme · responsive UI · accessibility-focused components

---

## Live Demo

| Service | URL |
|---|---|
| Frontend | https://technest-ai.vercel.app |
| Backend API | https://techsphere-ai.onrender.com |
| Swagger API Docs | https://techsphere-ai.onrender.com/docs |

> Demo credentials can be provided when needed.

---

## Why This Project Stands Out

| Area | Highlights |
|---|---|
| **AI shopping experience** | Smart product search, product recommendations, co-occurrence recommendations, and a chatbot that can use real catalog data instead of hallucinated products. |
| **Streaming chatbot** | `POST /api/ai/chat/stream` streams token-by-token over Server-Sent Events. The UI renders the response live with a typing cursor and keeps product cards/suggestions grounded in database data. |
| **Production-grade fallback design** | LLM providers are optional. Gemini can fail over to Groq, Redis can fail without breaking chat, and the chatbot falls back to deterministic rule-based replies when external AI services are unavailable. |
| **Checkout correctness** | Order creation uses transaction wrappers and conditional stock decrement queries to avoid overselling. VNPay callbacks validate amount, order state, and replayed transaction references. |
| **Security hardening** | Hybrid HttpOnly cookie/Bearer auth, Origin checks for cookie-auth unsafe methods, security headers, XSS-safe image URL validation, admin self-demotion protection, 2FA for admin login, and production config guardrails. |
| **Admin operations** | Dashboard analytics, product/order/user/blog management, bulk inventory updates, CSV export, review moderation, image upload, and audit logs for critical admin actions. |
| **Portfolio polish** | Route-level code splitting, lazy-loaded Recharts, semantic Tailwind tokens for dark mode, mobile-first responsive layouts, skeleton loading states, and ARIA labels for icon controls. |

---

## Demo Flow

1. **Browse products** — Visit the homepage, explore featured products, and filter the catalog by category, brand, price, and sort order.
2. **Use smart search** — Search phrases such as “gaming laptop under 30 million” and get relevance-ranked results.
3. **Open product details** — View optimized images, reviews, related products, recently viewed products, and “customers also bought” recommendations.
4. **Add to cart and checkout** — Add products to cart, validate stock, choose COD or VNPay sandbox, and complete the payment flow.
5. **Chat with AI** — Ask for product recommendations in natural language. The chatbot streams its answer token-by-token and returns matching product cards.
6. **Manage account** — Update profile, change password, view orders, and manage wishlist items.
7. **Use admin panel** — Review dashboard metrics, CRUD products/blogs/users, update inventory in bulk, export CSV, moderate reviews, and inspect audit logs.

---

## Features

### Customer Features

- Register, login, logout, and session restore
- Hybrid authentication: HttpOnly cookie for the frontend, Bearer token support for Swagger/tests
- Profile management and password change
- Forgot/reset password email flow via Resend
- Product catalog with category, brand, price, search, sort, and pagination filters
- Product details with optimized images, reviews, related products, and recently viewed items
- Cart management with stock validation
- Checkout with COD and VNPay sandbox payment
- Order history and order details
- Product reviews and ratings
- Wishlist support
- Blog listing and blog detail pages
- Light/Dark/System theme with persistence
- Mobile-first responsive UI

### AI Features

- **AI Search**
  - Relevance scoring for product search
  - Synonym expansion for common product terms
  - Database pre-filtering to avoid scanning the full catalog in Python

- **AI Recommendations**
  - `cart` strategy: recommends items related to cart contents
  - `history` strategy: recommends items based on purchase history
  - `popular` strategy: recommends best-selling products
  - `co_occurrence` strategy: “customers who bought this also bought” via SQL self-join on order items
  - Fallback chain: co-occurrence → same category/brand → popular → latest products

- **AI Chatbot**
  - Rule-based default mode for reliable local/demo behavior
  - Optional LLM mode with Gemini and Groq providers
  - Provider abstraction for adding more LLM backends
  - Redis-backed LLM response cache with configurable TTL
  - Graceful degradation when Redis or LLM providers are unavailable
  - Anti-hallucination prompt constraints: product names, prices, stock, and brands come from the database
  - SSE streaming endpoint for live token-by-token responses

### Admin Features

- Admin dashboard with revenue, orders, users, products, ratings, and chart data
- Product management with CRUD, soft delete, image upload, and Cloudinary integration
- Blog management
- Order management with status updates and CSV export
- User management with role/status controls and self-demotion protection
- Review moderation
- Bulk inventory update
- Audit logs for create/update/delete/export/inventory actions
- Category and brand management with FK-safe deletion rules
- Admin 2FA setup and login verification

### Backend Engineering

- FastAPI lifespan context manager
- SQLModel repository/service layering
- Alembic migrations
- PostgreSQL production database support
- Redis cache with graceful degradation
- Atomic stock decrement with conditional SQL update
- Transaction wrappers for checkout/cancel flows
- VNPay amount verification and replay protection
- Rate limiting with SlowAPI
- Request/response logging middleware
- Security headers middleware
- Origin check middleware for cookie-auth unsafe requests
- Sentry integration
- GZip compression, disabled for SSE streaming paths

### Frontend Engineering

- React 19 + TypeScript + Vite 8
- Tailwind CSS 4 with semantic design tokens
- shadcn/ui components
- Zustand auth state
- TanStack Query data fetching
- Route-level code splitting with `React.lazy`
- Recharts split into a lazy-loaded admin chunk
- Optimized image component using Cloudinary URL transforms
- Skeleton loading states
- Error boundary
- Responsive admin and customer layouts
- Accessibility improvements for icon buttons, menus, form fields, and decorative content

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript 6, Vite 8, Tailwind CSS 4, shadcn/ui |
| **State & Data** | Zustand 5, TanStack Query 5, Axios |
| **Backend** | FastAPI 0.136, SQLModel, SQLAlchemy 2, Pydantic 2 |
| **Database** | PostgreSQL 16, Alembic migrations |
| **Cache** | Redis |
| **Auth** | JWT, HttpOnly cookies, Bearer tokens, bcrypt, TOTP 2FA |
| **AI / LLM** | Rule-based engine, Gemini, Groq, provider chain, Redis response cache |
| **Payments** | VNPay sandbox, HMAC-SHA512 callback verification |
| **Images** | Cloudinary upload + CDN transforms, optimized frontend image rendering |
| **Email** | Resend |
| **Monitoring** | Sentry |
| **Charts** | Recharts, lazy-loaded |
| **Testing** | Pytest, httpx, Vitest, React Testing Library |
| **Deployment** | Vercel frontend, Render backend, Supabase/PostgreSQL-compatible database |

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ Frontend                                                     │
│ React 19 + Vite + TypeScript + Tailwind + shadcn/ui          │
│ Route chunks · Optimized images · Light/Dark/System theme    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend                                                      │
│ FastAPI + SQLModel + Alembic                                 │
│                                                             │
│ Auth · Products · Cart · Orders · Reviews · Wishlist · Blog  │
│ Admin · Audit Log · VNPay · Upload · Homepage batch API      │
│                                                             │
│ AI Engine                                                    │
│ Rule-based search/recommend/chat                             │
│ Optional LLM chain: Redis cache → Gemini → Groq → fallback   │
└──────────────────────┬──────────────────────┬──────────────┘
                       │                      │
                       ▼                      ▼
          ┌──────────────────────┐   ┌──────────────────────┐
          │ PostgreSQL            │   │ Redis                │
          │ App data + migrations │   │ API/LLM/cache TTLs   │
          └──────────────────────┘   └──────────────────────┘

┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ Cloudinary            │   │ Resend               │   │ Sentry               │
│ Images + CDN          │   │ Transactional email  │   │ Error monitoring     │
└──────────────────────┘   └──────────────────────┘   └──────────────────────┘
```

### Backend Layering

```text
Request → API Router → Service → Repository → Database
                    ↓
             Pydantic Schemas
```

```text
backend/app/
├── api/             # FastAPI routers
├── core/            # Config, DB, cache, middleware, security helpers
├── models/          # SQLModel database models
├── repositories/    # Data access layer
├── schemas/         # Request/response schemas
├── services/        # Business logic
│   └── llm/         # LLM providers, provider chain, Redis cache wrapper
└── main.py          # FastAPI application entry point
```

### Frontend Structure

```text
frontend/src/
├── components/ui/      # shadcn/ui components
├── components/         # Custom reusable components
├── pages/              # Route pages
├── layouts/            # Main and admin layouts
├── routes/             # React Router setup
├── store/              # Zustand stores
├── hooks/              # Custom hooks
├── lib/                # API, streaming, utility libraries
├── utils/              # Formatting, Cloudinary, API helpers
└── types/              # Shared TypeScript types
```

---

## Screenshots

Screenshots are intentionally not committed to keep the repository lightweight. Place images in `docs/screenshots/` and uncomment the block below if you want them rendered in GitHub.

| Screen | Suggested Path |
|---|---|
| Homepage | `docs/screenshots/homepage.jpg` |
| Mobile homepage | `docs/screenshots/mobile-homepage.jpg` |
| Product detail | `docs/screenshots/product-detail.jpg` |
| AI chatbot | `docs/screenshots/ai-chat.jpg` |
| Checkout | `docs/screenshots/checkout.jpg` |
| Admin dashboard | `docs/screenshots/admin-dashboard.jpg` |

<!--
![Homepage](docs/screenshots/homepage.jpg)
![Mobile homepage](docs/screenshots/mobile-homepage.jpg)
![Product detail](docs/screenshots/product-detail.jpg)
![AI chatbot](docs/screenshots/ai-chat.jpg)
![Checkout](docs/screenshots/checkout.jpg)
![Admin dashboard](docs/screenshots/admin-dashboard.jpg)
-->

---

## Local Development

### Requirements

- Python 3.12+
- Node.js 20+
- PostgreSQL 16+
- Redis optional; the app runs without Redis using graceful degradation
- Cloudinary, Resend, VNPay, Gemini, and Groq credentials are optional for local development

### 1. Clone the Repository

```bash
git clone https://github.com/VanTruong475/techsphere-ai.git
cd techsphere-ai
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
# Windows PowerShell: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create a backend environment file:

```bash
cp .env.example .env
```

Update at least:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/techsphere_ai
SECRET_KEY=replace_with_a_long_random_secret
CORS_ORIGINS=http://localhost:5173,http://localhost:4173
FRONTEND_URL=http://localhost:5173
```

Run migrations and seed data:

```bash
alembic upgrade head
python -m app.seed
```

Start the API server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend URLs:

- API root: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/api/health

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend URL:

- http://localhost:5173

The frontend expects:

```env
VITE_API_URL=http://localhost:8000
```

---

## Optional Integrations

### Redis

Used for product/category/brand/homepage caching and optional LLM response caching.

```env
REDIS_URL=redis://localhost:6379
```

If Redis is not configured or is unavailable, the app continues to run without cache.

### Cloudinary

Used for admin image upload and optimized image delivery.

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Resend Email

Used for forgot/reset password and transactional emails.

```env
EMAIL_ENABLED=true
RESEND_API_KEY=re_xxx
EMAIL_FROM=TechNest <noreply@yourdomain.com>
```

### AI / LLM Chatbot

Rule-based AI works by default. To enable LLM responses:

```env
AI_LLM_ENABLED=true
AI_PROVIDERS=gemini,groq
AI_PROVIDER=gemini
AI_LLM_TIMEOUT_SECONDS=10.0
AI_LLM_CACHE_TTL_SECONDS=3600
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash-lite
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.1-8b-instant
```

### VNPay Sandbox

```env
VNPAY_TMN_CODE=your_tmn_code
VNPAY_HASH_SECRET=your_hash_secret
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:8000/api/payments/vnpay-return
```

---

## Testing

### Backend

```bash
cd backend
pytest tests/ -v
pytest tests/ -v --cov=app --cov-report=term-missing
```

Current backend status:

- **387/387 tests passing**
- **87% coverage**
- Coverage includes auth, users, products, categories, brands, cart, orders, VNPay, reviews, wishlist, admin, audit logs, email, upload, Redis cache, LLM providers, streaming chatbot, config guardrails, security headers, and edge cases.

### Frontend

```bash
cd frontend
npm test
npm run test:watch
npm run test:coverage
npm run lint
npm run build
```

Current frontend status:

- **62/62 tests passing**
- Vitest + React Testing Library coverage for formatting utilities, API error helpers, Cloudinary URL transforms, SSE event parsing, status constants, sale badges, star ratings, pagination, and recently viewed products.

### CI/CD

GitHub Actions runs on pushes and pull requests to `main`:

- Backend job: install Python dependencies, run Alembic migrations, run Pytest with coverage
- Frontend job: install Node dependencies and run production build

Workflow file: `.github/workflows/ci.yml`

---

## API Overview

Base URL locally:

```text
http://localhost:8000
```

Key API groups:

| Area | Endpoints |
|---|---|
| Auth | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/change-password`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/2fa/*` |
| Products | `/api/products`, `/api/products/{id}`, `/api/products/bulk-update` |
| Categories | `/api/categories`, `/api/categories/{id}` |
| Brands | `/api/brands`, `/api/brands/{id}` |
| Cart | `/api/cart`, `/api/cart/items`, `/api/cart/items/{item_id}` |
| Orders | `/api/orders`, `/api/orders/{id}`, `/api/orders/{id}/status` |
| Reviews | `/api/products/{id}/reviews`, `/api/reviews/{id}`, `/api/admin/reviews` |
| Wishlist | `/api/wishlist`, `/api/wishlist/{product_id}` |
| Payments | `/api/payments/vnpay-create`, `/api/payments/vnpay-return` |
| AI | `/api/ai/search`, `/api/ai/recommend`, `/api/ai/chat`, `/api/ai/chat/stream` |
| Admin | `/api/admin/stats`, `/api/admin/orders`, `/api/admin/orders/export`, `/api/admin/audit-logs` |
| Blog | `/api/blog`, `/api/blog/{slug}` |
| Health | `/health`, `/api/health`, `/api/health/db` |

Full endpoint documentation: [docs/API_ENDPOINTS.md](docs/API_ENDPOINTS.md)

---

## Deployment

Production deployment uses:

- **Frontend:** Vercel
- **Backend:** Render Web Service
- **Database:** Supabase PostgreSQL / PostgreSQL-compatible hosted database
- **Cache:** Redis, optional but recommended
- **Images:** Cloudinary
- **Monitoring:** Sentry
- **Email:** Resend

See the full deployment guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## Documentation

| Document | Description |
|---|---|
| [docs/API_ENDPOINTS.md](docs/API_ENDPOINTS.md) | API endpoint reference |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deployment guide for Vercel, Render, database, Redis, Cloudinary, Resend, VNPay, and Sentry |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Database schema reference |
| [docs/SRS.md](docs/SRS.md) | Software Requirements Specification |
| [docs/DEMO_CHECKLIST.md](docs/DEMO_CHECKLIST.md) | Demo checklist |
| [ROADMAP.md](ROADMAP.md) | Project roadmap and sprint history |

---

## Project Status

The project is portfolio-ready and includes the core e-commerce journey, AI features, admin operations, deployment documentation, security hardening, and automated tests.

Completed areas:

- Customer shopping flow
- Auth and profile management
- Product catalog and admin CRUD
- Cart, checkout, order history, and VNPay sandbox
- Reviews and wishlist
- Blog pages and admin blog management
- AI search, recommendations, and chatbot
- Streaming chatbot via SSE
- Admin dashboard, CSV export, bulk inventory, audit logs
- Redis caching and Cloudinary image optimization
- Sentry, security headers, Origin checks, and production config validation
- CI/CD and deployment docs
- Responsive UI, dark mode, loading skeletons, route-level code splitting, and accessibility improvements

---

## License

This project is built for learning, portfolio, and demonstration purposes.
