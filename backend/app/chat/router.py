from fastapi import APIRouter
from openai import OpenAI
from pydantic import BaseModel, Field

from config import get_settings

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)


class ChatResponse(BaseModel):
    answer: str


@router.post("")
def chat(request: ChatRequest) -> ChatResponse:
    settings = get_settings()
    client = OpenAI(api_key=settings.openai_api_key)

    response = client.responses.create(
        model=settings.model_name,
        input=[
            {
                "role": "system",
                "content": "You are a helpful Korean assistant for travel insurance QA.",
            },
            {
                "role": "user",
                "content": request.message,
            },
        ],
    )

    return ChatResponse(answer=response.output_text)
