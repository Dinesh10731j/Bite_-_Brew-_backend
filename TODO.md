# Loyalty Check-in Fix TODO

## Priority Fixes - All DONE ✅

### 1. Fix `processDailyCheckIn` in `src/service/loyalty/loyalty.service.ts`
- [x] 1a. Auto-create loyalty account if it doesn't exist (call `getOrCreateAccount`)
- [x] 1b. Move `findLatestCheckIn` INSIDE the transaction to prevent race conditions
- [x] 1c. Remove the redundant `existingToday` check (now handled by atomic transaction)

### 2. Fix error handling in `src/controller/loyalty/loyalty.controller.ts`
- [x] 2a. Add `console.error` to `sendServiceError` with full error details
- [x] 2b. Make `sendServiceError` handle null/non-standard errors gracefully
- [x] 2c. Map TypeORM `QueryFailedError` (23505 unique violation) to HTTP 409 Conflict

### 3. Add global error middleware in `src/configs/app.ts`
- [x] 3a. Add Express error-handling middleware (4 params) as the LAST middleware
- [x] 3b. Import `Message` constant for consistent error messages

### 4. Repository update
- [x] 4a. Add `findLatestCheckInForUpdate` method with pessimistic lock

## Verification
- [ ] Restart server
- [ ] Test check-in endpoint with valid JWT
- [ ] Test check-in without existing loyalty account (auto-create)
- [ ] Test double check-in on same day (should return 400)

