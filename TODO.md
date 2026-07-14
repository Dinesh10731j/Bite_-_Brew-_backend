# TODO - Bite & Brew Loyalty & Rewards System

## Step 1: Repository discovery + integration points
- [x] Locate Orders model + status transition points
- [x] Confirm loyalty awarding should trigger when `OrderStatus` becomes `COMPLETED`
- [x] Confirm awarding must be idempotent (per order)
- [x] Identify auth/customer identifier: `req.user.id` is available via `jwtVerify` and backed by `users.id`

## Step 2: Loyalty domain DB design
- [ ] Add TypeORM entities under `src/entities/loyalty/` for:
  - [ ] Loyalty customer account (points + tier + lifetime)
  - [ ] Points transactions ledger
  - [ ] Reward catalog + redemption ledger
  - [ ] Membership tier rules + upgrade history
  - [ ] Stamp campaigns + stamp progress (coffee-only)
  - [ ] Referral (code + completion awarding + anti-abuse)
  - [ ] Daily check-in (streak)
  - [ ] Challenges + progress + reward
  - [ ] Achievements + unlock ledger (generic)
  - [ ] Coupon wallet + usage ledger
  - [ ] Surprise rewards + outcome ledger
  - [ ] Birthday rewards + generated reward ledger
  - [ ] Loyalty settings/config
  - [ ] Order loyalty award idempotency marker (`order_advanced_loyalty`)

## Step 3: Loyalty services + transactions
- [ ] Implement services under `src/service/loyalty/`:
  - [ ] Award pipeline when order becomes COMPLETED
  - [ ] Earn points logic + transaction records (only after successful completion)
  - [ ] Redeem rewards logic (atomic w/ rollback)
  - [ ] Tier upgrade/downgrade + notifications + history
  - [ ] Stamp updates based on product categories
  - [ ] Referral completion awarding
  - [ ] Daily check-in
  - [ ] Challenges & achievements progression evaluation
  - [ ] Coupon wallet + surprise/birthday reward logic

## Step 4: Order completion atomic integration
- [ ] Modify `src/service/orders/order.service.ts` / `src/controller/orders/orders.controller.ts`:
  - [ ] Ensure status update + loyalty awarding happen atomically
  - [ ] Ensure idempotency marker per order (`order_advanced_loyalty`)

## Step 5: Repositories
- [ ] Implement TypeORM repositories under `src/repository/loyalty/`

## Step 6: APIs (admin + customer)
- [ ] Expand `src/controller/loyalty/loyalty.controller.ts`
- [ ] Wire routes in `src/routes/loyalty/loyalty.routes.ts`
- [ ] Add DTOs + request validation

## Step 7: Security & concurrency
- [ ] Prevent double redemption and double awarding (constraints + locking)
- [ ] Add Redis caching where appropriate
- [ ] Protect redemption flows with proper authorization

## Step 8: Testing
- [ ] Unit tests for points and redemption
- [ ] Integration tests covering order->COMPLETED awarding

## Step 9: Verification
- [ ] Run build + tests

