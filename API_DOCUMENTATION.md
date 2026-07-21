# Bite Brew Cafe Backend API Documentation

Base URL:
- `http://localhost:7000/api/v1/bite-brew`

Auth:
- Protected routes require `Authorization: Bearer <access_token>`.
- Tokens are issued by signin/signup and also set in cookies, but route protection currently reads the bearer token from the header.

Common response shape:
- Success: `{ message, data? }` or `{ message, data, pagination }`
- Error: `{ message }` (sometimes class-validator error arrays for auth DTO validation)

## Health

### `GET /health`
Short explanation: Service health check.
- Auth: No
- Response: `200` with `{ ok: true, service: "bite-brew-cafe-backend" }`

## Auth

### `POST /auth/signup`
Short explanation: Register a new user account.
- Auth: No
- Body:
  - `name` (string, required)
  - `email` (valid email, required)
  - `password` (min 6, uppercase+lowercase+number, required)
- Response:
  - `201` user created
  - `400` invalid payload or user already exists

### `POST /auth/signin`
Short explanation: Login user and issue JWT tokens.
- Auth: No
- Body:
  - `email` (required)
  - `password` (required)
- Response:
  - `200` login success
  - `400` invalid credentials/payload

### `POST /auth/logout`
Short explanation: Logout user by clearing auth cookies.
- Auth: No
- Response:
  - `200` logout success

### `POST /auth/refresh-token`
Short explanation: Issue new access/refresh tokens using a valid refresh token.
- Auth: No
- Cookie/Body:
  - `refresh_token` (required; read from `refresh_token` cookie, or request body fallback)
- Response:
  - `200` tokens refreshed (new `access_token` and `refresh_token` cookies are set)
  - `401` unauthorized (missing/invalid/expired refresh token)

### `POST /auth/forgot-password`
Short explanation: Send password reset email with reset token.
- Auth: No
- Body:
  - `email` (required)
- Response:
  - `200` reset email sent
  - `404` user not found
  - `400` validation error

### `POST /auth/reset-password`
Short explanation: Reset password using token sent by email.
- Auth: No
- Body:
  - `email` (required)
  - `token` (required)
  - `password` (required)
  - `confirmPassword` (required, must match password)
- Response:
  - `200` password reset success
  - `400` invalid token or bad payload
  - `404` user not found

## Users

### `GET /users`
Short explanation: List users with pagination and search.
- Auth: Yes (`admin`, `manager`)
- Query:
  - `page` (optional, default `1`)
  - `limit` (optional, default `10`, max `100`)
  - `search` (optional; matches name/email)
- Response: `200` with `{ data, pagination }`

### `GET /users/me`
Short explanation: Get current authenticated user profile.
- Auth: Yes (any authenticated user)
- Response:
  - `200` current user
  - `401` unauthorized
  - `404` user not found

### `PATCH /users/:id/role`
Short explanation: Update user role.
- Auth: Yes (`admin`)
- Body:
  - `role` (required; one of `admin | user | manager`)
- Response:
  - `200` updated
  - `400` bad request
  - `404` user not found

## Menu - Categories

### `GET /menu/categories`
Short explanation: List categories.
- Auth: No
- Query:
  - `page`, `limit`, `search` (optional)
- Response: `200` paginated categories

### `POST /menu/categories`
Short explanation: Create a menu category.
- Auth: Yes (`admin`, `manager`)
- Body:
  - `name` (required)
  - `description` (optional)
  - `isActive` (optional)
- Response: `201` created, `400` bad request

### `PATCH /menu/categories/:id`
Short explanation: Update category fields.
- Auth: Yes (`admin`, `manager`)
- Body: any of `name`, `description`, `isActive`
- Response: `200` updated, `404` not found

### `DELETE /menu/categories/:id`
Short explanation: Delete category.
- Auth: Yes (`admin`)
- Response: `200` deleted, `404` not found

## Menu - Items

### `GET /menu/items`
Short explanation: List menu items.
- Auth: No
- Query:
  - `page`, `limit` (optional)
  - `search` (optional)
  - `categoryId` (optional)
  - `available` (optional `true|false`)
