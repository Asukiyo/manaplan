import type { Course } from "@/data/courses";
import { periods, weekdays } from "@/features/course-quest/constants";
import { Icon } from "@/components/ui/Icon";

type Props = { selectedCourses: Course[]; onToggle: (course: Course) => void };
export function Timetable({ selectedCourses, onToggle }: Props) {
  return <section className="panel timetable-panel" id="timetable"><div className="panel-heading"><h2><Icon>▦</Icon>今週のクエスト配置</h2><span className="source-badge">1年前期</span></div><div className="timetable-wrap"><div className="timetable">
    <div className="cell blank" />{weekdays.map((day) => <div className="cell day" key={day}>{day}</div>)}
    {periods.map((period) => <div className="row-contents" key={period}><div className="cell period">{period}限</div>{weekdays.map((day) => { const course = selectedCourses.find((item) => item.day === day && item.period === period); return <div className="cell slot" key={`${day}-${period}`}>{course && <button type="button" onClick={() => onToggle(course)}>{course.name.replace("プログラミング", "開発").replace("入門", "学")}</button>}</div>; })}</div>)}
  </div></div></section>;
}
