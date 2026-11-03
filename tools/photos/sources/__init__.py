"""The photo sources find_photos asks. Each module has a URL, `parse_<source>(data)` that turns the provider's answer
into candidates {url, caption?, source, licence?} (https only; captions and credits as one plain line), and
`ask(client, query, ...)` that fetches and parses. Helpers they share are in common.py."""
