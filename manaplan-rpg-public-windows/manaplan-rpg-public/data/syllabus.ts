import syllabusCsvText from "./syllabusCsv";

export type RequirementType = "required" | "selectRequired" | "informationRequired" | "dataScienceRequired" | "elective" | "unknown";
export type ScheduledWeekday = "月" | "火" | "水" | "木" | "金" | "土" | "集";
export type CourseDay = ScheduledWeekday | "未定";
export type TermGroup = "first" | "second";
export type StudyCourseTrack = "information" | "dataScience";

export type Course = {
  id: number;
  numberingCode: string;
  classCode: string;
  name: string;
  day: CourseDay;
  period: number | null;
  term: string;
  credits: number;
  location: string;
  requirementCode: string;
  requirement: RequirementType;
  unitCategory: string;
  recommendedGrade: number | null;
};

export const scheduledWeekdays: ScheduledWeekday[] = ["月", "火", "水", "木", "金", "土", "集"];

const requirementForCode = (code: string): RequirementType => {
  if (code === "1") return "required";
  if (code === "2") return "selectRequired";
  if (code === "3") return "informationRequired";
  if (code === "4") return "dataScienceRequired";
  if (code === "0") return "elective";
  return "unknown";
};

const splitCsvLine = (line: string) => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && next === "\"") {
      current += "\"";
      index++;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
};

export const parseCourses = (csvText: string): Course[] => {
  const rows = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map(splitCsvLine)
    .filter((row) => row.some((value) => value.trim()));
  const headerIndex = rows.findIndex((row) => row.includes("授業名"));
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex].map((header) => header.trim());
  const read = (row: string[], header: string) => {
    const index = headers.indexOf(header);
    return index >= 0 ? row[index]?.trim() ?? "" : "";
  };

  return rows
    .slice(headerIndex + 1)
    .filter((row) => read(row, "授業名"))
    .map((row, index) => {
      const day = read(row, "曜日");
      const period = Number(read(row, "時限"));
      const grade = Number(read(row, "学年"));
      const requirementCode = read(row, "必修");

      return {
        id: index + 1,
        numberingCode: read(row, "Numbering Code"),
        classCode: read(row, "Class Code"),
        name: read(row, "授業名"),
        day: scheduledWeekdays.includes(day as ScheduledWeekday) ? (day as ScheduledWeekday) : "未定",
        period: period >= 1 && period <= 5 ? period : null,
        term: read(row, "ターム") || "未定",
        credits: Number(read(row, "単位数")) || 0,
        location: read(row, "授業場所") || "未定",
        requirementCode,
        requirement: requirementForCode(requirementCode),
        unitCategory: read(row, "区分") || "区分未設定",
        recommendedGrade: grade >= 1 && grade <= 4 ? grade : null,
      };
    });
};

export const courses = parseCourses(syllabusCsvText);

export const universalEducationCategories = [
  "英語",
  "日本語科目",
  "初修外国語",
  "国際基礎",
  "国際展開",
  "地域基礎",
  "地域展開",
  "環境コア",
  "生命コア",
  "文化コア",
  "論理コア",
  "教養展開",
  "数理データサイエンス基礎科目",
  "数理データサイエンス展開科目",
] as const;

export const dataScienceSpecialtyCreditCategories = [
  "データサイエンス専門（医療・看護）",
  "データサイエンス専門（環境・園芸）",
  "データサイエンス専門（人間・感性）",
  "データサイエンス専門（その他）",
] as const;

// 履修検索ではCSV上の科目区分をそのまま使う。単位台帳上のDS専門3領域とは分けて扱う。
export const professionalCourseCategories = [
  "共通専門基礎科目",
  "データサイエンス基礎",
  "情報工学基礎",
  "共通専門",
  "データサイエンス専門",
  "情報工学専門",
] as const;

export const professionalEducationCategories = [
  "共通専門基礎科目",
  "データサイエンス基礎",
  "情報工学基礎",
  "共通専門",
  ...dataScienceSpecialtyCreditCategories,
  "情報工学専門",
] as const;

// 単位台帳では、データサイエンス専門を3領域＋その他に分けて一度だけ集計する。
// CSVに該当授業がない区分も含め、卒業要件の単位台帳として全区分を常設する。
export const unitCategories = [...universalEducationCategories, ...professionalEducationCategories];

export type EducationGroup = "universal" | "professional";

const universalCategorySet = new Set<string>(universalEducationCategories);

export const educationGroupForCourse = (course: Pick<Course, "unitCategory">): EducationGroup =>
  universalCategorySet.has(course.unitCategory) ? "universal" : "professional";