- Response: `200` paginated menu items

### `POST /menu/items`
Short explanation: Create a menu item.
- Auth: Yes (`admin`, `manager`)
- Content-Type:
  - `application/json` or `multipart/form-data`
- Body/Form fields:
  - `name` (required)
  - `categoryId` (required)
  - `price` (required)
  - `image` (optional URL string)
  - `image` (optional file when using `multipart/form-data`, max 5MB)
  - `description`, `available`, `featured`, `discount` (optional)
- Response:
  - `201` created
  - `400` category not found or invalid payload

### `PATCH /menu/items/:id`
Short explanation: Update menu item fields.
- Auth: Yes (`admin`, `manager`)
- Body: any editable menu item fields
- Response: `200` updated, `404` not found

### `DELETE /menu/items/:id`
Short explanation: Delete menu item.
- Auth: Yes (`admin`)
- Response: `200` deleted, `404` not found

## Orders

### `POST /orders`
Short explanation: Place an order (guest or authenticated user).
- Auth: No (optional auth supported)
- Body:
  - `customerName` (required)
  - `items` (required array of `{ menuItemId, quantity }`)
  - `phone`, `email`, `tableNumber`, `deliveryAddress`, `orderType`, `paymentMethod` (optional)
- Response:
  - `201` order placed
  - `400` bad request or invalid menu items

### `GET /orders`
Short explanation: List orders with filters.
- Auth: Yes (`admin`, `manager`)
- Query:
  - `page`, `limit` (optional)
  - `status` (optional)
  - `search` (optional; customerName/email)
- Response: `200` paginated orders

### `GET /orders/:id`
Short explanation: Get order details by ID.
- Auth: Yes (any authenticated user)
- Response: `200` found, `404` not found

### `PATCH /orders/:id/status`
Short explanation: Update order status.
- Auth: Yes (`admin`, `manager`)
- Body:
  - `status` (required; `pending|confirmed|preparing|ready|completed|cancelled`)
- Response: `200` updated, `400` invalid status, `404` not found

### `PATCH /orders/:id/priority`
Short explanation: Update order priority so UI can show the order with different color urgency.
- Auth: Yes (`admin`, `manager`)
- Body:
  - `priority` (required; `HIGH|MEDIUM|LOW`)
- Response: `200` updated, `400` invalid priority, `404` not found

### `DELETE /orders/:id`
Short explanation: Delete an order by ID.
- Auth: Yes (`admin`, `manager`)
- Response: `200` deleted, `404` not found

## Loyalty

The loyalty system gives authenticated customers points for completed purchases, daily check-ins, referrals, and admin adjustments. Customers spend points by redeeming rewards from the rewards catalog. Every point movement is written to `loyalty_transactions` for auditability.

### Loyalty Flow

1. Customer signs in and calls `GET /loyalty/dashboard`.
2. If the customer does not already have a loyalty account, the backend creates one automatically with:
   - `currentPoints = 0`
   - `lifetimeEarned = 0`
   - `lifetimeRedeemed = 0`
   - `expiredPoints = 0`
   - `membershipTier = BRONZE`
   - generated `referralCode`
3. Customer earns points from:
   - completed authenticated orders
   - daily check-ins
   - completed referrals
   - admin point grants
4. Customer spends points by redeeming a reward catalog item.
5. Redeemed rewards are issued into the customer's reward wallet.
6. Frontend can show point history from `/loyalty/history`.

### Points Calculation

Purchase points are awarded when an authenticated order status is changed to `completed`.

Default formula:

```txt
pointsAwarded = floor(order.totalPrice * LOYALTY_POINTS_PER_CURRENCY_UNIT)
```

Default `LOYALTY_POINTS_PER_CURRENCY_UNIT` is `1`.

Example:

```txt
order.totalPrice = 275.50
pointsAwarded = floor(275.50 * 1) = 275
```

