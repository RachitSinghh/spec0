---
name: local-dev-setup
description: How to run and verify spec0 locally (DB driver, mock LLM, Inngest dev, Clerk test tokens)
metadata:
  type: project
---

spec0 local dev + verification setup (non-obvious pieces):

- **DB**: `src/db/index.ts` auto-selects the driver — `node-postgres` when `DATABASE_URL` is localhost, else Neon serverless. Local uses Docker: `docker run -d --name spec0-pg -e POSTGRES_PASSWORD=pass -e POSTGRES_USER=user -e POSTGRES_DB=spec0 -p 5544:5432 postgres:16-alpine`. Apply schema with `psql ... -f drizzle/0000_init.sql` (drizzle-kit's neon driver can't reach local pg).
- **.env vs .env.local**: `.env` holds the user's REAL Clerk dev-instance keys (gitignored). `.env.local` overrides only DB URLs → local pg, plus local-only flags. Don't clobber `.env`.
- **Local flags in `.env.local`**: `MESH_MOCK=true` (deterministic stub LLM so the pipeline runs without a real Mesh key — see `src/inngest/mesh-deps.ts`), `MESH_MOCK_FAIL="<system-prompt substring>"` (fault-injection for failure tests), `INNGEST_DEV=1` (use local Inngest Dev Server, not Cloud), dummy `R2_*` (presigning works offline; real PUT needs real R2).
- **Run**: `npm run dev` + `npx inngest-cli@latest dev -u http://localhost:3000/api/inngest`. Trigger pipeline events by POSTing to `http://localhost:8288/e/dev`.
- **Browser e2e**: Playwright + `@clerk/testing` (`clerkSetup` + `setupClerkTestingToken`) bypasses Clerk's Turnstile CAPTCHA. Sign up with `foo+clerk_test@example.com` / OTP `424242`. Sign-UP flow automates cleanly; sign-in is flakier.
- **Gotcha**: never run `npm run build` while `next dev` is running — they share `.next` and it corrupts dev chunks (500s). `rm -rf .next` + restart to recover.
- **Env module is `server-only`**: test server code via `NODE_OPTIONS='--conditions=react-server' npx tsx script.mts` after loading dotenv.
