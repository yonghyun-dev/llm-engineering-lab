from pydantic import BaseModel, Field

class GoldenQA(BaseModel):
    qa_id: str
    answer: str | None = None
    answer_mode : str
    dataset: str
    dataset_version: str
    difficulty: str | None = None
    question_type: str | None = None
    evidence_span_ids: list[str] = Field(default_factory=list)
    source_ids: list[str] = Field(default_factory=list)
    scoring_notes: str | None = None
    authority_requirement: str | None = None
    clarification_prompt: str | None = None

class GoldenUploadResponse(BaseModel):
    count: int
    dataset: str | None = None
    dataset_version: str | None = None