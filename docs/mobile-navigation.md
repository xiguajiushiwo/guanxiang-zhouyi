# Mobile navigation and product presentation — 2026-10-30

App hashes now open the requested page directly, including after refresh or launching the installed app. The hexagram list has its own `#hexagrams` route, distinct from `#hexagrams/5` and other details. Back/Forward updates the visible view through `popstate`; the corresponding `hashchange` is deduplicated. Explicit list-back controls use the previous list entry when available.

Navigation owns viewport movement. Switching views uses immediate scrolling and remembers the previous route position, so multiple smooth scroll animations cannot compete. Deferred classic-section scrolling checks the active view and navigation revision. Background data rendering no longer moves the viewport. Missing records retain their URL and a visible loading/unavailable state instead of sending the reader back to the list.

Late AI association/review responses may save results to their original record but cannot render over a different selected record. Per-record request status stays with that record. Unchanged details are reused; when a detail needs rebuilding, draft inputs, focus, open disclosures and scroll position are retained. AI failure completion explicitly refreshes its controls so retry remains available.

Unopened classics/hexagram/principle views defer DOM creation. Render signatures prevent repeated work when a navigation or background refresh has not changed its inputs. Cached-page restoration resets the login navigation lock and rechecks account state. Mobile controls use larger touch areas and form inputs use at least 16px text to avoid iOS input auto-zoom.

Validation: `npm run validate`, browser smoke, reading-flow, journal, case-review, landing, and the new `npm run test:navigation`. Navigation regression runs with a 390px mobile viewport and 4× CPU slowdown, and checks 320/390/1366px widths. It covers direct-route reload, list/detail Back/Forward, delayed AI completion after opening another record, rapid tabs, deferred classic rendering, and reentering login after browser Back.

The browser runner uses desktop Edge/Chromium emulation. It does not constitute physical iPhone Safari validation. Final device checks should include Safari swipe-back, software keyboard, background/foreground return, standalone home-screen launch, and the user's actual network.

Presentation additions: common brand mark, favicon and Apple/home-screen icons, Open Graph PNG, three-language cover proposition, editable brand share SVG, and a separate product/brand launch proposal. No marketing posts, emails, or paid campaign were sent.
