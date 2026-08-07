import {
  courseIsInTermGroup,
  creditCategoryForCourse,
  dataScienceSpecialtyCreditCategories,
  type Course,
  type TermGroup,
} from "@/data/syllabus";

export type CreditLedger = Record<string, number>;

export type AcademicGrade = "S" | "A" | "B" | "C" | "F";

export const academicGradePoints: Record<AcademicGrade, number> = {
  S: 4,
  A: 3,
  B: 2,
  C: 1,
  F: 0,
};

export type GradedCourseResult = {
  credits: number;
  grade: AcademicGrade;
};

export type Equipment = {
  id: string;
  name: string;
  icon: string;
  note: string;
  categories: string[];
  requiredCredits: number;
};

export type SemesterBoss = {
  id: string;
  grade: number;
  termGroup: TermGroup;
  name: string;
  title: string;
  icon: string;
  image: string;
  threat: string;
  weakWeaponIds: string[];
};

export const equipmentCatalog: Equipment[] = [
  { id: "english-staff", name: "英知の杖", icon: "🪄", note: "英語を4単位修得", categories: ["英語"], requiredCredits: 4 },
  { id: "liberal-sword", name: "教養展開の大剣", icon: "🗡️", note: "教養展開を4単位修得", categories: ["教養展開"], requiredCredits: 4 },
  { id: "core-claws", name: "四源の爪", icon: "⚔️", note: "環境・生命・文化・論理コアを計4単位修得", categories: ["環境コア", "生命コア", "文化コア", "論理コア"], requiredCredits: 4 },
  { id: "regional-bow", name: "地域連携の弓", icon: "🏹", note: "地域基礎・地域展開を計4単位修得", categories: ["地域基礎", "地域展開"], requiredCredits: 4 },
  { id: "global-rapier", name: "国際共鳴の細剣", icon: "🌐", note: "国際基礎を4単位修得", categories: ["国際基礎"], requiredCredits: 4 },
  { id: "math-shield", name: "数理結界の盾", icon: "🛡️", note: "数理DS基礎・展開を計4単位修得", categories: ["数理データサイエンス基礎科目", "数理データサイエンス展開科目"], requiredCredits: 4 },
  { id: "foundation-lance", name: "専門基礎の槍", icon: "🔱", note: "共通専門基礎科目を4単位修得", categories: ["共通専門基礎科目"], requiredCredits: 4 },
  { id: "information-blades", name: "情報工学の双剣", icon: "⚡", note: "情報工学基礎・専門を計4単位修得", categories: ["情報工学基礎", "情報工学専門"], requiredCredits: 4 },
  { id: "data-orb", name: "データサイエンスの宝珠", icon: "🔮", note: "DS基礎・専門を計4単位修得", categories: ["データサイエンス基礎", ...dataScienceSpecialtyCreditCategories], requiredCredits: 4 },
  { id: "master-axe", name: "専門統合の戦斧", icon: "🪓", note: "共通・情報工学・DS専門を計4単位修得", categories: ["共通専門", "情報工学専門", ...dataScienceSpecialtyCreditCategories], requiredCredits: 4 },
];

export const semesterBosses: SemesterBoss[] = [
  { id: "g1-first", grade: 1, termGroup: "first", name: "新緑のぷちスライム", title: "1年前期・はじめての試練", icon: "✤", image: "/bosses/boss-01.svg", threat: "THREAT I・よわそう", weakWeaponIds: ["liberal-sword", "regional-bow"] },
  { id: "g1-second", grade: 1, termGroup: "second", name: "夕焼け見習いゴブリン", title: "1年後期・冒険の小鬼", icon: "♣", image: "/bosses/boss-02.svg", threat: "THREAT I・まだよわい", weakWeaponIds: ["english-staff", "global-rapier", "core-claws"] },
  { id: "g2-first", grade: 2, termGroup: "first", name: "鋼鉄教官ゴーレム", title: "2年前期・基礎を問う重装兵", icon: "◆", image: "/bosses/boss-03.svg", threat: "THREAT II・強敵", weakWeaponIds: ["foundation-lance", "information-blades"] },
  { id: "g2-second", grade: 2, termGroup: "second", name: "蒼雷の演算キマイラ", title: "2年後期・数理を喰らう魔獣", icon: "ϟ", image: "/bosses/boss-04.svg", threat: "THREAT II・危険", weakWeaponIds: ["math-shield", "data-orb"] },
  { id: "g3-first", grade: 3, termGroup: "first", name: "深層機竜アルゴリオン", title: "3年前期・情報深層の支配者", icon: "⬡", image: "/bosses/boss-05.svg", threat: "THREAT III・超強敵", weakWeaponIds: ["information-blades", "master-axe"] },
  { id: "g3-second", grade: 3, termGroup: "second", name: "虚数界の監視者オブシディア", title: "3年後期・データ深淵の異形", icon: "◉", image: "/bosses/boss-06.svg", threat: "THREAT III・絶望級", weakWeaponIds: ["data-orb", "master-axe"] },
  { id: "g4-first", grade: 4, termGroup: "first", name: "終焉騎神グラディウス", title: "4年前期・卒業研究の守護神", icon: "♛", image: "/bosses/boss-07.svg", threat: "THREAT IV・最凶", weakWeaponIds: ["master-axe", "information-blades", "data-orb"] },
  { id: "g4-second", grade: 4, termGroup: "second", name: "卒業魔王アカデミオン", title: "4年後期・すべてを終わらせる者", icon: "☠", image: "/bosses/boss-08.svg", threat: "THREAT MAX・最終決戦", weakWeaponIds: equipmentCatalog.map((equipment) => equipment.id) },
];

