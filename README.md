# Seafood Commerce (Phase 1)

This repository implements the revised **Phase 1 core commerce backend**:

- product publish
- order creation
- choose `STORE_PICKUP` or `SHIPPING`
- payment-marked reservation
- pickup or shipment fulfillment
- cancellation rollback (before fulfillment boundary)
- order/inventory logs for all critical state changes

## Stack

- Backend: NestJS + TypeScript
- Database model: Prisma + PostgreSQL
- Tests: Jest (unit + smoke/integration specs)

## Setup

1. Install dependencies

```bash
npm install
```

2. Apply migration SQL in PostgreSQL

```bash
# apply SQL in prisma/migrations/20260407120000_init/migration.sql
```

3. Seed local data (real seed path)

```bash
npm run seed
```

4. Run tests

```bash
npm test
```

## Run commands

```bash
# start api
npm run start -w @seafood/api

# backend tests
npm run test -w @seafood/api

# seed demo data
npm run seed -w @seafood/api
```

## Role boundary (Phase 1 minimal)

Use request header:

- `x-role: ADMIN`
- `x-role: STORE`
- `x-role: CUSTOMER`

## Scope guardrails

Not included in Phase 1:

- coupons
- membership / points
- distribution
- promotion engine
- advanced BI
