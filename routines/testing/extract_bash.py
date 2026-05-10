"""Extract all ```bash code blocks from each Bamboo routine .md file into runnable .sh files."""
import re
from pathlib import Path

ROUTINES_DIR = Path(r"C:/Users/Lenovo/Desktop/187N/RUtenes/dev-workspace/clients/bamboo/routines")
SCRIPTS_DIR = ROUTINES_DIR / "testing" / "scripts"
SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)

BASH_BLOCK_PATTERN = re.compile(r"```bash\n(.*?)```", re.DOTALL)

EXCLUDE = {"bm-routine-logger", "bm-routine-registry", "_template-routine"}

routines = sorted([f for f in ROUTINES_DIR.glob("bm-*.md") if f.stem not in EXCLUDE])

for routine_path in routines:
    name = routine_path.stem
    content = routine_path.read_text(encoding="utf-8")
    blocks = BASH_BLOCK_PATTERN.findall(content)

    if not blocks:
        print(f"[SKIP] {name}: no bash blocks")
        continue

    script_lines = [
        "#!/usr/bin/env bash",
        f"# Auto-extracted from: {routine_path.name}",
        f"# {len(blocks)} bash block(s)",
        "set +e",
        "",
    ]

    for i, block in enumerate(blocks, 1):
        script_lines.append(f"# ==== Block {i}/{len(blocks)} ====")
        # Comment out slash-command examples (docs, not code)
        safe_block_lines = []
        for line in block.rstrip().split("\n"):
            stripped = line.lstrip()
            if stripped.startswith("/bm-") or stripped.startswith("/bamboo-"):
                safe_block_lines.append(f"# [SKIPPED slash-command] {line}")
            else:
                safe_block_lines.append(line)
        script_lines.append("\n".join(safe_block_lines))
        script_lines.append("")

    script_path = SCRIPTS_DIR / f"{name}.sh"
    script_path.write_text("\n".join(script_lines), encoding="utf-8")
    print(f"[OK] {name}: {len(blocks)} blocks -> {script_path.name}")

print(f"\nDone. {len(routines)} scripts in {SCRIPTS_DIR}")
