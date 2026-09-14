# Public Release Hardening Design

## Goal

Harden the existing dual-interpretation application for public deployment without changing its divination flow or adding new content. The release must prevent imported or locally entered content from becoming executable HTML, cache only complete AI readings, enforce request limits atomically, and let users activate an offline update without closing every tab.

## Scope

This change covers four existing surfaces:

1. HTML rendering of annotations and imported history.
2. Completion handling for streamed AI readings.
3. Cloudflare Worker rate limiting.
4. Service Worker update activation.

The manually curated 64-hexagram and 384-line modern interpretation library remains a separate content project. This hardening work must not generate placeholder material for that library.

## HTML Safety

Create a small browser-safe escaping module with separate functions for text rendered inside HTML and values rendered inside attributes. Both functions coerce input to a string and escape `&`, `<`, `>`, double quotes, and single quotes. Text rendering may additionally convert newlines to `<br>` where the existing presentation requires it; attribute rendering must not introduce markup.

All annotation fields that can originate from user input or local storage must be escaped before insertion into `innerHTML`, including tags, record IDs, review state, source type, and source ID. History IDs imported from JSON must be escaped as attribute values. Validation must also bound history IDs and restrict annotation review state to the three supported values.

Tests must prove that payloads such as `<svg/onload=...>` remain text, do not create SVG or scriptable event attributes, and remain usable for deletion or selection after rendering.

## AI Reading Completion

Streaming remains plain text and continues to render each arriving chunk immediately. A reading is complete only when all five required headings appear once in the required order and each section contains non-whitespace content:

1. `核心判断`
2. `当前处境`
3. `关键变化`
4. `后续趋势`
5. `行动建议`

The action section must contain at least three non-empty action lines after removing common list markers. A cleanly closed stream that fails this validation raises `INCOMPLETE_RESPONSE`, retains the partial text on screen, shows a specific retry message, and does not update history. Network interruption and user cancellation retain their existing behavior.

The Worker prompt remains responsible for requesting the format; the browser is the final authority for cache eligibility. This avoids coupling the visible stream to provider-specific completion metadata.

## Atomic Rate Limiting

Replace KV counter enforcement with a single SQLite-backed Durable Object named `ReadingRateLimiter`. Every public AI request resolves the stable object ID `global`, so per-IP and global counters are serialized through one object. This is appropriate for the intentionally small default allowance of five requests per IP per hour and fifty requests per UTC day.

The Worker hashes the client IP before sending it to the Durable Object. The object receives only the hourly hash, UTC hour bucket, UTC day bucket, and configured limits. It stores counters by bucket and updates both counters in one storage transaction. A rejected request must not increment either counter.

The object returns one of `ok`, `RATE_LIMITED`, or `DAILY_LIMIT_REACHED`. The outer Worker preserves the existing public error response format. If the Durable Object binding is absent or fails, the request fails closed with `SERVICE_ERROR`; it must not call the AI model without cost protection.

Wrangler configuration adds the Durable Object binding and a SQLite class migration. KV is removed from the required deployment path and documentation. The documentation continues to recommend Cloudflare account budget alerts because application limits do not replace provider-side controls.

## Offline Update Activation

Extend the existing application notice so it can optionally render one explicit action. When a new Service Worker is waiting, show `观象已有更新` with an `立即更新` button. Clicking it sends `SKIP_WAITING` to the waiting worker and disables the button.

Register a one-shot `controllerchange` listener before sending the message. Reload once after the new worker takes control. Guard the reload with an in-memory flag so repeated events cannot create a loop. Do not activate updates automatically while a user may be in the middle of a reading.

## Error Handling

- Unsafe stored fields render as inert text rather than being discarded when they meet length limits.
- Invalid or oversized records remain rejected by the existing normalization path.
- Incomplete AI output remains visible and is never labeled or stored as complete.
- Limiter binding or storage failures return the existing generic service error without exposing infrastructure details.
- A failed Service Worker activation leaves the current application usable and allows a later browser update check to retry.

## Testing

Unit tests cover escaping, annotation validation, five-section AI completion, missing or empty sections, and fewer than three actions. Worker tests use a fake Durable Object namespace and storage implementation to verify exact limits, UTC bucket rollover, rejection without counter mutation, missing bindings, and concurrent requests.

The browser smoke test enters an HTML-like annotation tag and imports a history record with quote-bearing ID content, then asserts that no executable element or event-handler attribute appears. It also exercises the update action with a stub waiting worker and verifies one `SKIP_WAITING` message and one reload request through a testable update helper.

The final gate is `npm run validate`, followed by the browser smoke test and `git diff --check`.

## Deployment Compatibility

The static site remains compatible with GitHub Pages and custom domains. The AI endpoint remains a Cloudflare Worker using Workers AI. Existing local history records continue to load, and successful cached AI readings retain their current storage shape.
