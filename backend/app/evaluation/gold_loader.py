import json
from pathlib import Path

from app.evaluation.schema import GoldenQA

GOLD_QA_PATH = Path(__file__).resolve().parents[3]/"data"/"QA data set"/"gold-qa.jsonl"

def load_gold_qa() -> list[GoldenQA]:
    items: list[GoldenQA] = []

    with GOLD_QA_PATH.open("r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            if not line.strip(): # 빈 줄이면 넘어감
                continue
            try:
                payload = json.loads(line)
                items.append(GoldenQA.model_validate(payload))
            except Exception as exc:
                raise ValueError(f"Invalid gold QA at line {line_no}: {exc}") from exc

    return items