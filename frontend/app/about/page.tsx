import Link from "next/link";

export const metadata = { title: "맑음의 원칙" };

/** P6(회의론자)가 이 페이지만 읽고 반박할 수 있어야 한다. 과장 없이, 아는 것과 모르는 것을 구분해서. */
export default function AboutPage() {
  return (
    <div className="space-y-8">
      <header className="pt-4">
        <Link href="/" className="text-sm text-ink-soft">
          ← 피드
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">맑음의 원칙</h1>
        <p className="mt-1 text-sm text-ink-soft">
          믿어달라는 말 대신, 확인할 수 있는 구조로 답할게요.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="font-semibold">"결국 업체 돈 받고 크는 거 아니야?"</h2>
        <p className="text-sm leading-relaxed">
          아니요, 구조적으로 못 받게 만들었어요. 맑음은 <b>업체 광고·중개·리드 판매를 하지
          않습니다.</b> 업체에게 돈을 받는 순간 "소비자 편"이라는 말과 수익이 충돌하고, 우리가
          대체하려는 것과 똑같아지기 때문이에요. 수익을 만들게 된다면 소비자 쪽
          부가가치(프리미엄 도구, 견적 분석 같은)에서만 만듭니다. 이 원칙이 깨진 걸 발견하면
          그게 맑음을 떠날 이유예요.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">지출 카드에는 무엇이 담기나요</h2>
        <p className="text-sm leading-relaxed">
          카드를 붙일 때 보이는 미리보기가 공개되는 것의 전부예요: 카테고리, 금액, 포함
          범위(scope), 업체명, 지역, 시기. <b>지역은 광역 단위, 시기는 월 단위까지만</b> 담겨요
          — 조합해도 개인이 특정되지 않게 하기 위해서요. 실명·연락처는 가입할 때도 받지
          않습니다.
        </p>
        <p className="text-sm leading-relaxed">
          트래커(예산·체크리스트)는 기본 비공개이고, 공유는 <b>그 시점의 스냅샷 복사</b>예요.
          트래커에서 나중에 고쳐도 이미 공유한 카드는 바뀌지 않고, 그 반대도 마찬가지예요.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">지우면 진짜 지워지나요</h2>
        <p className="text-sm leading-relaxed">
          네. 글을 지우면 붙어 있던 카드도 함께 지워지고, 이후의 어떤 집계에도 들어가지 않아요.
          내 준비 탭의 "계정과 모든 데이터 삭제"는 글·카드·댓글·트래커·체크리스트·프로필을
          전부 지웁니다. 철회가 기여보다 어려우면 안 된다고 생각해요.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">가격 통계는 왜 아직 없나요</h2>
        <p className="text-sm leading-relaxed">
          표본이 부족하기 때문이에요. 카테고리×지역 단위로 공유 카드가 <b>10건을 넘기 전에는
          분포를 보여주지 않습니다.</b> 얇은 표본을 그럴듯한 그래프로 포장하는 건 거짓말이라서요.
          통계를 열게 되면 항상 표본 수·기간·출처 구성을 함께 표기하고, 산출 방법을 공개할
          거예요.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">조작은 어떻게 막나요</h2>
        <p className="text-sm leading-relaxed">
          업체가 자기 가격은 싸 보이게, 경쟁사는 비싸 보이게 만들 동기가 있다는 걸 전제로
          설계해요. 지금 있는 것: 계정당 게시 빈도 제한. 통계를 열기 전에 갖출 것: 이상치 자동
          플래그와 검토, 증빙 있는 데이터를 앵커로 한 교차 검증. 완벽하다고 말하지 않을게요 —
          방어는 계속 쌓아야 하는 것이고, 진행 상황은 여기에 업데이트합니다.
        </p>
      </section>

      <p className="border-t border-blush pt-4 text-xs text-ink-soft">
        이 페이지는 서비스와 같은 저장소에서 버전 관리돼요. 원칙이 바뀌면 기록이 남습니다.
      </p>
    </div>
  );
}
