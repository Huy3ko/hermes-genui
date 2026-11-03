"""The small timed memory find_photos keeps: which sources are resting and the searches it answered recently. The
clock is swapped for a counter, so nothing here waits."""

import importlib
import threading

from conftest import load_plugin_package

load_plugin_package()
memory = importlib.import_module("hermes_genui.tools.photos.memory")


class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def test_a_value_is_kept_until_its_time_is_up():
    clock = Clock()
    kept = memory.Memory(ttl=60, size=4, clock=clock)
    kept.put("lisbon", [1, 2])
    clock.now += 59
    assert kept.get("lisbon") == [1, 2]
    clock.now += 1
    assert kept.get("lisbon") is None


def test_a_missing_key_is_none():
    assert memory.Memory(ttl=60, size=4).get("nothing") is None


def test_at_most_size_values_are_kept_the_oldest_dropped_first():
    clock = Clock()
    kept = memory.Memory(ttl=60, size=2, clock=clock)
    for key in ("a", "b", "c"):
        kept.put(key, key.upper())
        clock.now += 1
    assert (kept.get("a"), kept.get("b"), kept.get("c")) == (None, "B", "C")


def test_putting_a_key_again_starts_its_time_again_and_makes_it_newest():
    clock = Clock()
    kept = memory.Memory(ttl=60, size=2, clock=clock)
    kept.put("a", 1)
    kept.put("b", 2)
    clock.now += 50
    kept.put("a", 3)  # a is now the newest, so c pushes out b
    kept.put("c", 4)
    clock.now += 20
    assert (kept.get("a"), kept.get("b"), kept.get("c")) == (3, None, 4)


def test_clear_forgets_everything():
    kept = memory.Memory(ttl=60, size=4)
    kept.put("a", 1)
    kept.clear()
    assert kept.get("a") is None


def test_many_threads_at_once_never_overfill_it():
    kept = memory.Memory(ttl=60, size=8)

    def fill(start: int) -> None:
        for i in range(start, start + 200):
            kept.put(i, i)
            kept.get(i - 3)
    threads = [threading.Thread(target=fill, args=(n * 1000,)) for n in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert sum(kept.get(i) is not None for n in range(8) for i in range(n * 1000, n * 1000 + 200)) <= 8
