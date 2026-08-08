import {
  dataScienceSpecialtyCreditCategories,
  professionalEducationCategories,
  universalEducationCategories,
} from "@/data/syllabus";
import type { CreditLedger } from "@/features/battle/semesterBattle";

export const GRADUATION_CREDITS = 130;
export const UNIVERSAL_REQUIRED_CREDITS = 26;
export const PROFESSIONAL_REQUIRED_CREDITS = 104;

export type StudyCourse = "information" | "dataScience";

export const studyCourseLabels: Record<StudyCourse, string> = {
  information: "情報工学コース",
  dataScience: "データサイエンスコース",
};

export type RequirementCheck = {
  id: string;
  label: string;
  current: number;
  target: string;
  met: boolean;
  note?: string;
  items?: string[];
};

export type GraduationEvaluation = {
  totalCredits: number;
  universalCredits: number;
  professionalCredits: number;
  universalChecks: RequirementCheck[];
  professionalChecks: RequirementCheck[];
  mandatoryChecks: RequirementCheck[];
  complete: boolean;
};

export type RequiredCourseProgress = {
  completed: number;
  total: number;
  missing: string[];
};

const credit = (ledger: CreditLedger, category: string) => Number(ledger[category]) || 0;
const sumCategories = (ledger: CreditLedger, categories: readonly string[]) =>
  categories.reduce((sum, category) => sum + credit(ledger, category), 0);

export const creditMaximumForCategory = (category: string) => {
  const maximums: Record<string, number> = {
    英語: 10,
    日本語科目: 4,
    初修外国語: 4,
    環境コア: 1,
    生命コア: 1,
    文化コア: 1,
    論理コア: 1,
    教養展開: 9,
  };
  return maximums[category];
};

const minimumCheck = (id: string, label: string, current: number, minimum: number, note?: string): RequirementCheck => ({
  id,
  label,
  current,
  target: `${minimum}単位以上`,
  met: current >= minimum,
  note,
});