export const emptyLedger = (categories: string[]): CreditLedger => Object.fromEntries(categories.map((category) => [category, 0]));
export const sumLedger = (ledger: CreditLedger) => Object.values(ledger).reduce((sum, value) => sum + (Number(value) || 0), 0);
export const mergeLedgers = (left: CreditLedger, right: CreditLedger): CreditLedger => {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return Object.fromEntries(Array.from(keys, (key) => [key, (left[key] || 0) + (right[key] || 0)]));
};

export const creditLedgerForCourses = (courseRows: Course[], categories: string[]): CreditLedger => {
  const ledger = emptyLedger(categories);
  const countedCourses = new Set<string>();

  for (const course of courseRows) {
    const key = course.classCode || String(course.id);
    if (countedCourses.has(key)) continue;
    countedCourses.add(key);
    const category = creditCategoryForCourse(course);
    if (category in ledger) ledger[category] += course.credits;
  }

  return ledger;
};

export const plannedCreditLedger = (registeredCourses: Course[], termGroup: TermGroup, categories: string[]): CreditLedger =>
  creditLedgerForCourses(registeredCourses.filter((course) => courseIsInTermGroup(course, termGroup)), categories);

export const calculateGpa = (results: GradedCourseResult[]) => {
  const attemptedCredits = results.reduce((sum, result) => sum + Math.max(result.credits, 0), 0);
  if (attemptedCredits === 0) return 0;
  const gradePoints = results.reduce(
    (sum, result) => sum + Math.max(result.credits, 0) * academicGradePoints[result.grade],
    0,
  );
  return gradePoints / attemptedCredits;
};

export const unlockedEquipment = (ledger: CreditLedger) => equipmentCatalog.filter((equipment) => {
  const credits = equipment.categories.reduce((sum, category) => sum + (ledger[category] || 0), 0);
  return credits >= equipment.requiredCredits;
});

export const bossFor = (grade: number, termGroup: TermGroup) => semesterBosses.find((boss) => boss.grade === grade && boss.termGroup === termGroup) ?? semesterBosses[0];

export const bossAfter = (boss: SemesterBoss): SemesterBoss | null => {
  if (boss.termGroup === "first") return bossFor(boss.grade, "second");
  if (boss.grade < 4) return bossFor(boss.grade + 1, "first");
  return null;
};

export const battleOutcome = (gpa: number, semesterCredits: number, boss: SemesterBoss, equipment: Equipment[]) => {
  const effectiveWeapon = equipment.find((item) => boss.weakWeaponIds.includes(item.id)) ?? null;
  const requiredGpa = 2.5;
  const victoryByWeapon = effectiveWeapon !== null;
  const victory = victoryByWeapon || gpa >= requiredGpa;
  const effectLevel = gpa >= 3.9 ? 5 : gpa >= 3.5 ? 4 : gpa >= 3 ? 3 : gpa >= 2.5 ? 2 : 1;
  const effectRank = effectLevel === 5 ? "神話級" : effectLevel === 4 ? "伝説級" : effectLevel === 3 ? "超級" : effectLevel === 2 ? "上級" : "基本";
  const specialMove = effectLevel === 5
    ? "満点奥義・アカデミックノヴァ"
    : effectLevel === 4
      ? "叡智顕現・レジェンドバースト"
      : effectLevel === 3
        ? "GPA共鳴・オーバードライブ"
        : effectLevel === 2
          ? "単位連斬・クリティカル"
          : "弱点貫通・シラバスブレイク";
  const damage = victory ? Math.round(gpa * 55_000 + semesterCredits * 2_500 + (victoryByWeapon ? 80_000 : 0)) : 0;
  const finishLabel = !victory
    ? "DEFEATED"
    : effectLevel === 5
      ? "ACADEMIC APOCALYPSE"
      : effectLevel === 4
        ? "LEGENDARY OVERKILL"
        : effectLevel === 3
          ? "OVERKILL"
          : effectLevel === 2
            ? "CRITICAL FINISH"
            : "WEAKNESS BREAK";
  return { effectiveWeapon, requiredGpa, victoryByWeapon, victory, damage, effectLevel, effectRank, specialMove, finishLabel };
};
