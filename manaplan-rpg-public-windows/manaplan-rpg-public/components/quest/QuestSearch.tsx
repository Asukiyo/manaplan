import type { FormEvent } from "react";
import type { Course } from "@/data/courses";
import type { Filters } from "@/features/course-quest/types";
import { Icon } from "@/components/ui/Icon";

type Props = { draft: Filters; results: Course[]; registered: number[]; onField: (key: keyof Filters, value: string) => void; onSearch: () => void; onClear: () => void; onToggle: (course: Course) => void };
export function QuestSearch({ draft, results, registered, onField, onSearch, onClear, onToggle }: Props) {
  function submit(event: FormEvent) { event.preventDefault(); onSearch(); }
  return <section className="panel quest-search">
    <div className="panel-heading"><h2><Icon>▧</Icon>授業クエストを探す</h2><span className="source-badge">シラバス情報準拠</span></div>
    <form onSubmit={submit}><div className="filter-grid">
      <label>授業名<input value={draft.name} onChange={(e) => onField("name", e.target.value)} placeholder="例：データ" /></label>
      <label>授業時間<input value={draft.time} onChange={(e) => onField("time", e.target.value)} placeholder="例：火曜3限" /></label>
      <label>授業コード<input value={draft.code} onChange={(e) => onField("code", e.target.value)} placeholder="例：ABC123" /></label>
      <label>単位数<select value={draft.credits} onChange={(e) => onField("credits", e.target.value)}><option value="">すべて</option><option value="1">1単位</option><option value="2">2単位</option><option value="4">4単位</option></select></label>
      <label>授業の種類<select value={draft.courseType} onChange={(e) => onField("courseType", e.target.value)}><option value="">すべて</option><option value="普遍">普遍</option><option value="専門">専門</option></select></label>
      <label>授業場所<input value={draft.location} onChange={(e) => onField("location", e.target.value)} placeholder="例：総合校舎2号館" /></label>
    </div><div className="search-actions"><button className="text-button" type="button" onClick={onClear}>条件をクリア</button><button className="dark-button" type="submit">⌕ クエストを検索</button></div></form>
    <div className="quest-list" aria-live="polite">{results.slice(0, 5).map((course) => <article className="quest-row" key={course.id}>
      <div><strong>{course.name}</strong><span>{course.code}・{course.teacher}</span></div><div className={`quest-kind kind-${course.courseType}`}><span>{course.courseType}・{course.credits}単位</span><span>{course.day}曜{course.period}限<br />{course.location}</span></div>
      <button type="button" className={registered.includes(course.id) ? "accepted" : ""} onClick={() => onToggle(course)}>{registered.includes(course.id) ? "受注済み" : "受注する"}</button>
    </article>)}{results.length === 0 && <p className="empty">条件に合うクエストがありません。検索条件を減らしてみてください。</p>}</div>
  </section>;
}