export function evaluateGraduation(
  ledger: CreditLedger,
  studyCourse: StudyCourse | null,
  requiredCourseProgress?: RequiredCourseProgress,
): GraduationEvaluation {
  const universalCredits = sumCategories(ledger, universalEducationCategories);
  const professionalCredits = sumCategories(ledger, professionalEducationCategories);
  const totalCredits = universalCredits + professionalCredits;

  const internationalBase = credit(ledger, "国際基礎");
  const internationalAdvanced = credit(ledger, "国際展開");
  const regionalBase = credit(ledger, "地域基礎");
  const regionalAdvanced = credit(ledger, "地域展開");
  const mathDataScienceAdvanced = credit(ledger, "数理データサイエンス展開科目");
  const transferredToLiberalArts = Math.max(mathDataScienceAdvanced - 2, 0);
  const liberalArtsEffective = Math.min(9, credit(ledger, "教養展開") + transferredToLiberalArts);
  const coreCredits = ["環境コア", "生命コア", "文化コア", "論理コア"].reduce((sum, category) => sum + credit(ledger, category), 0);

  const universalChecks: RequirementCheck[] = [
    { id: "english", label: "英語", current: credit(ledger, "英語"), target: "6〜10単位", met: credit(ledger, "英語") >= 6 && credit(ledger, "英語") <= 10 },
    { id: "japanese", label: "日本語科目", current: credit(ledger, "日本語科目"), target: "0〜4単位", met: credit(ledger, "日本語科目") <= 4 },
    { id: "first-foreign", label: "初修外国語", current: credit(ledger, "初修外国語"), target: "0〜4単位", met: credit(ledger, "初修外国語") <= 4 },
    minimumCheck("international-base", "国際基礎", internationalBase, 1),
    minimumCheck("international-advanced", "国際展開", internationalAdvanced, 1, "国際科目は基礎・展開を各1単位以上修得"),
    minimumCheck("regional-base", "地域基礎", regionalBase, 1),
    minimumCheck("regional-advanced", "地域展開", regionalAdvanced, 1, "地域科目は基礎・展開を各1単位以上修得"),
    { id: "core", label: "教養コア4区分", current: coreCredits, target: "各1・計4単位", met: ["環境コア", "生命コア", "文化コア", "論理コア"].every((category) => credit(ledger, category) >= 1) },
    { id: "liberal-advanced", label: "教養展開", current: liberalArtsEffective, target: "5〜9単位", met: liberalArtsEffective >= 5, note: transferredToLiberalArts > 0 ? `数理DS展開の超過分から${transferredToLiberalArts}単位を算入` : "数理DS展開の2単位超過分を算入可能" },
    minimumCheck("math-ds-base", "数理データサイエンス基礎", credit(ledger, "数理データサイエンス基礎科目"), 1),
    minimumCheck("math-ds-advanced", "数理データサイエンス展開", mathDataScienceAdvanced, 2),
    minimumCheck("universal-total", "普遍教育 合計", universalCredits, UNIVERSAL_REQUIRED_CREDITS, "各最低要件に加えて不足分を選択して修得"),
  ];

  const dataScienceSpecialtyTotal = sumCategories(ledger, dataScienceSpecialtyCreditCategories);
  const professionalChecks: RequirementCheck[] = [
    minimumCheck("professional-foundation", "共通専門基礎科目", credit(ledger, "共通専門基礎科目"), 29),
    minimumCheck("common-professional", "共通専門", credit(ledger, "共通専門"), 10),
  ];

  if (studyCourse === "information") {
    professionalChecks.push(
      minimumCheck("ds-base", "データサイエンス基礎", credit(ledger, "データサイエンス基礎"), 8),
      minimumCheck("information-base", "情報工学基礎", credit(ledger, "情報工学基礎"), 13),
      minimumCheck("ds-specialty", "データサイエンス専門", dataScienceSpecialtyTotal, 12),
      minimumCheck("information-specialty", "情報工学専門", credit(ledger, "情報工学専門"), 16),
    );
  } else if (studyCourse === "dataScience") {
    professionalChecks.push(
      minimumCheck("ds-base", "データサイエンス基礎", credit(ledger, "データサイエンス基礎"), 12),
      minimumCheck("information-base", "情報工学基礎", credit(ledger, "情報工学基礎"), 9),
      minimumCheck("ds-specialty", "データサイエンス専門 合計", dataScienceSpecialtyTotal, 22),
      minimumCheck("ds-medical", "DS専門・医療／看護", credit(ledger, dataScienceSpecialtyCreditCategories[0]), 4),
      minimumCheck("ds-environment", "DS専門・環境／園芸", credit(ledger, dataScienceSpecialtyCreditCategories[1]), 4),
      minimumCheck("ds-human", "DS専門・人間／感性", credit(ledger, dataScienceSpecialtyCreditCategories[2]), 4),
      minimumCheck("information-specialty", "情報工学専門", credit(ledger, "情報工学専門"), 6),
    );
  } else {
    professionalChecks.push(
      minimumCheck(
        "ds-specialty-provisional",
        "データサイエンス専門",
        dataScienceSpecialtyTotal,
        12,
        "コース未選択中の最低基準です。データサイエンスコース選択後は22単位以上になります",
      ),
      minimumCheck(
        "information-specialty-provisional",
        "情報工学専門",
        credit(ledger, "情報工学専門"),
        6,
        "2年次から履修できます。コース未選択中は最低6単位、情報工学コース選択後は16単位以上です",
      ),
      {
        id: "course-selection",
        label: "3年次コース選択",
        current: 0,
        target: "コースを選択",
        met: false,
        note: "2年後期のボス撃破後、3年1〜2タームへ進む際に選択します",
      },
    );
  }

  professionalChecks.push(minimumCheck("professional-total", "専門科目 合計", professionalCredits, PROFESSIONAL_REQUIRED_CREDITS, "個別最低要件に加えて16単位を選択して修得"));

  const mandatoryChecks: RequirementCheck[] = requiredCourseProgress ? [{
    id: "required-course-completion",
    label: "必修授業の個別修得",
    current: requiredCourseProgress.completed,
    target: `全${requiredCourseProgress.total}科目`,
    met: requiredCourseProgress.completed >= requiredCourseProgress.total,
    note: requiredCourseProgress.missing.length > 0
      ? `未修得は${requiredCourseProgress.missing.length}科目です。時間割の再履修リストから確認・登録できます。`
      : "すべての必修授業を修得済み",
    items: requiredCourseProgress.missing,
  }] : [];

  return {
    totalCredits,
    universalCredits,
    professionalCredits,
    universalChecks,
    professionalChecks,
    mandatoryChecks,
    complete: totalCredits >= GRADUATION_CREDITS
      && universalChecks.every((check) => check.met)
      && professionalChecks.every((check) => check.met)
      && mandatoryChecks.every((check) => check.met),
  };
}
