# filmsome-web
the official website of film.some
# Account email pages — AUTH-001

The /verified/ and /reset-password/ pages support bilingual confirmation, resend and full browser password recovery. Coordinate deployment with vasntoumos/filmsome/docs/AUTH_EMAIL_ACCESS.md and the supplied confirm-signup.html / recovery.html Auth templates.

Only a public Supabase publishable key belongs in assets/auth-config.js. SMTP/Resend secrets, service-role keys and management tokens must never be included. All Auth requests are fixed to the film.some project. Credentials live only in page memory and temporary sessions use local cleanup; other devices are not globally signed out.

New templates use fragment token hashes, with explicit Open film.some or browser verification. Already-issued implicit access-token links are checked with Auth in the browser. Code-only PKCE links show fresh-link guidance instead of false success.

Checks: npm ci --ignore-scripts; npm test; npx playwright install --with-deps chromium; npm run test:browser. Playwright 1.62.1 is pinned with a lockfile. The mobile-width browser smoke test intercepts every network request and sends no real emails/passwords. The local sandbox could not launch Chromium because required OS sockets are restricted; GitHub CI runs that check separately.

Live Resend/Supabase configuration, actual mailbox delivery, Safari/iOS callbacks and physical TestFlight acceptance remain separate. Committing these pages does not configure SMTP, DNS or billing.

