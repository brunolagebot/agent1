#!/usr/bin/env python3
import json
from pathlib import Path


def main() -> None:
    cfg_path = Path.home() / ".docker" / "config.json"
    if not cfg_path.exists():
        return

    try:
        data = json.loads(cfg_path.read_text() or "{}")
    except Exception:
        return

    changed = False

    # Remover credStore e helpers que apontam para "desktop"
    if isinstance(data.get("credsStore"), str):
        if data["credsStore"].lower() == "desktop":
            del data["credsStore"]
            changed = True

    cred_helpers = data.get("credHelpers")
    if isinstance(cred_helpers, dict):
        keys_to_remove = []
        for k, v in cred_helpers.items():
            if isinstance(v, str) and v.lower() == "desktop":
                keys_to_remove.append(k)
        for k in keys_to_remove:
            del cred_helpers[k]
            changed = True
        if not cred_helpers:
            del data["credHelpers"]
            changed = True

    if changed:
        cfg_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()


