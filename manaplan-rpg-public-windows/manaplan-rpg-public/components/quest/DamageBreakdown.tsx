import type { Course } from "@/data/courses";
import { Icon } from "@/components/ui/Icon";

type Props = { selectedCourses: Course[]; totalCredits: number };
export function DamageBreakdown({ selectedCourses, totalCredits }: Props) {
  const sum = (test: (course: Course) => boolean) => selectedCourses.filter(test).reduce((total, course) => total + course.credits, 0);
  return <section className="panel damage-panel"><h2><Icon>♢</Icon>ダメージ内訳</h2><strong className="damage-total">合計 {totalCredits}単位</strong><p>卒業要件に反映予定</p><dl>
    <div><dt>必修</dt><dd>{sum((course) => course.category === "required")} / 20</dd></div><div><dt>専門</dt><dd>{sum((course) => course.courseType === "専門")} / 60</dd></div><div><dt>普遍</dt><dd>{sum((course) => course.courseType === "普遍")} / 20</dd></div><div><dt>その他</dt><dd>0 / 24</dd></div>
  </dl></section>;
}
