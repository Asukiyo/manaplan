"use client";

import { useMemo, useState } from "react";
import {
  courseIsInTermGroup,
  creditCategoryForCourse,
  uniqueCourseClasses,
  type Course,
  type TermGroup,
} from "@/data/syllabus";
import {
  GRADUATION_CREDITS,
  PROFESSIONAL_REQUIRED_CREDITS,
  UNIVERSAL_REQUIRED_CREDITS,
} from "@/features/credits/graduationRequirements";

const featuredQuestions = [
  "130単位の卒業要件を教えて",
  "数理DS展開の超過分は教養展開に回せる？",
  "コース選択はいつ？",
  "時間割が重複していませんか？",
];

const questionGroups = [
  { icon: "✦", label: "おすすめ", description: "まず聞きたい4問", questions: featuredQuestions },
  { icon: "◆", label: "卒業・単位", description: "残り単位と卒業要件", questions: ["卒業まであと何単位？", "普遍教育の要件を教えて", "専門科目104単位の内訳は？", "数理DS展開の超過分は教養展開に回せる？"] },
  { icon: "▦", label: "授業・時間割", description: "登録方法と空き時間", questions: ["必修はどうやって確認する？", "授業を時間割に登録する方法は？", "登録中の授業は合計何単位？", "今学期の空き時間に入る授業は？"] },
  { icon: "↻", label: "履修ルール", description: "再履修と並行クラス", questions: ["落とした授業は再履修できる？", "同列・並行クラスとは？", "英語授業はどう自動登録される？", "卒業研究は時間割に入る？"] },
  { icon: "⚔", label: "学期末・ボス", description: "成績入力とボス戦", questions: ["学期末には何を入力する？", "GPAが高いと何が変わる？", "ボス戦の勝敗条件は？", "ボス戦に敗北するとどうなる？"] },
  { icon: "?", label: "使い方", description: "サイトと賢者の案内", questions: ["このサイトでは何ができる？", "授業を検索する方法は？", "装備や武器はどうやって解放する？", "賢者は何をしてくれる？"] },
] as const;

type QuestionLibraryProps = { onAsk: (question: string) => void };

