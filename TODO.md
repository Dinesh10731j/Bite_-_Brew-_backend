# TODO

## Loyalty dashboard 500/slow fix
- [x] Add error logging in `LoyaltyController.getDashboard` catch block (do not change response)
- [x] Update `LoyaltyRepository.findLatestCheckIn` to order by `createdAt DESC` and `take: 1`
- [ ] Add small defensive guard in `LoyaltyService.getCustomerDashboard` (optional after DB fix)
- [ ] Re-test endpoint latency and status

