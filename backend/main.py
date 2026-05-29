from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.chat.router import router as chat_router
from app.rag.router import router as rag_router
from app.evaluation.router import router as evaluation_router
from config import get_settings

settings = get_settings()

app = FastAPI(title=settings.app_name)

# 브라우저에게 이 조건의 cross-origin 요청을 허용해도 된다고 알려주는 응답 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # 허용하는 주소
    allow_credentials=True, # 쿠키, Authorization 헤더 같은 인증 정보 포함 가능
    allow_methods=["*"], # 모든 http 메서드 허용
    allow_headers=["*"], # 모든 요청 헤더 허용
)


@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(chat_router)
app.include_router(evaluation_router)
app.include_router(rag_router)