The purchase reward is idempotent. The backend stores `sourceType = ORDER`, `sourceId = order.id`, and `type = EARNING`, so the same completed order cannot award points twice.

### Tier Calculation

Customer tier is calculated from `totalSpending`.

```txt
BRONZE   >= 0
SILVER   >= 100
GOLD     >= 300
PLATINUM >= 750
```

### Transaction Types

Possible `loyalty_transactions.type` values:

```txt
EARNING
REDEMPTION
EXPIRATION
ADJUSTMENT
```

Possible `sourceType` values:

```txt
ORDER
REWARD_REDEMPTION
DAILY_CHECK_IN
REFERRAL
ADMIN_ADJUSTMENT
POINT_EXPIRATION
```

Each transaction may include:

- `amount`
- `type`
- `reason`
- `balanceAfter`
- `sourceType`
- `sourceId`
- `metadata`
- `createdAt`

### `POST /loyalty/accounts`
Short explanation: Create the authenticated customer's loyalty account. Usually optional because dashboard lazy-creates an account if missing.
- Auth: Yes
- Body:
  - `referralCode` (optional string, 3-20 characters; if omitted, backend generates one)
- Example body:

```json
{
  "referralCode": "BITE-RAJ123"
}
```

- Response:
  - `201` loyalty account created
  - `409` referral code already in use
  - `401` unauthorized

### `GET /loyalty/dashboard`
Short explanation: Get the authenticated customer's loyalty account snapshot.
- Auth: Yes
- Body: none
- Response: `200` with account, streak, and active reward count
- Example response:

```json
{
  "message": "Success",
  "data": {
    "account": {
      "customerId": "45aa3c5d-bb09-4896-87c8-ca62561aeaf1",
      "currentPoints": 120,
      "lifetimeEarned": 180,
      "lifetimeRedeemed": 60,
      "expiredPoints": 0,
      "membershipTier": "SILVER",
      "totalSpending": 150,
      "referralCode": "BITE-A1B2C3"
    },
    "streakCount": 3,
    "lastCheckInDate": "2026-07-21",
    "activeRewards": 1
  }
}
```

### `GET /loyalty/catalog`
Short explanation: List active, non-expired rewards customers can redeem.
- Auth: No
- Body: none
- Response: `200` active reward catalog

### `GET /loyalty/wallet`
Short explanation: List rewards already redeemed by the authenticated customer.
- Auth: Yes
- Body: none
- Response: `200` wallet items with reward catalog details
- Example response item:

```json
{
  "id": "wallet-id",
  "rewardCatalogId": "reward-id",
  "isUsed": false,
  "expiresAt": "2026-07-28T00:00:00.000Z",
  "rewardCatalog": {
    "title": "Free Coffee",
    "type": "FREE_COFFEE",
    "pointsRequired": 100
  }
}
```

### `POST /loyalty/redeem`
Short explanation: Redeem a reward using current points. The reward is issued into the customer's wallet.
- Auth: Yes
- Body:
  - `rewardId` (UUID, required)
- Example body:

```json
{
  "rewardId": "7a77becc-7bc9-4d12-9f85-0ef384d48d7f"
}
```

- Backend checks:
  - reward exists
  - reward is active
  - reward is not expired
  - inventory is available
  - customer has not exceeded `usageLimit`
  - customer has enough `currentPoints`
- Effects:
  - subtracts `pointsRequired` from `currentPoints`
  - adds `pointsRequired` to `lifetimeRedeemed`
  - decrements `inventoryLimit` when configured
  - creates a `reward_wallets` item
  - creates a `REDEMPTION` transaction
- Response:
  - `200` redeemed
  - `400` insufficient points, inactive reward, expired reward, inventory/usage limit reached
  - `401` unauthorized

### `POST /loyalty/check-in`
Short explanation: Award daily check-in points and maintain streak count.
- Auth: Yes
- Body: none
- Default calculation:

```txt
base = 5
3+ day streak bonus = +5
7+ day streak bonus = +15
```

- Examples:

```txt
Day 1 = 5 points
Day 3 = 10 points
Day 7 = 20 points
```

