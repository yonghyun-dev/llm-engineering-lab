from fastapi import APIRouter
from openai import OpenAI
from app.chat.schema import ChatRequest, ChatResponse

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from config import get_settings

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("")
def chat(request: ChatRequest) -> ChatResponse:
    settings = get_settings()

    prompt = ChatPromptTemplate.from_messages([
        ("system",
         "너는 여행자 보험 관련 어시턴트이다. 사용자의 질문에 정확한 답변을 내놓아라"
        ),
        ("user", "{message}")
    ])

    llm = ChatOpenAI(
        model=settings.model_name,
        api_key=settings.openai_api_key,
        temperature=0.2,
        max_completion_tokens=300,
    )

    structured_llm = llm.with_structured_output(ChatResponse)

    chain = prompt | structured_llm

    response = chain.invoke({
        "message": request.message,
    })


    

    return ChatResponse(answer=response.answer)

