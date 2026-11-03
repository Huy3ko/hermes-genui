# Security policy

Hermes GenUI draws model-written data inside Hermes Desktop and fetches photos and prices from the web, so security
reports matter to us.

## Reporting a vulnerability

Please **don't open a public issue**. Report it privately instead:

- on GitHub: **Security → Report a vulnerability** on this repository (private vulnerability reporting).

Include what you found, how to reproduce it, and what an attacker could do with it. You'll get an answer within a
week, and a fix or a plan within 30 days for anything confirmed. We'll credit you in the release notes unless you'd
rather not be named.

## What's in scope

- **Model or web content running code in Desktop.** Any way a block, a board or a fetched page gets HTML, script or
  markup past the plugin's components.
- **Reaching private networks or local files.** Any way the photo or page fetcher reaches a private address, follows a
  redirect it shouldn't, or reads files.
- **Hidden actions from buttons, forms or tiles.** A button, form or tile sending something the user didn't see, such
  as a slash command, a shell line or an `@file` reference.
- **Formulas.** Calculator or simulation formulas evaluating anything but arithmetic, or running without limits.
- **Keys.** Keys read from anywhere but Hermes's own secret store, or written into a board or log.

## Supported versions

Only the latest release gets fixes. Update with `hermes plugins update hermes-genui`.
