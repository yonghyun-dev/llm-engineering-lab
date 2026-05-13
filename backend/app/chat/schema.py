from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    message: str = Field(min_length=1)


class ChatResponse(BaseModel):
    answer: str = Field(description="사용자 질문에 대한 한국어 답변")