export const creditCategoryForCourse = (course: Pick<Course, "classCode" | "name" | "unitCategory">) => {
  if (course.unitCategory !== "データサイエンス専門") return course.unitCategory;
  if (course.classCode.startsWith("R01221")) return dataScienceSpecialtyCreditCategories[0];
  if (course.classCode.startsWith("R01222")) return dataScienceSpecialtyCreditCategories[1];
  if (course.classCode.startsWith("R01223")) return dataScienceSpecialtyCreditCategories[2];
  return dataScienceSpecialtyCreditCategories[3];
};

const CHIBA_GENERAL_SYLLABUS_BASE = "https://syllabus.gs.chiba-u.jp/2026/401001000000000";
const CHIBA_PROFESSIONAL_SYLLABUS_BASE = "https://syllabus.gs.chiba-u.jp/2026/101112101193000";
const syllabusUrlOverrides = new Map([
  ["B13B200701", "https://syllabus.gs.chiba-u.jp/2026/101104101000000/B13B200701/ja_JP"],
]);
const englishSyllabusCourseNames = new Set(["離散数学", "符号理論"]);
const professionalSyllabusCategories = new Set([
  "データサイエンス基礎",
  "情報工学基礎",
  "共通専門",
  "データサイエンス専門",
  "情報工学専門",
]);
const generalCommonFoundationCourseNames = new Set([
  "力学基礎",
  "力学基礎1",
  "力学基礎演習",
  "力学基礎演習1",
  "電磁気学基礎",
  "電磁気学基礎1",
  "電磁気学基礎演習",
  "電磁気学基礎演習1",
  "線形代数学B1",
  "線形代数学B2",
  "微積分学B1",
  "微積分学B2",
  "微積分学演習B1",
  "微積分学演習B2",
  "線形代数学演習B1",
  "線形代数学演習B2",
]);

const normalizedSyllabusCourseName = (name: string) => name
  .normalize("NFKC")
  .replace(/\(\s*\d+\s*\)(?:\s*\/.*)?$/u, "")
  .trim();

export const syllabusUrlForCourse = (course: Pick<Course, "classCode" | "name" | "unitCategory">) => {
  if (!course.classCode) return null;
  const overrideUrl = syllabusUrlOverrides.get(course.classCode);
  if (overrideUrl) return overrideUrl;
  const normalizedName = normalizedSyllabusCourseName(course.name);
  const language = course.unitCategory === "英語" || englishSyllabusCourseNames.has(normalizedName)
    ? "en_US"
    : "ja_JP";
  const usesProfessionalBase = professionalSyllabusCategories.has(course.unitCategory)
    || (course.unitCategory === "共通専門基礎科目" && !generalCommonFoundationCourseNames.has(normalizedName));
  const base = usesProfessionalBase ? CHIBA_PROFESSIONAL_SYLLABUS_BASE : CHIBA_GENERAL_SYLLABUS_BASE;
  return `${base}/${encodeURIComponent(course.classCode)}/${language}`;
};

export const formatTermLabel = (term: string) => {
  if (term === "7") return "1〜2ターム";
  if (term === "8") return "4〜5ターム";
  if (term === "9") return "前期集中";
  if (term === "10") return "後期集中";
  if (term === "未定") return "ターム未定";
  return `${term}ターム`;
};

export const termGroupForCourse = (course: Course): TermGroup | null => {
  if (["1", "2", "7", "9"].includes(course.term)) return "first";
  if (["4", "5", "8", "10"].includes(course.term)) return "second";
  return null;
};

export const courseIsInTermGroup = (course: Course, group: TermGroup) => termGroupForCourse(course) === group;

const courseFamilyName = (name: string) => name
  .normalize("NFKC")
  .replace(/\(\s*\d+\s*\)(?:\s*\/.*)?$/u, "")
  .trim();

/** 画面表示用に、並行クラス番号を除いた授業名を返す。 */
export const courseFamilyLabel = (course: Pick<Course, "name">) => courseFamilyName(course.name);

/** (1)、(2)などの並行クラスを、単位上は同じ授業として扱うためのキー。 */
export const courseFamilyKey = (course: Pick<Course, "name">) => courseFamilyName(course.name).toLocaleLowerCase("ja-JP");

const experimentOneNames = new Set(["情報工学実験IA", "情報工学実験IB", "情報工学実験IC"]);
const mathExerciseBundleNames = new Set([
  "微積分学演習B1",
  "微積分学演習B2",
  "線形代数学演習B1",
  "線形代数学演習B2",
]);

export const isExperimentOneBundleCourse = (course: Pick<Course, "name">) => experimentOneNames.has(course.name);
export const isMathExerciseBundleCourse = (course: Pick<Course, "name">) => mathExerciseBundleNames.has(courseFamilyLabel(course));
export const isOutsideTimetableCourse = (course: Pick<Course, "name" | "location">) =>
  course.location === "時間割外" || /^卒業研究(?:I{1,2}|[12])$/iu.test(course.name.normalize("NFKC"));