export function QuestionLibrary({ onAsk }: QuestionLibraryProps) {
  const [open, setOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>(questionGroups[0].label);
  const activeGroup = questionGroups.find((group) => group.label === selectedGroup) ?? questionGroups[0];

  return (
    <section className="question-library" aria-label="質問例">
      <header><strong>よくある質問 <span>{activeGroup.label}</span></strong><button type="button" aria-label={open ? "質問カテゴリを閉じる" : "質問カテゴリを開く"} aria-expanded={open} onClick={() => setOpen((current) => !current)}>{open ? "−" : "＋"}</button></header>
      {open && <div className="question-category-picker" aria-label="質問カテゴリ">{questionGroups.map((group) => <button type="button" className={selectedGroup === group.label ? "active" : ""} aria-pressed={selectedGroup === group.label} key={group.label} onClick={() => setSelectedGroup(group.label)}><span aria-hidden="true">{group.icon}</span><b>{group.label}</b><small>{group.description}</small></button>)}</div>}
      <div className="quick-questions">{activeGroup.questions.map((question) => <button type="button" key={question} onClick={() => onAsk(question)}>{question}</button>)}</div>
    </section>
  );
}

type CreditSimulatorProps = {
  completedCredits: number;
  grade: number;
  termGroup: TermGroup;
  registeredCourses: Course[];
};

const creditColors = ["#7041ce", "#4387de", "#32a47e", "#e49a32", "#d65f8d", "#7b72d7", "#5b9fb4", "#ad6fbc"];

export function CreditSimulator({ completedCredits, grade, termGroup, registeredCourses }: CreditSimulatorProps) {
  const [earnedByCategory, setEarnedByCategory] = useState<Record<string, number>>({});
  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    const currentCourses = uniqueCourseClasses(registeredCourses.filter((course) => courseIsInTermGroup(course, termGroup)));
    for (const course of currentCourses) {
      const category = creditCategoryForCourse(course);
      totals.set(category, (totals.get(category) ?? 0) + course.credits);
    }
    return Array.from(totals, ([category, credits], index) => ({ category, credits, color: creditColors[index % creditColors.length] }));
  }, [registeredCourses, termGroup]);

  const categoryData = categoryTotals.map((entry) => ({
    ...entry,
    earned: Math.min(earnedByCategory[entry.category] ?? entry.credits, entry.credits),
  }));
  const registeredTermCredits = categoryData.reduce((sum, entry) => sum + entry.credits, 0);
  const termCredits = categoryData.reduce((sum, entry) => sum + entry.earned, 0);
  const projectedCredits = Math.min(completedCredits + termCredits, GRADUATION_CREDITS);
  const remainingCredits = Math.max(GRADUATION_CREDITS - projectedCredits, 0);
  const futureTerms = Math.max((4 - grade) * 2 + (termGroup === "first" ? 1 : 0), 0);
  const perTermTarget = futureTerms > 0 ? Math.ceil(remainingCredits / futureTerms) : remainingCredits;
  const graduationProgress = projectedCredits / GRADUATION_CREDITS;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - graduationProgress);

  const setAllCategories = (earned: boolean) => setEarnedByCategory(Object.fromEntries(categoryTotals.map((entry) => [entry.category, earned ? entry.credits : 0])));

  return (
    <section className="panel credit-simulator-panel" aria-labelledby="credit-simulator-title">
      <div className="credit-sim-copy">
        <span className="eyebrow">CREDIT SIMULATOR</span>
        <h2 id="credit-simulator-title">今タームの取得単位を試算</h2>
        <p>時間割に登録中の{registeredTermCredits}単位を上限に、単位区分ごとの取得見込みを調整できます。</p>
        <div className="credit-category-actions"><span>単位区分ごとの取得見込み</span><div><button type="button" onClick={() => setAllCategories(true)}>全単位を取得見込み</button><button type="button" onClick={() => setAllCategories(false)}>すべて0にする</button></div></div>
        <div className="credit-category-controls">{categoryData.length > 0 ? categoryData.map((entry) => <label key={entry.category}><span><i style={{ background: entry.color }} />{entry.category}</span><output>{entry.earned} / {entry.credits}単位</output><input type="range" min="0" max={entry.credits} step="1" value={entry.earned} style={{ accentColor: entry.color }} onChange={(event) => setEarnedByCategory((current) => ({ ...current, [entry.category]: Number(event.target.value) }))} /></label>) : <p>今タームの時間割に授業を登録すると、区分別の試算が表示されます。</p>}</div>
      </div>
      <div className="credit-donut-column">
        <div className="credit-donut" aria-label={`卒業に必要な${GRADUATION_CREDITS}単位のうち、今ターム終了時点で${projectedCredits}単位になる見込み`}>
          <svg viewBox="0 0 128 128" role="img" aria-hidden="true">
            <circle className="credit-ring-track" cx="64" cy="64" r={radius} />
            <circle className="credit-ring-progress" cx="64" cy="64" r={radius} strokeDasharray={circumference} strokeDashoffset={dashOffset} />
          </svg>
          <div><strong>{projectedCredits}<small> / {GRADUATION_CREDITS}</small></strong><span><b>今ターム終了時の見込み</b><i>/ 卒業必要単位</i></span></div>
        </div>
        {categoryData.length > 0 && <div className="credit-breakdown" aria-label="単位区分別の取得見込み">
          <div className="credit-stacked-bar">{categoryData.map((entry) => entry.earned > 0 && <i key={entry.category} title={`${entry.category} ${entry.earned}単位`} style={{ background: entry.color, width: `${registeredTermCredits > 0 ? entry.earned / registeredTermCredits * 100 : 0}%` }} />)}{registeredTermCredits > termCredits && <i className="remaining" title={`未取得見込み ${registeredTermCredits - termCredits}単位`} style={{ width: `${(registeredTermCredits - termCredits) / registeredTermCredits * 100}%` }} />}</div>
          <div className="credit-breakdown-legend">{categoryData.map((entry) => <span key={entry.category}><i style={{ background: entry.color }} /><span><b>{entry.category}</b><small><strong>取得見込み {entry.earned}単位</strong><em>履修 {entry.credits}単位</em></small></span></span>)}</div>
        </div>}
        <p className="credit-rule-note">円は総単位数の目安です。卒業には{GRADUATION_CREDITS}単位に加え、必修科目・普遍教育{UNIVERSAL_REQUIRED_CREDITS}単位・専門科目{PROFESSIONAL_REQUIRED_CREDITS}単位・各区分の要件を満たす必要があります。</p>
      </div>
      <div className="credit-sim-summary">
        <div><span>取得済み累計</span><strong>{completedCredits}<small>単位</small></strong></div>
        <div><span>今ターム取得見込み</span><strong>{termCredits}<small>単位</small></strong></div>
        <div><span>今ターム終了後の残り</span><strong>{remainingCredits}<small>単位</small></strong></div>
        <p>{remainingCredits === 0 ? "今ターム終了後、合計単位は到達見込みです。区分別要件と必修科目も確認しましょう。" : futureTerms > 0 ? `今ターム終了後、残り${futureTerms}タームで平均約${perTermTarget}単位/ターム` : `今ターム終了後も残り${remainingCredits}単位です。卒業要件を確認して履修計画を見直しましょう。`}</p>
      </div>
    </section>
  );
}
