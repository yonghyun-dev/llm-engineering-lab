import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from config import get_settings

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.evaluation.gold_loader import load_gold_qa
from app.evaluation.schema import ChatResponse, LLMJudgeResult
from app.evaluation.prompt import system_prompt, user_prompt

router = APIRouter(prefix="/eval", tags=["eval"])
BASELINE_EVAL_PATH = Path(__file__).resolve().parents[3] / "data" / "base_line_eval.json"

# gold_qa 데이터 가져오기
gold_qa_items = load_gold_qa()
settings = get_settings()

async def run_one(chain, item, semaphore):
    async with semaphore:
        response = await chain.ainvoke({
            "question": item.question
        })
        actual = response.answer

        if not isinstance(actual, str):
            actual = str(actual)

        return {
            "qa_id": item.qa_id,
            "question": item.question,
            "expected": item.answer,
            "actual": actual,
            "answer_mode": item.answer_mode,
        }
    
async def run_one2(chain, item, semaphore):
    async with semaphore:
        return await chain.ainvoke(item)
    
@router.get("/goldQAList")
def gold_QA_list():
    return gold_qa_items

@router.post("/baseline")
async def baseline_eval():
    if not BASELINE_EVAL_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="저장된 baseline 평가 결과 파일이 없습니다.",
        )

    try:
        results = json.loads(BASELINE_EVAL_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=500,
            detail="저장된 baseline 평가 결과 JSON을 읽지 못했습니다.",
        ) from exc
    
    # Gold QA 데이터와 Baseline LLM Answer 통합
    li = []

    gold_by_id = {item.qa_id: item for item in gold_qa_items}

    for result in results.get("items"):
        qa_id = result["qa_id"]
        gold_qa_item = gold_by_id.get(qa_id)
        
        li.append({
            "qa_id": qa_id,
            "question": gold_qa_item.question,
            "expected_answer": gold_qa_item.answer,
            "actual_answer": result["actual"],
            "answer_mode": gold_qa_item.answer_mode,
            "question_type": gold_qa_item.question_type,
            "scoring_notes": gold_qa_item.scoring_notes,
            "clarification_prompt": gold_qa_item.clarification_prompt,
        })
    
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            system_prompt
        ),
        (
            "user",
            user_prompt
        )
    ])

    structured_llm = ChatOpenAI(
        model=settings.model_name,
        api_key=settings.openai_api_key,
        temperature=0.2,
        max_completion_tokens=500,
    ).with_structured_output(LLMJudgeResult)

    chain = prompt | structured_llm

    semaphore = asyncio.Semaphore(8)

    results = await asyncio.gather(
        *(run_one2(chain, item, semaphore) for item in li)
    )

    judge_items = []

    for source_item, result in zip(li, results):
        judge_result = result.model_dump() if hasattr(result, "model_dump") else result

        judge_items.append({
            **source_item,
            **judge_result,
        })

    payload = {
        "target": "baseline_judge",
        "total": len(judge_items),
        "items": judge_items,
    }

    JUDGE_EVAL_PATH = Path(__file__).resolve().parents[3] / "data" / "baseline_judge_eval.json"

    JUDGE_EVAL_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return payload
    # # Chat Template
    # prompt = ChatPromptTemplate.from_messages([
    #     (
    #         "system",
    #         "너는 여행자 보험 관련 어시턴트이다. 사용자의 질문에 정확한 답변을 내놓아라"
    #     ),
    #     ("user", "{question}")
    # ])

    # # 
    # structured_llm = ChatOpenAI(
    #     model=settings.model_name,
    #     api_key=settings.openai_api_key,
    #     temperature=0.2,
    #     max_completion_tokens=500,
    # ).with_structured_output(ChatResponse)

    # # chain 생성
    # chain = prompt | structured_llm

    # # 최대 8개까지만 response를 보낼 수 있도록 semaphore 설정
    # semaphore = asyncio.Semaphore(8)

    # # 100개의 요청 생성. *는 unpacking 문법
    # results = await asyncio.gather(
    #     *(run_one(chain, item, semaphore) for item in gold_qa_items)
    # )

    # payload = {
    #     "target": "baseline",
    #     "total": len(results),
    #     "items": results,
    # }
