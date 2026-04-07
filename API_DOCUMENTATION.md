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
- Body:
  - `name` (required)
  - `categoryId` (required)
  - `price` (required)
  - `description`, `image`, `available`, `featured`, `discount` (optional)
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

### `GET /newsletter`
Short explanation: List newsletter subscribers.
- Auth: Yes (`admin`, `manager`)
- Query:
  - `page`, `limit` (optional)
  - `status` (optional)
- Response: `200` paginated subscribers

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
- Body:
  - `url` (required)
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