const registrationBundleKey = (course: Pick<Course, "name">) => {
  if (isExperimentOneBundleCourse(course)) return "情報工学実験I（A・B・Cセット）";
  if (isMathExerciseBundleCourse(course)) return "数学演習B1・B2セット";
  return null;
};

const occupiedTerms = (term: string) => {
  if (term === "7") return ["1", "2"];
  if (term === "8") return ["4", "5"];
  if (["1", "2", "4", "5"].includes(term)) return [term];
  return [];
};

export const coursesConflict = (left: Course, right: Course) => {
  const leftBundle = registrationBundleKey(left);
  if (leftBundle !== null && leftBundle === registrationBundleKey(right)) return false;
  if (left.period === null || right.period === null || left.day === "未定" || right.day === "未定") return false;
  if (left.day !== right.day || left.period !== right.period) return false;
  const leftTerms = occupiedTerms(left.term);
  const rightTerms = occupiedTerms(right.term);
  return leftTerms.some((term) => rightTerms.includes(term));
};

export const courseClassKey = (course: Pick<Course, "id" | "classCode">) => course.classCode || `course-${course.id}`;

export const uniqueCourseClasses = (courseRows: Course[]) => Array.from(
  new Map(courseRows.map((course) => [courseClassKey(course), course])).values(),
);

export const registrationIdsForCourse = (course: Course) => {
  const bundleKey = registrationBundleKey(course);
  if (bundleKey !== null) {
    return courses.filter((row) => registrationBundleKey(row) === bundleKey).map((row) => row.id);
  }
  const key = courseClassKey(course);
  return courses.filter((row) => courseClassKey(row) === key).map((row) => row.id);
};

export const courseIdsForClassKeys = (keys: Iterable<string>) => {
  const keySet = new Set(keys);
  return courses.filter((course) => keySet.has(courseClassKey(course))).map((course) => course.id);
};

export const courseIdsForFamilyKeys = (keys: Iterable<string>) => {
  const keySet = new Set(keys);
  return courses.filter((course) => keySet.has(courseFamilyKey(course))).map((course) => course.id);
};

const parallelCourseFamily = courseFamilyName;

const automaticRequirementMatches = (course: Course, studyCourse: StudyCourseTrack | null) => {
  if (course.requirement === "required") return !/^CALL(?:\d|\()/iu.test(course.name);
  if (studyCourse === "information") return course.requirement === "informationRequired";
  if (studyCourse === "dataScience") return course.requirement === "dataScienceRequired";
  return false;
};

/** 卒業までに個別修得が必要な必修授業。並行クラスはいずれか1つで満たす。 */
export const graduationRequiredCourseFamilies = (studyCourse: StudyCourseTrack | null) => Array.from(
  new Map(
    courses
      .filter((course) => automaticRequirementMatches(course, studyCourse))
      .map((course) => [courseFamilyKey(course), course]),
  ).values(),
);

export const autoRequiredCourseIds = (grade: number, termGroup: TermGroup, studyCourse: StudyCourseTrack | null = null) => {
  const candidates = courses.filter((course) => course.recommendedGrade === grade
    && automaticRequirementMatches(course, studyCourse)
    && courseIsInTermGroup(course, termGroup));
  const families = new Map<string, Map<string, Course[]>>();

  for (const course of candidates) {
    const family = registrationBundleKey(course) ?? parallelCourseFamily(course.name);
    const classCode = courseClassKey(course);
    if (!families.has(family)) families.set(family, new Map());
    const classes = families.get(family)!;
    if (!classes.has(classCode)) classes.set(classCode, []);
    classes.get(classCode)!.push(course);
  }

  const selectedRows: Course[] = [];
  for (const [family, classes] of families) {
    if (family === "情報工学実験I（A・B・Cセット）" || family === "数学演習B1・B2セット") {
      const bundledRows = Array.from(classes.values()).flat();
      if (bundledRows.every((row) => selectedRows.every((selected) => !coursesConflict(row, selected)))) selectedRows.push(...bundledRows);
      continue;
    }
    const compatibleClass = Array.from(classes.values()).find((rows) => rows.every((row) => selectedRows.every((selected) => !coursesConflict(row, selected))));
    if (compatibleClass) selectedRows.push(...compatibleClass);
  }

  return selectedRows.map((course) => course.id);
};

export const autoRequiredCourseIdsForYear = (grade: number, studyCourse: StudyCourseTrack | null = null) => Array.from(new Set([
  ...autoRequiredCourseIds(grade, "first", studyCourse),
  ...autoRequiredCourseIds(grade, "second", studyCourse),
]));
