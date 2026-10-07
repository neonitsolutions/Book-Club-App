# Readers Club

A book club platform for rentals, subscriptions, and inventory management.

## Monorepo structure

- `apps/frontend` – Next.js storefront and member/admin experience
- `apps/backend` – NestJS API foundation
- `docker-compose.yml` – container orchestration for frontend, backend, MongoDB, and Redis

## Getting started

### Frontend

```bash
cd apps/frontend
npm install
npm run dev
```

### Backend

```bash
cd apps/backend
npm install
npm run start:dev
```

### Docker

```bash
docker compose up --build
```

## Included features

- Public catalog, rental, sale, and membership flows
- Member dashboard and subscription plans
- Admin overview, books management, and inventory tracking
- Staff scanner workflow mockup
- Architecture aligned to the blueprint in `CLAUDE.md`
