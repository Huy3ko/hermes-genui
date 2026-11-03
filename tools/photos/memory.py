"""A small timed memory, safe to share between threads: find_photos keeps which sources are resting in one and the
searches it answered recently in another. Nothing is written to disk."""

import threading
import time
from collections import OrderedDict
from collections.abc import Callable, Hashable


class Memory:
    """Values kept for `ttl` seconds each, at most `size` of them; when full, the oldest put is dropped first.
    `clock` tells the time in seconds (tests pass their own).

    m = Memory(ttl=600, size=16);  m.put("openverse", True);  m.get("openverse") → True
    eleven minutes later: m.get("openverse") → None
    """

    def __init__(self, ttl: float, size: int, clock: Callable[[], float] = time.monotonic):
        self.ttl = ttl
        self.size = size
        self.clock = clock
        self._kept: OrderedDict[Hashable, tuple[float, object]] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: Hashable) -> object | None:
        """The value put under key, or None when there is none or its time is up."""
        with self._lock:
            kept = self._kept.get(key)
            if kept is None:
                return None
            if self.clock() >= kept[0]:
                del self._kept[key]
                return None
            return kept[1]

    def put(self, key: Hashable, value: object) -> None:
        """Keep a value for ttl seconds from now (putting a key again starts its time again)."""
        with self._lock:
            self._kept.pop(key, None)
            self._kept[key] = (self.clock() + self.ttl, value)
            while len(self._kept) > self.size:
                self._kept.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._kept.clear()
