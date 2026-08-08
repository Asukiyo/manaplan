"use client";

type SaveSummary = {
  grade: number | null;
  term: string;
  updatedAt?: string;
};

type Props = {
  loaded: boolean;
  save: SaveSummary | null;
  onContinue: () => void;
  onStart: () => void;
};

export function TitleScreen({ loaded, save, onContinue, onStart }: Props) {
  const updatedAt = save?.updatedAt
    ? new Date(save.updatedAt).toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" })
    : null;

  return (
    <main className="title-screen">
      <div className="title-background" role="img" aria-label="夜の魔法大学を望む Campus Quest のタイトル画面" />
      <section className="title-menu" aria-label="タイトルメニュー">
        <button
          className="title-action title-continue"
          type="button"
          onClick={onContinue}
          disabled={!loaded || !save}
          aria-label={save ? "つづきから" : "つづきから（セーブデータなし）"}
        >
          <span className="title-ornament" aria-hidden="true">✦</span>
          <strong>つづきから</strong>
          <span className="title-ornament" aria-hidden="true">✦</span>
        </button>
        <button
          className="title-action title-start"
          type="button"
          onClick={onStart}
          disabled={!loaded}
          aria-label="はじめから"
        >
          <span className="title-ornament" aria-hidden="true">✦</span>
          <strong>はじめから</strong>
          <span className="title-ornament" aria-hidden="true">✦</span>
        </button>
      </section>
      <div className={`title-save-status ${save ? "has-save" : "no-save"}`} aria-live="polite">
        {!loaded
          ? "セーブデータを確認中…"
          : save
            ? `${save.grade ?? "-"}年生・${save.term}${updatedAt ? `　最終保存 ${updatedAt}` : ""}`
            : "セーブデータはありません"}
      </div>
    </main>
  );
}
