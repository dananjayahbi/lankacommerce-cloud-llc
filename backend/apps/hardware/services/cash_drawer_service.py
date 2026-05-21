"""
Cash drawer service.

The ``kick_cash_drawer`` function is fire-and-forget: it logs and swallows
all exceptions so that sale/return transactions are never blocked by a
hardware failure.

``test_drawer`` is used by the settings UI to verify connectivity; it lets
exceptions propagate so the caller can surface them to the operator.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def kick_cash_drawer(printer_config: dict) -> None:
    """
    Send a cash-drawer-kick ESC/POS command.  Never raises.
    """
    try:
        from apps.hardware.services.printer_service import get_printer

        printer = get_printer(printer_config)
        try:
            printer.cashdraw(2)
        finally:
            printer.close()
    except Exception as exc:
        logger.warning("[CashDrawer] Failed to kick drawer: %s", exc, exc_info=True)


def test_drawer(printer_config: dict) -> None:
    """
    Send a cash-drawer-kick and let exceptions propagate to the caller.
    """
    from apps.hardware.services.printer_service import get_printer

    printer = get_printer(printer_config)
    try:
        printer.cashdraw(2)
    finally:
        printer.close()
