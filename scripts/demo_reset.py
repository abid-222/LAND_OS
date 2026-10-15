#!/usr/bin/env python3
"""
Bangladesh LandOS — Demo State Reset Script.
Restores the database, knowledge base, and mock storage to the baseline synthetic seed state.
Usage: make demo-reset
"""

import asyncio
import os
import sys

# Ensure repository and backend paths are importable
current_dir = os.path.dirname(os.path.abspath(__file__))
repo_root = os.path.abspath(os.path.join(current_dir, ".."))
backend_dir = os.path.join(repo_root, "backend")

for p in [repo_root, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)


async def main():
    print("=" * 65)
    print("       BANGLADESH LANDOS — DEMO STATE RESET INITIATED")
    print("=" * 65)

    from app.modules.documents.seed import run_seed

    try:
        await run_seed()
        print("[SUCCESS] Demo database and mock storage reset to baseline seed state.")
        return 0
    except Exception as e:
        print(f"[ERROR] Demo reset encountered an exception: {e}")
        return 1


if __name__ == "__main__":
    code = asyncio.run(main())
    sys.exit(code)
