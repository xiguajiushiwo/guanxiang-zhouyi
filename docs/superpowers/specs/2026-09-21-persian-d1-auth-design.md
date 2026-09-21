# Persian interface and Cloudflare D1 accounts design

## Goal

Add Persian (`fa`) as a complete interface language alongside Chinese and English, and add optional accounts whose completed divinations and notes synchronize through Cloudflare D1. Visitors remain fully usable without an account and keep their records only in the current browser.

## Confirmed decisions

- Cloudflare D1 is the database; no MySQL or Supabase dependency will be added.
- Account authentication is email plus password.
- Sessions use secure, HttpOnly cookies; the browser never receives a database credential or password hash.
- Registered users can see their own records on another device after signing in.
- Guests continue to use the existing local-storage history and are never forced to register.
- Existing Cloudflare Pages, Liara, GitHub, AI Worker, mobile layout, and reading behavior remain available.
- The current Cloudflare AI Worker stays focused on readings; account APIs use a separate Worker to keep AI quotas and account data isolated.

## Architecture

```text
Browser on Cloudflare Pages or Liara
  -> same-origin /api/account/* proxy
  -> Guanxiang account Worker
  -> Cloudflare D1

Browser local guest mode
  -> existing localStorage history

Account Worker
  -> D1 users, sessions, and readings tables
  -> HttpOnly session cookie returned through the same-origin proxy
```

The account Worker is a separate deployment with a D1 binding. Cloudflare Pages uses a Pages Function proxy, and the Liara Node mirror uses its existing server proxy path. Both proxies preserve status, JSON body, and `Set-Cookie` headers. This keeps the browser on the visible site's origin and also keeps account endpoints usable from the Iran-oriented Liara mirror.

The Netlify mirror, if still active, receives the same proxy adapter or is explicitly documented as read-only until its account proxy is configured. No frontend origin is authorized directly against the account Worker.

## Persian localization

Add `fa` to the language registry and dictionary with the same key coverage as `zh-CN` and `en`. Persian uses `lang="fa"`, `dir="rtl"`, Persian-friendly font fallbacks, RTL-aware navigation and forms, and mirrored layout only where reading order benefits from it. Hexagram symbols, numeric line ordering, and the ritual's bottom-to-top semantic order remain unchanged.

The language menu displays `فارسی` and keeps `Language` as the accessible control label. Language selection persists in the existing language storage key. The current page updates without losing an in-progress ritual.

Add Persian UI strings for the cover, navigation, home, hexagram browser, Ten Wings, principles, divination flow, history, dialogs, auth, errors, and accessibility labels. Add Persian names and summaries through the existing hexagram localization module. Classical source text remains the verified source text rather than an invented translation; Persian interface labels and AI explanations are localized, and the source edition remains visibly identified.

The AI payload accepts `language: 'fa'`. The AI Worker adds a Persian prompt with the same evidence, safety, and structure requirements as Chinese and English, returning Persian section headings. Error messages and incomplete-reading validation also support Persian.

## Account data model

The first D1 migration creates:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'zh-CN',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE readings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payload_json TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'zh-CN',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX readings_user_updated ON readings(user_id, updated_at DESC);
CREATE INDEX sessions_expiry ON sessions(expires_at);
```

`payload_json` stores the already validated normalized journal record, including local interpretation, notes, tags, and any completed AI reading. The API validates record shape and size before writing. Records are always scoped by the authenticated session's `user_id`; clients cannot submit or override that field.

## Authentication

Endpoints exposed through the same-origin proxy:

- `POST /api/account/register`: normalize email, validate password, hash with Web Crypto PBKDF2-SHA-256 and a random salt, create user, issue session.
- `POST /api/account/login`: verify password with constant-time digest comparison, issue a new session.
- `POST /api/account/logout`: delete the current session and clear the cookie.
- `GET /api/account/me`: return the authenticated user's id, email, and preferred language, or `401`.
- `GET /api/account/readings`: return the user's records ordered by `updated_at` with a bounded page size.
- `PUT /api/account/readings/:id`: create or replace one user-owned record after validation.
- `DELETE /api/account/readings/:id`: delete one user-owned record.
- `POST /api/account/readings/merge`: idempotently upload a bounded batch of local guest records, preserving newer records and merging notes/tags using the existing journal merge rules.

Sessions use a random opaque token. Only its SHA-256 hash is stored in D1. The cookie is `__Host-guanxiang_session`, `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, with a finite expiration. Login, registration, and merge endpoints have conservative request limits and generic failure messages so they do not reveal whether an email exists.

Email verification and password-reset email delivery are out of scope for the first release. The UI must state that the account is password-based and provide a future-compatible account settings boundary; adding a verified-email provider later will not change the readings schema.

## Guest and account synchronization

1. On first load, the app calls `/api/account/me` without blocking local use.
2. If unauthenticated, existing local history remains the active journal and the UI identifies it as device-only.
3. After registration or login, the app fetches the user's D1 records and shows a merge dialog when local guest records exist.
4. “Merge” sends normalized local records in bounded batches, then replaces the local active list with the server's merged result. “Keep cloud only” leaves local guest data untouched but does not upload it.
5. New completed readings and note changes are saved to localStorage immediately, then synchronized to D1 when the account is active. A failed sync never removes the local copy and is shown as retryable status.
6. Logout stops cloud writes and returns the UI to local guest mode. Cloud records remain in D1 and are visible again after the next login.

Browser-local history remains origin-scoped. Signing into the same account on Cloudflare Pages and Liara retrieves the same D1 records; visitor-only records remain on the device that created them until merged.

## Privacy and security

- Passwords are never stored or logged; only PBKDF2 hashes and salts are stored.
- D1 credentials and Worker bindings never appear in frontend code.
- All record queries include the authenticated `user_id` predicate.
- CORS is unnecessary for same-origin proxies; the account Worker rejects missing or unauthorized origins.
- Proxies forward `Set-Cookie`, `Cache-Control: no-store`, and security headers without exposing Worker internals.
- Login and registration failures use stable generic messages.
- D1 backups and Cloudflare account access remain operational concerns; an optional later enhancement can encrypt sensitive record fields client-side.

## Failure handling

- If the account API is unavailable, the app remains usable in guest mode and preserves all local records.
- A failed merge keeps the original local records and reports the failed batch.
- Expired sessions return `401`; the frontend clears account state and does not delete local history.
- Malformed, oversized, duplicate, or cross-user record IDs are rejected before D1 writes.
- AI reading generation remains independent; D1 outages do not disable local readings.

## Verification

Automated tests will cover:

- complete dictionary-key parity and Persian `fa`/RTL metadata;
- Persian AI headings, validation, and error messages;
- PBKDF2 hashing, session issuance, expiry, logout, duplicate registration, and generic errors;
- record ownership isolation, pagination, upsert/delete, merge idempotence, and malformed payload rejection;
- Pages and Liara proxy preservation of `Set-Cookie` and JSON errors;
- guest-mode fallback and login/merge/logout state transitions;
- existing divination, history, browser, and mobile suites.

Production checks will cover a Persian desktop/mobile flow on Cloudflare and Liara, registration, login on a second browser context, record visibility, guest merge, logout fallback, and an attempted cross-user record access that returns `404` or `403` without leaking data.

## Out of scope

- Social login, phone verification, email verification, password reset, multi-factor authentication, admin dashboards, subscriptions, and paid plans.
- Direct MySQL support.
- Client-side end-to-end encryption of record contents; this can be added after the account model is stable.
