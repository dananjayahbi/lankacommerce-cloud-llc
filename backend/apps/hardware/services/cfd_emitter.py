"""
In-memory pub/sub emitter for the Customer Facing Display (CFD).

This module uses an in-memory subscriber dictionary. In a multi-process
Gunicorn deployment (e.g., multiple uWSGI workers), each worker has its
own subscriber registry, so SSE clients connected to one worker will NOT
receive broadcasts from another worker. For production multi-replica
deployments, replace this module with Django Channels and a Redis channel
layer. The public API (subscribe/unsubscribe/broadcast) remains
identical — only the internal implementation changes.
"""
from __future__ import annotations

import queue

_subscribers: dict[str, list[queue.Queue]] = {}


def subscribe(tenant_id: str) -> queue.Queue:
    """Register a new SSE subscriber for *tenant_id* and return its queue."""
    q: queue.Queue = queue.Queue()
    _subscribers.setdefault(tenant_id, []).append(q)
    return q


def unsubscribe(tenant_id: str, q: queue.Queue) -> None:
    """Remove *q* from the subscriber list for *tenant_id*."""
    try:
        _subscribers[tenant_id].remove(q)
    except (ValueError, KeyError):
        pass
    if not _subscribers.get(tenant_id):
        _subscribers.pop(tenant_id, None)


def broadcast(tenant_id: str, payload: dict) -> None:
    """Send *payload* to all SSE subscribers for *tenant_id*."""
    subscribers = _subscribers.get(tenant_id)
    if not subscribers:
        return
    for q in list(subscribers):
        try:
            q.put_nowait(payload)
        except queue.Full:
            pass