- Response:
  - `200` checked in
  - `400` already checked in today
  - `401` unauthorized

### `POST /loyalty/referral/claim`
Short explanation: Claim another customer's referral code. Points are awarded only after the referred customer completes their first order.
- Auth: Yes
- Body:
  - `referralCode` (required string)
- Example body:

```json
{
  "referralCode": "BITE-A1B2C3"
}
```

- Backend checks:
  - referral code exists
  - user is not referring themselves
  - user has not already claimed a referral
- Initial effect:
  - creates referral with `status = PENDING`
- Completion effect:
  - when the referred customer completes first authenticated order, referral becomes `COMPLETED`
  - referrer gets `LOYALTY_REFERRER_BONUS_POINTS`, default `50`
  - friend gets `LOYALTY_FRIEND_BONUS_POINTS`, default `25`
- Response:
  - `201` referral claimed
  - `400` invalid referral, self referral, or already referred
  - `401` unauthorized

### `GET /loyalty/history`
Short explanation: Get paginated loyalty point transaction history for the authenticated customer.
- Auth: Yes
- Query:
  - `page` (optional, default `1`)
  - `limit` (optional, default `10`)
  - `type` (optional: `EARNING|REDEMPTION|EXPIRATION|ADJUSTMENT`)
- Example:

```http
GET /loyalty/history?page=1&limit=10&type=EARNING
```

- Response: `200` with `{ data, pagination }`

### `PATCH /loyalty/admin/config`
Short explanation: Return active loyalty rules and requested config payload. Runtime persistence is not currently implemented.
- Auth: Yes (`admin`)
- Body: free-form object
- Response: `200`

### `POST /loyalty/admin/adjust-points`
Short explanation: Manually grant or deduct points for a customer.
- Auth: Yes (`admin`)
- Body:
  - `customerId` (UUID, required)
  - `amount` (number, required, minimum `1`)
  - `type` (required: `GRANT|DEDUCT`)
  - `reason` (optional string)
- Example body:

```json
{
  "customerId": "45aa3c5d-bb09-4896-87c8-ca62561aeaf1",
  "amount": 100,
  "type": "GRANT",
  "reason": "Customer support compensation"
}
```

- Effects:
  - `GRANT`: increases `currentPoints` and `lifetimeEarned`
  - `DEDUCT`: decreases `currentPoints` and increases `lifetimeRedeemed`
  - creates an `ADJUSTMENT` transaction
- Response:
  - `200` updated
  - `400` invalid payload or insufficient points for deduct
  - `404` loyalty account not found

### `POST /loyalty/admin/catalog`
Short explanation: Create a reward catalog item.
- Auth: Yes (`admin`)
- Body:
  - `title` (required string)
  - `type` (optional: `FREE_COFFEE|FREE_CAKE|PERCENTAGE_DISCOUNT|FIXED_DISCOUNT|FREE_DELIVERY`, default `FIXED_DISCOUNT`)
  - `pointsRequired` (required number)
  - `isActive` (optional boolean, default `true`)
  - `usageLimit` (optional number; max redemptions per customer)
  - `inventoryLimit` (optional number; total available inventory)
  - `validityDays` (optional number; wallet reward validity after redemption)
  - `expiryDate` (optional date string; catalog expiry)
  - `metadata` (optional object)
- Example body:

```json
{
  "title": "Free Coffee",
  "type": "FREE_COFFEE",
  "pointsRequired": 100,
  "isActive": true,
  "usageLimit": 1,
  "inventoryLimit": 50,
  "validityDays": 7,
  "expiryDate": "2026-12-31T23:59:59.000Z",
  "metadata": {
    "description": "Redeem one free coffee"
  }
}
```

- Response:
  - `201` created
  - `400` invalid payload

### `GET /loyalty/admin/analytics`
Short explanation: Get aggregate loyalty transaction metrics over an optional date range.
- Auth: Yes (`admin`)
- Query:
  - `start` (optional date string)
  - `end` (optional date string)
