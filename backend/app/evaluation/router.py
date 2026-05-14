from fastapi import APIRouter
from app.evaluation.gold_loader import load_gold_qa

router = APIRouter(prefix="/eval", tags=["eval"])

gold_qa_items = load_gold_qa()

@router.get("/goldQAList")
def gold_QA_list():
    for data in gold_qa_items:
        print(data)