# TODO - Fix null country/city in login history and sessions

## Steps
- [x] Add geoip-lite import to `src/controller/auth/auth.controller.ts`
- [x] Populate `country` and `city` in `buildAuthContext` using `geoip.lookup(ip)`
- [ ] Verify build compiles (tsc)