- Example:

```http
GET /loyalty/admin/analytics?start=2026-07-01&end=2026-07-31
```

- Response: `200` with raw points totals grouped by transaction type and active loyalty rules

### Frontend Integration Checklist

- Send `Authorization: Bearer <access_token>` for all protected loyalty routes.
- Use `/loyalty/dashboard` as the first loyalty screen call.
- Use `/loyalty/catalog` to render redeemable rewards.
- Use `/loyalty/wallet` to render already-redeemed rewards.
- Use `/loyalty/history` for the points activity screen.
- After signin, make sure the access token is included in the `Authorization` header; cookies alone are not enough for current route protection.
- To award purchase points, create orders as an authenticated user and have admin/manager update the order status to `completed`.
- Do not calculate trusted point balances on the frontend. Display backend values from dashboard/history responses.

## Messages

### `POST /messages`
Short explanation: Submit a customer message/contact request.
- Auth: No
- Body:
  - `senderName` (required)
  - `content` (required)
  - `phone`, `email`, `source` (optional)
- Response: `201` created, `400` bad request

### `GET /messages`
Short explanation: List messages.
- Auth: Yes (`admin`, `manager`)
- Query:
  - `page`, `limit` (optional)
  - `isRead` (optional `true|false`)
- Response: `200` paginated messages

### `PATCH /messages/:id/read`
Short explanation: Mark a message read/unread.
- Auth: Yes (`admin`, `manager`)
- Body:
  - `isRead` (optional; defaults to `true`)
- Response: `200` updated, `404` not found

### `DELETE /messages/:id`
Short explanation: Delete message.
- Auth: Yes (`admin`)
- Response: `200` deleted, `404` not found

## Newsletter

### `POST /newsletter/subscribe`
Short explanation: Subscribe an email to newsletter.
- Auth: No
- Body:
  - `email` (required)
- Response:
  - `201` subscribed
  - `200` already subscribed
  - `400` bad request
- Notes:
  - On new subscription, a welcome email is queued through BullMQ (`email` queue) and sent asynchronously by the worker.

### `GET /newsletter`
Short explanation: List newsletter subscribers.
- Auth: Yes (`admin`, `manager`)
- Query:
  - `page`, `limit` (optional)
  - `status` (optional)
- Response: `200` paginated subscribers

### `POST /newsletter/campaign`
Short explanation: Queue a promotional newsletter campaign to subscribed and/or registered users.
- Auth: Yes (`admin`, `manager`)
- Body:
  - `subject` (required string)
  - `headline` (required string)
  - `intro` (optional string)
  - `offerTitle` (optional string; e.g. `20% Weekend Discount`)
  - `offerDescription` (optional string)
  - `events` (optional string array; max 8 rendered)
  - `couponCode` (optional string)
  - `validUntil` (optional string; free-form date text)
  - `ctaText` (optional string)
  - `ctaUrl` (optional string; must be `http/https` to be used as link)
  - `sendToSubscribers` (optional boolean, default `true`)
  - `sendToRegisteredUsers` (optional boolean, default `true`)
- Response:
  - `200` queued with recipient count
  - `400` invalid payload
- Notes:
  - Recipients are de-duplicated by email across newsletter subscribers and registered users.
  - Emails are queued via BullMQ `email` queue and sent asynchronously.

### `PATCH /newsletter/:id/status`
Short explanation: Update subscriber status.
- Auth: Yes (`admin`, `manager`)
- Body:
  - `status` (required, free-form string)
- Response: `200` updated, `404` not found

### `DELETE /newsletter/:id`
Short explanation: Delete subscriber.
- Auth: Yes (`admin`)
- Response: `200` deleted, `404` not found

## Notifications

### `POST /notifications`
Short explanation: Create a notification.
- Auth: Yes (`admin`, `manager`)
- Body:
  - `content` (required)
  - `type` (optional: `ORDER|MESSAGE|SYSTEM`)
  - `priority` (optional: `HIGH|MEDIUM|LOW`)
  - `actionLink` (optional)
  - `userId` (optional)
