# 맑음 (Malgeum)

셀프 웨딩 준비 커뮤니티. 철학과 원칙은 [CLAUDE.md](CLAUDE.md), 디자인은 [DESIGN.md](DESIGN.md), 검증 페르소나는 [PERSONAS.md](PERSONAS.md).

현재 상태: **Phase A 커뮤니티 코어** — 준비 기록 피드 + 지출 카드(스냅샷 공유) + 댓글, 개인 도구(예산 트래커·체크리스트·숨은비용 사전)는 기록의 재료.

## 실행

```bash
# 1. DB (PostgreSQL, 호스트 5433 포트)
docker compose up -d

# 2. 백엔드 (http://localhost:8000, 첫 실행 시 스키마 생성 + 시드)
cd backend
uv venv .venv && VIRTUAL_ENV=.venv uv pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000

# 3. 프런트엔드 (http://localhost:3000, /api는 백엔드로 프록시됨)
cd frontend
npm install
npm run dev
```

## 배포 (프로덕션 스택)

프런트(:3000)만 외부에 노출되고 `/api`는 내부 백엔드로 프록시된다. CORS 설정이 필요 없다.

```bash
POSTGRES_PASSWORD='강한-비밀번호' docker compose -f docker-compose.prod.yml up -d --build
```

VPS 한 대에 이 컴포즈를 올리고 리버스 프록시(Caddy/nginx)로 TLS만 붙이면 초대 기반 운영이 가능하다.
관리형(Vercel + 별도 백엔드/DB 호스트)으로 가려면 프런트 빌드 시 `BACKEND_URL`을 해당 백엔드 주소로 지정.

## 구조

```
backend/app/
  models.py     user, post, post_card(공유 스냅샷), comment
                + taxonomy, expense(비공개 트래커), vendor, fee_glossary, checklist, profile
  seed.py       카테고리 트리 · 숨은비용 사전 16항목 · 체크리스트 템플릿
  routers/      auth(닉네임 계정·비밀번호 변경·계정 전체 삭제),
                posts(피드·카드·댓글·rate limit), expenses(+vendor-suggest),
                checklist, profile, glossary, taxonomy
  tests/        페르소나 불변식 26개 (pytest, CI에서 실행)
frontend/app/
  page.tsx      피드 — 포스트 + 지출 카드, 커서 페이지네이션
  components/   Composer(카드 첨부·공개 미리보기), ShareCard
  post/[id]/    글 상세 + 댓글
  me/           D-day 대시보드 · 내가 올린 기록 · 비밀번호 변경 · 계정 삭제
  budget/       예산 트래커 + 스코프 체크(포함 ✓/불포함 ✗/미확인 ?)
  checklist/    예식일 역산 체크리스트
  glossary/     숨은비용 사전 (SSR, sitemap 포함 — SEO 유입구)
  about/        맑음의 원칙 (수익모델·데이터·삭제 시맨틱 공개)
```

Phase B(견적 디코더 등)·Phase C(분포 공개) 코드는 승격 규칙에 따라 아직 없다.

## 테스트

```bash
cd backend && .venv/bin/python -m pytest tests -q   # 테스트 DB: malgeum_test (자동 생성 필요)
```
