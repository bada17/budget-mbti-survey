export default function Home() {
  return (
    <main className="survey-preview">
      <section className="validation-heading">
        <div>
          <h1>
            질문을 천천히 읽고
            <br />
            한 번에 답해주세요.
          </h1>
        </div>
        <div className="validation-explainer">
          <b>1부터 6까지, 더 가까운 쪽을 골라주세요.</b>
          <p>
            가운데 선택지가 없는 6점 척도입니다. 앞에서 만든 예산 편성표는
            유형 점수에 넣지 않고, 아래 설문 응답만으로 유형을 정합니다.
          </p>
        </div>
      </section>
    </main>
  );
}