- Response: `201` created, `400` bad request

### `GET /notifications`
Short explanation: List notifications.
- Auth: Yes (any authenticated user)
- Query:
  - `page`, `limit` (optional)
  - `userId` (optional)
  - `isRead` (optional `true|false`)
- Response: `200` paginated notifications

### `PATCH /notifications/:id/read`
Short explanation: Mark one notification read/unread.
- Auth: Yes (any authenticated user)
- Body:
  - `isRead` (optional; defaults to `true`)
- Response: `200` updated, `404` not found

### `PATCH /notifications/read-all`
Short explanation: Mark all notifications as read for one user.
- Auth: Yes (any authenticated user)
- Body:
  - `userId` (optional; falls back to authenticated user id)
- Response: `200` updated, `400` bad request

### `PATCH /notifications/:id`
Short explanation: Update notification fields.
- Auth: Yes (`admin`, `manager`)
- Body:
  - `content` (optional)
  - `type` (optional; `ORDER|MESSAGE|SYSTEM`)
  - `priority` (optional; `HIGH|MEDIUM|LOW`)
  - `actionLink` (optional)
  - `isRead` (optional boolean)
- Response: `200` updated, `400` invalid payload, `404` not found

### `DELETE /notifications/:id`
Short explanation: Delete one notification.
- Auth: Yes (`admin`, `manager`)
- Response: `200` deleted, `404` not found

## Gallery

### `GET /gallery`
Short explanation: List gallery images.
- Auth: No
- Query:
  - `page`, `limit` (optional)
  - `category` (optional; `FOOD|INTERIOR|EVENTS`)
  - `featured` (optional `true|false`)
- Response: `200` paginated images

### `POST /gallery`
Short explanation: Add gallery image entry.
- Auth: Yes (`admin`, `manager`)
- Content-Type:
  - `application/json` or `multipart/form-data`
- Body/Form fields:
  - `url` (required for JSON requests)
  - `image` (required file for multipart requests, max 5MB)
  - `category`, `tags`, `featured`, `orderIndex` (optional)
- Response: `201` created, `400` bad request

### `PATCH /gallery/:id`
Short explanation: Update gallery image fields.
- Auth: Yes (`admin`, `manager`)
- Body: any editable gallery fields
- Response: `200` updated, `404` not found

### `DELETE /gallery/:id`
Short explanation: Delete gallery image.
- Auth: Yes (`admin`)
- Response: `200` deleted, `404` not found

## Uploads

### `POST /uploads/image`
Short explanation: Upload an image file to Cloudinary and return hosted metadata.
- Auth: Yes (`admin`, `manager`)
- Content-Type: `multipart/form-data`
- Form data:
  - `image` (file, required; max 5MB; image mime type only)
  - `folder` (string, optional; example `bite-brew/gallery`)
- Response:
  - `201` created with `{ url, publicId, width, height, format, bytes }`
  - `400` bad request (missing file, invalid file type, invalid folder, file too large)
  - `500` Cloudinary misconfiguration or upload failure

## Dashboard

### `GET /dashboard/overview`
Short explanation: Dashboard cards and recent orders.
- Auth: Yes (`admin`, `manager`)
- Query:
  - `limit` (optional; recent orders count, clamped to `1..20`, default `5`)
- Response: `200` with summary cards + recent orders

## Analytics

### `GET /analytics/summary`
Short explanation: Overall analytics summary.
- Auth: Yes (`admin`, `manager`)
- Query:
  - `days` (optional; default `7`, minimum `1`)
- Response: `200` with totals, revenue, and daily visits

## Reports

### `GET /reports/sales`
Short explanation: Sales report by date range with top-selling items.
- Auth: Yes (`admin`, `manager`)
- Query:
  - `from` (optional date string; default `now - 30 days`)
  - `to` (optional date string; default `now`)
- Response: `200` with `range`, `totals`, `salesByDay`, `topItems`

---

## Quick Authorization Example

```http
Authorization: Bearer <your_access_token>
```
