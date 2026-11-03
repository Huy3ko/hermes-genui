"""How find_photos reaches the network without being turned against this machine: https only, every address a host
resolves to must be public (checked again at connect time, so DNS rebinding can't slip past), redirects followed by
hand with each hop checked, and a short time budget for everything."""

import ipaddress
import socket
from collections.abc import Callable
from urllib.parse import urljoin, urlsplit

import httpcore
import httpx

from ...core.manifest import USER_AGENT

# How a host name is looked up (tests swap in their own, so no real DNS is asked).
getaddrinfo = socket.getaddrinfo

# Wikimedia refuses (403) a client that doesn't name itself with a contact URL: "hermes-genui/0.2.0 (+https://…)".
HEADERS = {"User-Agent": USER_AGENT}

CHECK_TIMEOUT = 3.0
SOURCE_TIMEOUT = 6.0  # each source's whole budget; a source still busy after it is left out

MAX_REDIRECTS = 3
REDIRECTS = (301, 302, 303, 307, 308)
METADATA_IP = ipaddress.ip_address("169.254.169.254")


def is_public_address(ip: str) -> bool:
    """Whether an address is on the public internet: not loopback, private, link-local, multicast, reserved,
    unspecified or shared (carrier NAT), and not the cloud metadata address. An IPv4 address written as IPv6
    (::ffff:a.b.c.d) is judged as the IPv4 one.

    "93.184.216.34" → True;  "10.0.0.5" → False;  "169.254.169.254" → False;  "::ffff:127.0.0.1" → False;
    "fe80::1" → False;  "not an ip" → False
    """
    try:
        addr = ipaddress.ip_address(ip.split("%")[0])
    except ValueError:
        return False
    if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
        addr = addr.ipv4_mapped
    if addr == METADATA_IP:
        return False
    flags = (addr.is_private, addr.is_loopback, addr.is_link_local, addr.is_multicast, addr.is_reserved,
             addr.is_unspecified)
    return addr.is_global and not any(flags)


def _public_addresses(host: str, port: int) -> list[str]:
    """The addresses a host resolves to, or [] when it doesn't resolve or any one of them isn't public.

    ("upload.wikimedia.org", 443) → ["198.35.26.112", ...];  ("intranet.local", 443) → 10.0.0.5 → []
    """
    try:
        infos = getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except (OSError, UnicodeError, ValueError):
        return []
    addresses = list(dict.fromkeys(str(info[4][0]) for info in infos))
    return addresses if addresses and all(is_public_address(a) for a in addresses) else []


def _safe_to_fetch(url: str) -> bool:
    """Whether a URL is https and every address its host resolves to is public (is_public_address). A host that
    doesn't resolve is refused.

    "https://upload.wikimedia.org/a.jpg" → True;  "http://upload.wikimedia.org/a.jpg" → False;
    "https://169.254.169.254/latest" → False;  "https://intranet.local/x.jpg" (resolves to 10.0.0.5) → False
    """
    parts = urlsplit(url)
    if parts.scheme != "https" or not parts.hostname:
        return False
    try:
        port = parts.port or 443
    except ValueError:
        return False
    return bool(_public_addresses(parts.hostname, port))


class PinnedBackend(httpcore.NetworkBackend):
    """Connects only to an address it has just checked, closing the DNS-rebinding gap between _safe_to_fetch and
    the connection: the host is resolved again here, every answer must be public, and the socket is opened to that
    IP. httpcore still sends the host name for Host, SNI and the certificate check, so TLS works as usual.

    connect_tcp("img.example.com", 443) → resolves to 93.184.216.34 → dials 93.184.216.34
    connect_tcp("rebind.example", 443) → now resolves to 10.0.0.5 → ConnectError, nothing dialled
    """

    def __init__(self, inner: httpcore.NetworkBackend | None = None):
        self._inner = inner or httpcore.SyncBackend()

    def connect_tcp(self, host: str, port: int, timeout: float | None = None, local_address: str | None = None,
                    socket_options=None):
        name = host.decode() if isinstance(host, bytes) else host
        addresses = _public_addresses(name.strip("[]"), port)
        if not addresses:
            raise httpcore.ConnectError(f"refused: {name} is not a public address")
        last: Exception | None = None
        for ip in addresses:
            try:
                return self._inner.connect_tcp(ip, port, timeout=timeout, local_address=local_address,
                                               socket_options=socket_options)
            except (httpcore.ConnectError, httpcore.ConnectTimeout) as exc:
                last = exc
        raise last or httpcore.ConnectError(f"could not connect to {name}")

    def connect_unix_socket(self, path: str, timeout: float | None = None, socket_options=None):
        raise httpcore.ConnectError("refused: unix sockets")

    def sleep(self, seconds: float) -> None:
        self._inner.sleep(seconds)


def safe_client() -> httpx.Client:
    """The client find() uses when none is given: its direct connections go through PinnedBackend. If this httpx
    has no connection pool to pin, it stays a plain client: every photo and page is still checked hop by hop
    (_follow, _safe_to_fetch) before it is asked."""
    client = httpx.Client(timeout=SOURCE_TIMEOUT, headers=HEADERS)
    pool = getattr(getattr(client, "_transport", None), "_pool", None)
    if pool is not None and hasattr(pool, "_network_backend"):
        pool._network_backend = PinnedBackend()
    return client


def _follow(url: str, ask: Callable[[str], tuple[int, str, object]]) -> object | None:
    """Asks for a URL, following redirects by hand: at most 3, and every hop (the first too) must pass
    _safe_to_fetch before it is asked. `ask(url)` → (status, location, result); the last hop's result is returned,
    or None when a hop is refused, fails or there are too many.

    "https://img.example/a.jpg" → 200 → its result
    "https://img.example/a.jpg" → 302 to "https://10.0.0.5/x" → None (the second hop is never asked)
    """
    for _ in range(MAX_REDIRECTS + 1):
        if not _safe_to_fetch(url):
            return None
        try:
            status, location, result = ask(url)
        except httpx.HTTPError:
            return None
        if status not in REDIRECTS or not location:
            return result
        url = urljoin(url, location)
    return None


def _answer(client: httpx.Client, url: str) -> httpx.Response:
    """One hop's answer, redirects not followed. Some servers refuse HEAD, so a one-byte GET is the fallback."""
    r = client.head(url, follow_redirects=False, timeout=CHECK_TIMEOUT)
    if r.status_code in (403, 405):
        r = client.get(url, headers={"Range": "bytes=0-0"}, follow_redirects=False, timeout=CHECK_TIMEOUT)
    return r


def _loads(client: httpx.Client, url: str) -> bool:
    """Whether the address answers with an image, every hop checked by _follow, so a photo can't point the check at
    this machine or its network.

    "https://img.example/a.jpg" → 200 image/jpeg → True
    "https://img.example/a.jpg" → 302 to "https://10.0.0.5/x" → False (the second hop is never fetched)
    four redirects in a row → False
    """
    def ask(hop: str) -> tuple[int, str, object]:
        r = _answer(client, hop)
        is_image = r.status_code in (200, 206) and r.headers.get("content-type", "").startswith("image/")
        return r.status_code, r.headers.get("location", ""), is_image

    return _follow(url, ask) is True
