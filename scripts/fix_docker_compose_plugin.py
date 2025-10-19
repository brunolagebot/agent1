#!/usr/bin/env python3
import json
import os
from pathlib import Path


def main() -> None:
    home = Path.home()
    docker_dir = home / ".docker"
    docker_dir.mkdir(parents=True, exist_ok=True)
    cfg_path = docker_dir / "config.json"

    config = {}
    if cfg_path.exists():
        try:
            config = json.loads(cfg_path.read_text() or "{}")
        except Exception:
            # fallback para não quebrar caso exista JSON inválido
            config = {}

    plugin_dirs = config.get("cliPluginsExtraDirs", [])
    if not isinstance(plugin_dirs, list):
        plugin_dirs = []

    brew_plugin_dir = "/opt/homebrew/lib/docker/cli-plugins"
    if brew_plugin_dir not in plugin_dirs:
        plugin_dirs.append(brew_plugin_dir)

    config["cliPluginsExtraDirs"] = plugin_dirs
    cfg_path.write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()


