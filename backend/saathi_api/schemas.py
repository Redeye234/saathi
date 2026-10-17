from datetime import date
from typing import Annotated
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


ShortText = Annotated[str, StringConstraints(max_length=500)]
LinkId = Annotated[str, StringConstraints(max_length=80)]


class Entry(StrictModel):
    id: str = Field(max_length=500)
    date: date
    kind: Literal["income", "expense"]
    amount: float = Field(ge=0, le=10_000_000)
    note: str = Field(max_length=300)


class Draft(StrictModel):
    id: str = Field(max_length=500)
    title: str = Field(max_length=500)
    text: str = Field(max_length=20_000)
    status: Literal["Draft", "Sent", "Resolved"]
    date: date


class SavedCase(StrictModel):
    id: str = Field(max_length=500)
    date: date
    language: str = Field(max_length=500)
    status: Literal["Draft", "Sent", "Resolved"]
    checkedEvidence: list[str] = Field(max_length=20)
    followUp: date | Literal[""]
    title: str = Field(max_length=100)
    hindi: str = Field(max_length=6000)
    english: str = Field(max_length=6000)
    local: str = Field(max_length=6000)
    evidence: list[str] = Field(max_length=8)
    nextSteps: list[str] = Field(max_length=8)
    uncertainties: list[str] = Field(max_length=8)
    officialLinks: list[LinkId] = Field(max_length=6)


class DailyCheck(StrictModel):
    id: str = Field(max_length=500)
    date: date
    earned: float = Field(ge=0, le=10_000_000)
    expenses: float = Field(ge=0, le=10_000_000)
    fatigue: int = Field(ge=1, le=5)
    safe: bool
    missedPayment: float = Field(ge=0, le=10_000_000)
    note: str = Field(max_length=600)


class Profile(StrictModel):
    name: str = Field(default="", max_length=60)
    role: str = Field(default="Delivery partner", max_length=80)
    state: str = Field(default="", max_length=80)


class WorkspaceData(StrictModel):
    entries: list[Entry] = Field(default_factory=list, max_length=1000)
    drafts: list[Draft] = Field(default_factory=list, max_length=100)
    checks: list[ShortText] = Field(default_factory=list, max_length=20)
    evidenceChecks: list[ShortText] = Field(default_factory=list, max_length=20)
    profile: Profile = Field(default_factory=Profile)
    lang: str = Field(default="en", max_length=12)
    customLang: str = Field(default="", max_length=80)
    cases: list[SavedCase] = Field(default_factory=list, max_length=50)
    dailyChecks: list[DailyCheck] = Field(default_factory=list, max_length=366)
    lowData: bool = False

    @field_validator("entries", "drafts", "cases", "dailyChecks")
    @classmethod
    def no_embedded_media(cls, values):
        for value in values:
            if "data:image/" in str(value).lower() or "data:audio/" in str(value).lower():
                raise ValueError("Uploaded media cannot be saved to the workspace")
        return values


class WorkspaceWrite(StrictModel):
    data: WorkspaceData
    revision: str | None = Field(max_length=40)


class Credentials(StrictModel):
    username: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=8, max_length=200)
    confirmPassword: str | None = Field(default=None, max_length=200)
    displayName: str = Field(default="", max_length=60)


class Turn(StrictModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=12000)


class AssistantRequest(StrictModel):
    mode: Literal["chat", "draft", "document", "translate", "action", "package"]
    message: str = Field(min_length=1, max_length=12000)
    language: str = Field(min_length=1, max_length=80)
    history: list[Turn] = Field(default_factory=list, max_length=10)
    imageData: str = Field(default="", max_length=4_400_000)

    @field_validator("message")
    @classmethod
    def message_has_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Message cannot be blank")
        return value


class ActionPlan(StrictModel):
    title: str = Field(max_length=100)
    summary: str = Field(max_length=1500)
    urgency: Literal["low", "medium", "high"]
    nextQuestion: str = Field(max_length=300)
    nextSteps: list[ShortText] = Field(max_length=8)
    evidence: list[ShortText] = Field(max_length=8)
    uncertainties: list[ShortText] = Field(max_length=8)
    officialLinks: list[LinkId] = Field(max_length=6)


class ComplaintPackage(StrictModel):
    title: str = Field(max_length=100)
    hindi: str = Field(max_length=6000)
    english: str = Field(max_length=6000)
    local: str = Field(max_length=6000)
    evidence: list[ShortText] = Field(max_length=8)
    nextSteps: list[ShortText] = Field(max_length=8)
    uncertainties: list[ShortText] = Field(max_length=8)
    officialLinks: list[LinkId] = Field(max_length=6)
