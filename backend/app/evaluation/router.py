import asyncio
from fastapi import APIRouter
from config import get_settings

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.evaluation.gold_loader import load_gold_qa

router = APIRouter(prefix="/eval", tags=["eval"])

gold_qa_items = load_gold_qa()
settings = get_settings()

async def run_one(chain, item, semaphore):
    async with semaphore:
        response = await chain.ainvoke({
            "question": item.question
        })
        actual = response.content

        if not isinstance(actual, str):
            actual = str(actual)

        return {
            "qa_id": item.qa_id,
            "question": item.question,
            "expected": item.answer,
            "actual": actual,
            "answer_mode": item.answer_mode,
        }

@router.get("/goldQAList")
def gold_QA_list():
    return gold_qa_items

@router.post("/baseline")
async def baseline_eval():

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "너는 여행자 보험 관련 어시턴트이다. 사용자의 질문에 정확한 답변을 내놓아라"
        ),
        ("user", "{question}")
    ])

    llm = ChatOpenAI(
        model=settings.model_name,
        api_key=settings.openai_api_key,
        temperature=0.2,
        max_completion_tokens=500,
    )

    chain = prompt | llm

    semaphore = asyncio.Semaphore(8)

    results = await asyncio.gather(
        *(run_one(chain, item, semaphore) for item in gold_qa_items)
    )

    return {
        "target": "baseline",
        "total": len(results),
        "items": results,
    }
