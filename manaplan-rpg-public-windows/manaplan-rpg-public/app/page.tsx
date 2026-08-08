"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  autoRequiredCourseIdsForYear,
  courseClassKey,
  courseFamilyLabel,
  courseFamilyKey,
  courseIdsForClassKeys,
  courseIdsForFamilyKeys,
  courseIsInTermGroup,
  courses,
  coursesConflict,
  creditCategoryForCourse,
  educationGroupForCourse,
  formatTermLabel,
  graduationRequiredCourseFamilies,
  isOutsideTimetableCourse,
  professionalCourseCategories,
  registrationIdsForCourse,
  scheduledWeekdays,
  syllabusUrlForCourse,
  termGroupForCourse,
  universalEducationCategories,
  uniqueCourseClasses,
  unitCategories,
  type Course,
  type RequirementType,
  type ScheduledWeekday,
  type TermGroup,
} from "@/data/syllabus";
import { mapsForLocation } from "@/data/campusMaps";
import {
  academicGradePoints,
  battleOutcome,
  bossAfter,
  bossFor,
  calculateGpa,
  creditLedgerForCourses,
  emptyLedger,
  equipmentCatalog,
  mergeLedgers,
  plannedCreditLedger,
  sumLedger,
  unlockedEquipment,
  type AcademicGrade,
  type CreditLedger,
  type Equipment,
  type SemesterBoss,
} from "@/features/battle/semesterBattle";
import { answerAdviser } from "@/features/chatbot/adviser";
import {
  evaluateGraduation,
  GRADUATION_CREDITS,
  studyCourseLabels,
  type StudyCourse,
} from "@/features/credits/graduationRequirements";

type BattleState = {
  gpa: number;
  semesterCredits: number;
  fields: CreditLedger;
  rewards: Equipment[];
  beforeCredits: number;
  boss: SemesterBoss;
  outcome: ReturnType<typeof battleOutcome>;
  passedCourseKeys: string[];
  failedCourseKeys: string[];
  resolved: boolean;
};

type OnboardingStep = "grade" | "course" | "term" | "credits" | "done";

type PersistedGameState = {
  version: 1;
  grade: number | null;
  onboardingStep: OnboardingStep;
  studyCourse: StudyCourse | null;
  adventureTermGroup: TermGroup;
  priorCompletedCourseKeys: string[];
  earnedFields: CreditLedger;
  completedCredits: number;
  latestGpa: number | null;
  equipment: string[];
  registered: number[];
  completedCourseKeys: string[];
  failedCourseKeys: string[];
  activeTimetableGroup: TermGroup;
  termPromptOpen: boolean;
  coursePromptOpen: boolean;
  promptShown: boolean;
  offeringOpen: boolean;
  offeringTermGroup: TermGroup;
  offeringGrades: Record<string, AcademicGrade>;
  battle: BattleState | null;
  graduationCleared: boolean;
  graduationClearOpen: boolean;
};

const SAVE_STORAGE_KEY = "manaplan-rpg-game-state-v1";

function isPersistedGameState(value: unknown): value is PersistedGameState {
  return typeof value === "object"
    && value !== null
    && "version" in value
    && value.version === 1;
}
const requirementMeta: Record<RequirementType, { label: string; color: string; soft: string; rune: string }> = {
  required: { label: "必修", color: "#ed5d8f", soft: "#ffe6ef", rune: "✦" },
  selectRequired: { label: "選択必修", color: "#d27a24", soft: "#fff0cf", rune: "◆" },
  informationRequired: { label: "情報工学必修", color: "#4f7fe8", soft: "#e4edff", rune: "✧" },
  dataScienceRequired: { label: "DS必修", color: "#8a60c5", soft: "#eee5fb", rune: "◇" },
  elective: { label: "その他", color: "#2ca47d", soft: "#ddf6ed", rune: "❖" },
  unknown: { label: "必修区分未設定", color: "#7d7483", soft: "#efedf1", rune: "・" },
};

const weekdays = scheduledWeekdays;
const periods = [
  { no: 1, time: "9:00–10:30" },
  { no: 2, time: "10:40–12:10" },
  { no: 3, time: "13:00–14:30" },
  { no: 4, time: "14:40–16:10" },
  { no: 5, time: "16:20–17:50" },
];

const termsForFilter = (term: string) => term === "7" ? ["7", "1", "2"] : term === "8" ? ["8", "4", "5"] : [term];

const quickQuestions = ["130単位の卒業要件を教えて", "数理DS展開の超過分は教養展開に回せる？", "コース選択はいつ？", "時間割が重複していませんか？"];
const termGroupLabel: Record<TermGroup, string> = { first: "1〜2ターム", second: "4〜5ターム" };
const SECOND_YEAR_PROMOTION_LINE = 65;
const CONTACT_FORM_URL = "https://docs.google.com/forms/d/1G5JDKzcsD9LUnuXKrE8dO-9dvyyo2TlxdKeIlqEjpWY/viewform?hl=ja";
const academicGradeOptions: { value: AcademicGrade; label: string; note: string }[] = [
  { value: "S", label: "S", note: "秀・4" },
  { value: "A", label: "A", note: "優・3" },
  { value: "B", label: "B", note: "良・2" },
  { value: "C", label: "C", note: "可・1" },
  { value: "F", label: "不可", note: "0" },
];

export default function Home() {
  const [grade, setGrade] = useState<number | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("grade");
  const [studyCourse, setStudyCourse] = useState<StudyCourse | null>(null);
  const [adventureTermGroup, setAdventureTermGroup] = useState<TermGroup>("first");
  const [priorCompletedCourseKeys, setPriorCompletedCourseKeys] = useState<string[]>([]);
  const [priorCourseSearch, setPriorCourseSearch] = useState("");
  const [earnedFields, setEarnedFields] = useState<CreditLedger>(() => emptyLedger(unitCategories));
  const [completedCredits, setCompletedCredits] = useState(0);
  const [latestGpa, setLatestGpa] = useState<number | null>(null);
  const [equipment, setEquipment] = useState<string[]>([]);

  const [selectedDay, setSelectedDay] = useState<ScheduledWeekday>("月");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [fromPeriod, setFromPeriod] = useState(1);
  const [toPeriod, setToPeriod] = useState(5);
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState({ keyword: "", from: 1, to: 5, day: null as ScheduledWeekday | null, term: "" });
  const [educationFilter, setEducationFilter] = useState<"all" | "universal" | "professional">("all");
  const [universalCategoryFilter, setUniversalCategoryFilter] = useState<"all" | (typeof universalEducationCategories)[number]>("all");
  const [professionalCategoryFilter, setProfessionalCategoryFilter] = useState<"all" | (typeof professionalCourseCategories)[number]>("all");
  const [registered, setRegistered] = useState<number[]>([]);
  const [completedCourseKeys, setCompletedCourseKeys] = useState<string[]>([]);
  const [failedCourseKeys, setFailedCourseKeys] = useState<string[]>([]);
  const [activeTimetableGroup, setActiveTimetableGroup] = useState<TermGroup>("first");
  const [notice, setNotice] = useState("");
  const [showAllResults, setShowAllResults] = useState(false);
  const [detailCourse, setDetailCourse] = useState<Course | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([]);

  const [termPromptOpen, setTermPromptOpen] = useState(false);
  const [coursePromptOpen, setCoursePromptOpen] = useState(false);
  const [promptShown, setPromptShown] = useState(false);
  const [offeringOpen, setOfferingOpen] = useState(false);
  const [offeringTermGroup, setOfferingTermGroup] = useState<TermGroup>("first");
  const [offeringGrades, setOfferingGrades] = useState<Record<string, AcademicGrade>>({});
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [graduationCleared, setGraduationCleared] = useState(false);
  const [graduationClearOpen, setGraduationClearOpen] = useState(false);
  const [saveLoaded, setSaveLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
        if (!raw) return;

        const saved: unknown = JSON.parse(raw);
        if (!isPersistedGameState(saved)) return;

        setGrade(saved.grade);
        setOnboardingStep(saved.onboardingStep);
        setStudyCourse(saved.studyCourse);
        setAdventureTermGroup(saved.adventureTermGroup);
        setPriorCompletedCourseKeys(saved.priorCompletedCourseKeys);
        setEarnedFields(saved.earnedFields);
        setCompletedCredits(saved.completedCredits);
        setLatestGpa(saved.latestGpa);
        setEquipment(saved.equipment);
        setRegistered(saved.registered);
        setCompletedCourseKeys(saved.completedCourseKeys);
        setFailedCourseKeys(saved.failedCourseKeys);
        setActiveTimetableGroup(saved.activeTimetableGroup);
        setTermPromptOpen(saved.termPromptOpen);
        setCoursePromptOpen(saved.coursePromptOpen);
        setPromptShown(saved.promptShown);
        setOfferingOpen(saved.offeringOpen);
        setOfferingTermGroup(saved.offeringTermGroup);
        setOfferingGrades(saved.offeringGrades);
        setBattle(saved.battle);
        setGraduationCleared(saved.graduationCleared);
        setGraduationClearOpen(saved.graduationClearOpen);
      } catch {
        // 壊れたセーブデータは無視して初期状態で開始する。
      } finally {
        setSaveLoaded(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!saveLoaded) return;

    const state: PersistedGameState = {
      version: 1,
      grade,
      onboardingStep,
      studyCourse,
      adventureTermGroup,
      priorCompletedCourseKeys,
      earnedFields,
      completedCredits,
      latestGpa,
      equipment,
      registered,
      completedCourseKeys,
      failedCourseKeys,
      activeTimetableGroup,
      termPromptOpen,
      coursePromptOpen,
      promptShown,
      offeringOpen,
      offeringTermGroup,
      offeringGrades,
      battle,
      graduationCleared,
      graduationClearOpen,
    };

    try {
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorageが使用できなくてもゲームは続行する。
    }
  }, [
    activeTimetableGroup,
    adventureTermGroup,
    battle,
    completedCourseKeys,
    completedCredits,
    coursePromptOpen,
    earnedFields,
    equipment,
    failedCourseKeys,
    grade,
    graduationClearOpen,
    graduationCleared,
    latestGpa,
    offeringGrades,
    offeringOpen,
    offeringTermGroup,
    onboardingStep,
    priorCompletedCourseKeys,
    promptShown,
    registered,
    saveLoaded,
    studyCourse,
    termPromptOpen,
  ]);
  useEffect(() => {
    if (onboardingStep !== "done" || promptShown) return;
    const timer = window.setTimeout(() => {
      setTermPromptOpen(true);
      setPromptShown(true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [onboardingStep, promptShown]);

  useEffect(() => {
    if (!detailCourse) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailCourse(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailCourse]);

  const results = useMemo(() => uniqueCourseClasses(courses.filter((course) => {
    const searchable = `${course.name}${course.location}${course.numberingCode}${course.classCode}${course.unitCategory}${requirementMeta[course.requirement].label}${course.recommendedGrade ?? ""}`.toLowerCase();
    return (!filters.keyword || searchable.includes(filters.keyword.toLowerCase()))
      && !completedCourseKeys.includes(courseFamilyKey(course))
      && (grade === null || (course.recommendedGrade !== null && course.recommendedGrade <= grade))
      && (!filters.day || course.period === null || (course.period >= filters.from && course.period <= filters.to))
      && (!filters.day || course.day === filters.day)
      && (!filters.term || termsForFilter(filters.term).includes(course.term))
      && (educationFilter === "all" || educationGroupForCourse(course) === educationFilter)
      && (educationFilter !== "universal" || universalCategoryFilter === "all" || course.unitCategory === universalCategoryFilter)
      && (educationFilter !== "professional" || professionalCategoryFilter === "all" || course.unitCategory === professionalCategoryFilter);
  })), [completedCourseKeys, educationFilter, filters, grade, professionalCategoryFilter, universalCategoryFilter]);

  const selectedCourses = useMemo(() => courses.filter((course) => registered.includes(course.id)), [registered]);
  const selectedCourseClasses = useMemo(() => uniqueCourseClasses(selectedCourses), [selectedCourses]);
  const priorCourseOptions = useMemo(() => uniqueCourseClasses(courses).filter((course) => {
    if (grade === null || grade === 1) return false;
    const recommendedGrade = course.recommendedGrade ?? 1;
    const isEarlierYear = recommendedGrade < grade;
    const isEarlierTerm = recommendedGrade === grade
      && adventureTermGroup === "second"
      && termGroupForCourse(course) === "first";
    const searchable = `${course.name}${course.classCode}${course.unitCategory}`.toLocaleLowerCase("ja-JP");
    return (isEarlierYear || isEarlierTerm)
      && (!priorCourseSearch.trim() || searchable.includes(priorCourseSearch.trim().toLocaleLowerCase("ja-JP")));
  }), [adventureTermGroup, grade, priorCourseSearch]);
  const priorSelectedCourses = useMemo(() => uniqueCourseClasses(courses.filter((course) =>
    priorCompletedCourseKeys.includes(courseClassKey(course)))), [priorCompletedCourseKeys]);
  const priorFields = useMemo(() => creditLedgerForCourses(priorSelectedCourses, unitCategories), [priorSelectedCourses]);
  const failedCourseFamilies = useMemo(() => new Set(courses
    .filter((course) => failedCourseKeys.includes(courseClassKey(course)))
    .map(courseFamilyKey)), [failedCourseKeys]);
  const retakeCourses = useMemo(() => {
    const seenRegistrationGroups = new Set<string>();
    return courses.filter((course) => {
      if (!failedCourseKeys.includes(courseClassKey(course))) return false;
      if (completedCourseKeys.includes(courseFamilyKey(course))) return false;
      const registrationGroup = [...registrationIdsForCourse(course)].sort((a, b) => a - b).join(",") || courseFamilyKey(course);
      if (seenRegistrationGroups.has(registrationGroup)) return false;
      seenRegistrationGroups.add(registrationGroup);
      return true;
    });
  }, [completedCourseKeys, failedCourseKeys]);
  const offeringCourses = useMemo(() => uniqueCourseClasses(selectedCourses.filter((course) => courseIsInTermGroup(course, adventureTermGroup)
    && !completedCourseKeys.includes(courseFamilyKey(course)))), [adventureTermGroup, completedCourseKeys, selectedCourses]);
  const semesterCreditLimits = useMemo(() => plannedCreditLedger(offeringCourses, adventureTermGroup, unitCategories), [offeringCourses, adventureTermGroup]);
  const offeringPassedCourseKeys = useMemo(() => offeringCourses
    .filter((course) => {
      const result = offeringGrades[courseClassKey(course)];
      return Boolean(result && result !== "F");
    })
    .map(courseClassKey), [offeringCourses, offeringGrades]);
  const offeringFields = useMemo(() => plannedCreditLedger(
    offeringCourses.filter((course) => offeringPassedCourseKeys.includes(courseClassKey(course))),
    adventureTermGroup,
    unitCategories,
  ), [adventureTermGroup, offeringCourses, offeringPassedCourseKeys]);
  const offeringAllGraded = offeringCourses.length > 0
    && offeringCourses.every((course) => Boolean(offeringGrades[courseClassKey(course)]));
  const offeringGpa = useMemo(() => calculateGpa(offeringCourses.flatMap((course) => {
    const result = offeringGrades[courseClassKey(course)];
    return result ? [{ credits: course.credits, grade: result }] : [];
  })), [offeringCourses, offeringGrades]);
  const offeringGradePointTotal = offeringCourses.reduce((sum, course) => {
    const result = offeringGrades[courseClassKey(course)];
    return sum + (result ? course.credits * academicGradePoints[result] : 0);
  }, 0);
  const offeringGradedCredits = offeringCourses.reduce((sum, course) =>
    sum + (offeringGrades[courseClassKey(course)] ? course.credits : 0), 0);
  const plannedSemesterCredits = offeringCourses.reduce((sum, course) => sum + course.credits, 0);
  const activeTimetableCourses = selectedCourses.filter((course) => courseIsInTermGroup(course, activeTimetableGroup));
  const outsideTimetableCourses = activeTimetableCourses.filter(isOutsideTimetableCourse);
  const scheduledTimetableCourses = activeTimetableCourses.filter((course) => !isOutsideTimetableCourse(course));
  const concentratedCourses = scheduledTimetableCourses.filter((course) => course.period === null);
  const plannedCredits = selectedCourseClasses.reduce((sum, course) => sum + course.credits, 0);
  const remainingCredits = Math.max(GRADUATION_CREDITS - completedCredits, 0);
  const level = Math.max(1, Math.floor(completedCredits / 6) + 1);
  const rank = completedCredits >= 120 ? "勇者" : completedCredits >= 80 ? "上級冒険者" : completedCredits >= 40 ? "冒険者" : "見習い冒険者";
  const visibleResults = showAllResults ? results : results.slice(0, 8);
  const currentBoss = bossFor(grade ?? 1, adventureTermGroup);
  const detailMaps = detailCourse ? mapsForLocation(detailCourse.location) : [];
  const detailSyllabusUrl = detailCourse ? syllabusUrlForCourse(detailCourse) : null;
  const detailParallelCourse = detailCourse ? parallelRegisteredCourse(detailCourse) : null;
  const detailIsOutsideTimetable = detailCourse ? isOutsideTimetableCourse(detailCourse) : false;
  const requiredCourseFamilies = useMemo(() => graduationRequiredCourseFamilies(studyCourse), [studyCourse]);
  const requiredCourseProgress = useMemo(() => {
    const missingCourses = requiredCourseFamilies.filter((course) => !completedCourseKeys.includes(courseFamilyKey(course)));
    return {
      completed: requiredCourseFamilies.length - missingCourses.length,
      total: requiredCourseFamilies.length,
      missing: missingCourses.map(courseFamilyLabel),
    };
  }, [completedCourseKeys, requiredCourseFamilies]);
  const graduation = useMemo(
    () => evaluateGraduation(earnedFields, studyCourse, requiredCourseProgress),
    [earnedFields, requiredCourseProgress, studyCourse],
  );
  const unmetGraduationChecks = [
    ...graduation.mandatoryChecks,
    ...graduation.universalChecks,
    ...graduation.professionalChecks,
  ].filter((check) => !check.met);
  const retentionGameOver = Boolean(battle?.resolved
    && battle.boss.grade === 2
    && battle.boss.termGroup === "second"
    && battle.beforeCredits + battle.semesterCredits <= SECOND_YEAR_PROMOTION_LINE);

  const automaticIdsForGrade = (targetGrade: number, targetCourse: StudyCourse | null = studyCourse) =>
    autoRequiredCourseIdsForYear(targetGrade, targetCourse).filter((id) => {
      const course = courses.find((item) => item.id === id);
      return course ? !completedCourseKeys.includes(courseFamilyKey(course)) : false;
    });

  const classCountForIds = (ids: number[]) => uniqueCourseClasses(courses.filter((course) => ids.includes(course.id))).length;

  function parallelRegisteredCourse(course: Course) {
    const ownIds = new Set(registrationIdsForCourse(course));
    const familyKey = courseFamilyKey(course);
    return selectedCourseClasses.find((registeredCourse) => courseFamilyKey(registeredCourse) === familyKey
      && !ownIds.has(registeredCourse.id));
  }

  function applyStudyCourse(value: StudyCourse) {
    setStudyCourse(value);
    const courseSpecificRequirements: RequirementType[] = ["informationRequired", "dataScienceRequired"];
    const requiredIds = automaticIdsForGrade(grade ?? 3, value);
    setRegistered((current) => Array.from(new Set([
      ...current.filter((id) => {
        const course = courses.find((item) => item.id === id);
        return !course || !courseSpecificRequirements.includes(course.requirement);
      }),
      ...requiredIds,
    ])));
    setNotice(`${studyCourseLabels[value]}の必修${classCountForIds(requiredIds)}科目を時間割へ自動登録しました`);
  }

  function chooseGrade(value: number) {
    setGrade(value);
    setRegistered([]);
    setStudyCourse(null);
    setCompletedCourseKeys([]);
    setFailedCourseKeys([]);
    setGraduationCleared(false);
    setGraduationClearOpen(false);
    setPriorCompletedCourseKeys([]);
    setPriorCourseSearch("");
    setOnboardingStep(value >= 3 ? "course" : "term");
  }

  function chooseStudyCourse(value: StudyCourse) {
    setStudyCourse(value);
    setOnboardingStep("term");
  }

  function chooseAdventureTerm(group: TermGroup) {
    const requiredIds = automaticIdsForGrade(grade ?? 1);
    const requiredClasses = classCountForIds(requiredIds);
    setAdventureTermGroup(group);
    setActiveTimetableGroup(group);
    setOfferingTermGroup(group);
    setRegistered(requiredIds);
    setPriorCompletedCourseKeys([]);
    setPriorCourseSearch("");
    setNotice(requiredClasses > 0 ? `${grade ?? 1}年生の1〜2／4〜5ターム両方に必修${requiredClasses}科目を自動登録しました` : `${grade ?? 1}年生に自動登録対象の必修科目はありません`);
    if (grade === 1) {
      setCompletedCredits(0);
      setPriorCompletedCourseKeys([]);
      setEarnedFields(emptyLedger(unitCategories));
      setEquipment([]);
      setOnboardingStep("done");
    } else {
      setOnboardingStep("credits");
    }
  }

  function finishPriorCredits(event: FormEvent) {
    event.preventDefault();
    const total = sumLedger(priorFields);
    const completedFamilies = new Set(priorSelectedCourses.map(courseFamilyKey));
    setCompletedCredits(Math.min(total, GRADUATION_CREDITS));
    setEarnedFields(priorFields);
    setCompletedCourseKeys(Array.from(completedFamilies));
    setRegistered((current) => current.filter((id) => {
      const course = courses.find((item) => item.id === id);
      return !course || !completedFamilies.has(courseFamilyKey(course));
    }));
    setEquipment(unlockedEquipment(priorFields).map((item) => item.id));
    setOnboardingStep("done");
  }

  function togglePriorCompletedCourse(course: Course) {
    const classKey = courseClassKey(course);
    const familyKey = courseFamilyKey(course);
    setPriorCompletedCourseKeys((current) => {
      if (current.includes(classKey)) return current.filter((key) => key !== classKey);
      const withoutParallelClasses = current.filter((key) => {
        const selectedCourse = courses.find((item) => courseClassKey(item) === key);
        return !selectedCourse || courseFamilyKey(selectedCourse) !== familyKey;
      });
      return [...withoutParallelClasses, classKey];
    });
  }

  function search(event: FormEvent) {
    event.preventDefault();
    setFilters({ keyword: keyword.trim(), from: fromPeriod, to: toPeriod, day: selectedDay, term: selectedTerm });
    setShowAllResults(false);
    setNotice(`${selectedTerm ? `${formatTermLabel(selectedTerm)}・` : ""}${selectedDay}曜日・${fromPeriod}〜${toPeriod}限を探索しました`);
  }

  function resetSearch() {
    setKeyword("");
    setSelectedTerm("");
    setFilters({ keyword: "", from: 1, to: 5, day: null, term: "" });
    setEducationFilter("all");
    setUniversalCategoryFilter("all");
    setProfessionalCategoryFilter("all");
    setShowAllResults(false);
    setNotice("すべての授業クエストを表示しています");
  }

  function toggleRegistration(course: Course) {
    const targetIds = registrationIdsForCourse(course);
    const targetIdSet = new Set(targetIds);
    const targetCourses = courses.filter((item) => targetIdSet.has(item.id));
    const targetFamilyKeys = new Set(targetCourses.map(courseFamilyKey));
    const targetLabel = targetCourses.some((item) => item.name === "情報工学実験IA")
      ? "情報工学実験IA・IB・ICセット"
      : course.name;
    if (Array.from(targetFamilyKeys).some((key) => completedCourseKeys.includes(key))) {
      setNotice(`「${targetLabel}」と同列の授業は修得済みのため、もう一度登録できません`);
      return;
    }
    if (targetIds.some((id) => registered.includes(id))) {
      if (targetCourses.some(isOutsideTimetableCourse)) {
        setNotice(`「${targetLabel}」は卒業に必要な時間割外の必修科目として自動登録されています`);
        return;
      }
      setRegistered((current) => current.filter((id) => !targetIdSet.has(id)));
      setNotice(`「${targetLabel}」を時間割から外しました`);
      return;
    }
    const parallelRegistration = selectedCourseClasses.find((item) => targetFamilyKeys.has(courseFamilyKey(item))
      && !targetIdSet.has(item.id));
    if (parallelRegistration) {
      setNotice(`「${parallelRegistration.name}」と「${course.name}」は同列授業です。登録できるのは1クラスだけです`);
      return;
    }
    const conflict = selectedCourses.find((item) => !targetIdSet.has(item.id)
      && targetCourses.some((target) => coursesConflict(item, target)));
    if (conflict) {
      setNotice(`「${conflict.name}」（${formatTermLabel(conflict.term)}）と時間が重なっています`);
      return;
    }
    setRegistered((current) => Array.from(new Set([...current, ...targetIds])));
    const group = termGroupForCourse(course);
    if (group) setActiveTimetableGroup(group);
    setNotice(`「${targetLabel}」を${group ? termGroupLabel[group] : "時間割"}に登録しました`);
  }

  function ask(question: string) {
    const clean = question.trim();
    if (!clean) return;
    const answer = answerAdviser(clean, {
      grade: grade ?? 1,
      termGroup: adventureTermGroup,
      completedCredits,
      remainingCredits,
      registeredCourses: selectedCourses,
      studyCourse,
    });
    setMessages((current) => [...current, { role: "user", text: clean }, { role: "bot", text: answer }]);
    setChatInput("");
  }

  function openOffering() {
    setTermPromptOpen(false);
    if (plannedSemesterCredits <= 0) {
      setNotice(`${termGroupLabel[adventureTermGroup]}の時間割に授業を登録してから、学期末イベントを開いてください`);
      return;
    }
    setOfferingTermGroup(adventureTermGroup);
    setOfferingGrades({});
    setOfferingOpen(true);
  }

  function prepareBattle(event: FormEvent) {
    event.preventDefault();
    if (!offeringAllGraded) {
      setNotice("すべての履修科目にS・A・B・C・不可のいずれかを選んでください");
      return;
    }
    const gpa = offeringGpa;
    const semesterCredits = sumLedger(offeringFields);
    const passedCourseKeys = offeringCourses
      .map(courseClassKey)
      .filter((key) => {
        const course = courses.find((item) => courseClassKey(item) === key);
        return offeringGrades[key] !== "F" && Boolean(course && !completedCourseKeys.includes(courseFamilyKey(course)));
      });
    const failedSemesterCourseKeys = offeringCourses
      .map(courseClassKey)
      .filter((key) => !passedCourseKeys.includes(key));
    const cumulativeFields = mergeLedgers(earnedFields, offeringFields);
    const availableEquipment = unlockedEquipment(cumulativeFields);
    const rewards = availableEquipment.filter((item) => !equipment.includes(item.id));
    const boss = bossFor(grade ?? 1, adventureTermGroup);
    const outcome = battleOutcome(gpa, semesterCredits, boss, availableEquipment);
    setBattle({ gpa, semesterCredits, fields: offeringFields, rewards, beforeCredits: completedCredits, boss, outcome, passedCourseKeys, failedCourseKeys: failedSemesterCourseKeys, resolved: false });
    setOfferingOpen(false);
  }

  function resolveBattle() {
    if (!battle || battle.resolved) return;
    const nextCredits = Math.min(GRADUATION_CREDITS, battle.beforeCredits + battle.semesterCredits);
    const passedFamilyKeys = new Set(courses
      .filter((course) => battle.passedCourseKeys.includes(courseClassKey(course)))
      .map(courseFamilyKey));
    setCompletedCredits(nextCredits);
    setLatestGpa(battle.gpa);
    setEarnedFields((current) => mergeLedgers(current, battle.fields));
    setCompletedCourseKeys((current) => Array.from(new Set([...current, ...passedFamilyKeys])));
    setFailedCourseKeys((current) => Array.from(new Set([
      ...current.filter((key) => {
        const failedCourse = courses.find((course) => courseClassKey(course) === key);
        return !failedCourse || !passedFamilyKeys.has(courseFamilyKey(failedCourse));
      }),
      ...battle.failedCourseKeys.filter((key) => {
        const failedCourse = courses.find((course) => courseClassKey(course) === key);
        return !failedCourse || !passedFamilyKeys.has(courseFamilyKey(failedCourse));
      }),
    ])));
    const passedIds = new Set(courseIdsForFamilyKeys(passedFamilyKeys));
    setRegistered((current) => current.filter((id) => !passedIds.has(id)));
    if (detailCourse && passedFamilyKeys.has(courseFamilyKey(detailCourse))) setDetailCourse(null);
    setEquipment((current) => Array.from(new Set([...current, ...battle.rewards.map((item) => item.id)])));
    setBattle({ ...battle, resolved: true });
  }

  function closeBattle() {
    const resolvedBattle = battle?.resolved ? battle : null;
    const retained = Boolean(resolvedBattle
      && resolvedBattle.boss.grade === 2
      && resolvedBattle.boss.termGroup === "second"
      && resolvedBattle.beforeCredits + resolvedBattle.semesterCredits <= SECOND_YEAR_PROMOTION_LINE);
    const rescuedBySage = Boolean(resolvedBattle && !resolvedBattle.outcome.victory);
    const completedAfterBattle = new Set([
      ...completedCourseKeys,
      ...courses
        .filter((course) => (resolvedBattle?.passedCourseKeys ?? []).includes(courseClassKey(course)))
        .map(courseFamilyKey),
    ]);
    const retryKeys = new Set([
      ...failedCourseKeys,
      ...(resolvedBattle?.failedCourseKeys ?? []),
    ].filter((key) => {
      const failedCourse = courses.find((course) => courseClassKey(course) === key);
      return !failedCourse || !completedAfterBattle.has(courseFamilyKey(failedCourse));
    }));
    const retryIds = courseIdsForClassKeys(retryKeys);
    setBattle(null);
    setOfferingGrades({});
    if (!resolvedBattle) {
      setNotice("ボス戦を終了しました");
      return;
    }
    if (retained) {
      const requiredIds = automaticIdsForGrade(2, null);
      const requiredClasses = classCountForIds(requiredIds);
      setGrade(2);
      setStudyCourse(null);
      setAdventureTermGroup("first");
      setActiveTimetableGroup("first");
      setOfferingTermGroup("first");
      setRegistered(Array.from(new Set([...retryIds, ...requiredIds])));
      setPromptShown(false);
      setNotice(`GAME OVER：2年後期終了時に65単位を超えなかったため、2年1〜2タームへ戻りました。未取得科目と両タームの必修${requiredClasses}科目を再登録しました`);
      return;
    }
    const defeatedBoss = resolvedBattle.boss;
    const nextBoss = bossAfter(defeatedBoss);
    if (!nextBoss) {
      const missingRequired = requiredCourseFamilies.filter((course) => !completedAfterBattle.has(courseFamilyKey(course)));
      const finalGraduation = evaluateGraduation(earnedFields, studyCourse, {
        completed: requiredCourseFamilies.length - missingRequired.length,
        total: requiredCourseFamilies.length,
        missing: missingRequired.map(courseFamilyLabel),
      });
      setRegistered(retryIds);
      if (finalGraduation.complete) {
        setGraduationCleared(true);
        setGraduationClearOpen(true);
      }
      setNotice(finalGraduation.complete
        ? (rescuedBySage ? "天才賢者の救援で全ボスを突破し、卒業要件も達成しました！" : "全ボスを撃破し、卒業要件を達成しました！")
        : `全ボスを突破しましたが、卒業要件は未達成です。不足している必修授業または単位区分を確認してください（未達${[
          ...finalGraduation.mandatoryChecks,
          ...finalGraduation.universalChecks,
          ...finalGraduation.professionalChecks,
        ].filter((check) => !check.met).length}項目）`);
      return;
    }
    setGrade(nextBoss.grade);
    setAdventureTermGroup(nextBoss.termGroup);
    setActiveTimetableGroup(nextBoss.termGroup);
    setOfferingTermGroup(nextBoss.termGroup);
    const requiredIds = automaticIdsForGrade(nextBoss.grade, studyCourse);
    const requiredClasses = classCountForIds(requiredIds);
    setRegistered((current) =>
      Array.from(new Set([...current, ...retryIds, ...requiredIds])),
    );
    if (nextBoss.grade === 3 && studyCourse === null) setCoursePromptOpen(true);
    setNotice(`${rescuedBySage ? "天才賢者の救援により" : "勝利により"}${nextBoss.grade}年生の${termGroupLabel[nextBoss.termGroup]}へ進行しました。未取得科目を再履修用に残し、同学年の両タームへ必修${requiredClasses}科目を自動登録しました`);
  }

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (!saveLoaded) return null;
  return (
    <main className="app-shell">
      <aside className="side-nav" aria-label="メインメニュー">
        <div className="logo-lockup"><span className="logo-orb">✦</span><div><strong>まなプラン</strong><small>COURSE QUEST</small></div></div>
        <nav>
          <button className="active" onClick={() => scrollTo("home")}><span>⌂</span>ホーム</button>
          <button onClick={() => scrollTo("courses")}><span>⌕</span>授業探索</button>
          <button onClick={() => scrollTo("timetable")}><span>▦</span>時間割</button>
          <button onClick={() => scrollTo("equipment")}><span>♜</span>装備図鑑</button>
          <button onClick={() => setTermPromptOpen(true)}><span>⚔</span>ボス戦</button>
          <button onClick={() => scrollTo("contact")}><span>✉</span>お問い合わせ</button>
        </nav>
        <div className="player-mini">
          <div className="avatar"><img src="/characters/student-hero.svg?v=20260807-2" alt="自分の学生冒険者" /></div>
          <div><strong>{rank}</strong><span>{grade ?? "-"}年生・Lv.{level}</span></div>
        </div>
      </aside>

      <div className="page-content">
        <header className="topbar">
          <div className="mobile-brand">✦ まなプラン</div>
          <div className="topbar-status"><span className="level-pill">★ レベル {level}</span><div className="mini-exp"><i style={{ width: `${Math.min((completedCredits / GRADUATION_CREDITS) * 100, 100)}%` }} /></div><small>EXP {completedCredits}</small></div>
          <button className="notification" onClick={() => setTermPromptOpen(true)} aria-label="学期末イベントを開く">🔔<b>1</b></button>
        </header>

        <div className="main-canvas">
          <section className={`hero-panel boss-grade-${currentBoss.grade} boss-term-${currentBoss.termGroup}`} id="home" style={{ "--hero-boss-image": `url("${currentBoss.image}")` } as React.CSSProperties}>
            <div className="hero-copy">
              <span className="quest-label">{grade ?? 1}年生・{termGroupLabel[adventureTermGroup]}の試練</span>
              <h1>{currentBoss.name} <small>{currentBoss.threat}</small></h1>
              <p>学期の単位を集めて、次のボスを打ち倒そう！</p>
            </div>
            <div className="hero-stats glass-panel">
              <span>冒険ステータス</span><strong>{completedCredits} <small>修得済み単位</small></strong>
              <div className="hero-stat-row"><span>今期予定 <b>+{plannedCredits}</b></span><span>獲得装備 <b>{equipment.length}</b></span></div>
            </div>
            <div className="speech-bubble">よーし、一緒に<br />単位を集めよう！</div>
            <div className="boss-card"><span>学期末ボス</span><strong>CHALLENGE READY</strong><small>{termGroupLabel[adventureTermGroup]}・武器とGPAで挑戦</small></div>
            <button className="hero-cta" onClick={() => setTermPromptOpen(true)}>⚔ 学期末イベント</button>
          </section>

          <section className="dashboard-strip" aria-label="冒険状況">
            <article><span className="stat-icon violet">G</span><div><small>最新GPA</small><strong>{latestGpa === null ? "未奉納" : latestGpa.toFixed(2)}</strong></div></article>
            <article><span className="stat-icon blue">◇</span><div><small>修得済み単位</small><strong>{completedCredits} 単位</strong></div></article>
            <article><span className="stat-icon green">＋</span><div><small>今期の登録予定</small><strong>{plannedCredits} 単位</strong></div></article>
            <article><span className="stat-icon gold">♜</span><div><small>獲得装備</small><strong>{equipment.length} 個</strong></div></article>
          </section>

          <section className="panel graduation-panel" aria-labelledby="graduation-title">
            <div className="graduation-heading">
              <div><span className="eyebrow">GRADUATION ROUTE</span><h2 id="graduation-title">卒業要件・130単位への道</h2><p>130単位だけでなく、必修授業と普遍・専門の各内訳をすべて満たす必要があります。</p></div>
              <div className={`graduation-total ${graduation.complete ? "complete" : "incomplete"}`}><strong>{graduation.totalCredits} / {GRADUATION_CREDITS}</strong><small>{graduation.complete ? "卒業要件達成" : "卒業要件未達成"}</small>{graduationCleared && <button type="button" onClick={() => setGraduationClearOpen(true)}>✦ クリア演出をもう一度</button>}</div>
            </div>
            {!graduation.complete && <div className={`graduation-warning ${graduation.totalCredits >= GRADUATION_CREDITS ? "credits-complete" : ""}`}><strong>{graduation.totalCredits >= GRADUATION_CREDITS ? "総単位数を満たしても、まだ卒業できません" : "卒業までに未達の条件があります"}</strong><span>{unmetGraduationChecks.slice(0, 4).map((check) => check.label).join("・")}{unmetGraduationChecks.length > 4 ? ` ほか${unmetGraduationChecks.length - 4}件` : ""}</span></div>}
            <div className="graduation-summary">
              <article><span>普遍教育</span><strong>{graduation.universalCredits} / 26</strong><i><b style={{ width: `${Math.min((graduation.universalCredits / 26) * 100, 100)}%` }} /></i></article>
              <article><span>専門科目</span><strong>{graduation.professionalCredits} / 104</strong><i><b style={{ width: `${Math.min((graduation.professionalCredits / 104) * 100, 100)}%` }} /></i></article>
              <article className="study-course-card"><span>選択コース</span><strong>{studyCourse ? studyCourseLabels[studyCourse] : grade !== null && grade < 3 ? "3年進級時に選択" : "未選択"}</strong>{grade !== null && grade >= 3 && <div>{(Object.keys(studyCourseLabels) as StudyCourse[]).map((value) => <button type="button" className={studyCourse === value ? "active" : ""} key={value} onClick={() => applyStudyCourse(value)}>{studyCourseLabels[value]}</button>)}</div>}</article>
            </div>
            <div className="requirement-groups">
              <details open><summary>必修授業の修得状況 <span>{requiredCourseProgress.completed}/{requiredCourseProgress.total}</span></summary><RequirementList checks={graduation.mandatoryChecks} /></details>
              <details><summary>普遍教育の内訳を見る <span>{graduation.universalChecks.filter((check) => check.met).length}/{graduation.universalChecks.length}</span></summary><RequirementList checks={graduation.universalChecks} /></details>
              <details><summary>専門科目の内訳を見る <span>{graduation.professionalChecks.filter((check) => check.met).length}/{graduation.professionalChecks.length}</span></summary><RequirementList checks={graduation.professionalChecks} /></details>
            </div>
          </section>

          <div className="content-grid" id="courses">
            <section className="panel quest-panel">
              <div className="section-heading"><div><span className="eyebrow">QUEST BOARD・{grade ?? 1}年生まで履修可能</span><h2>{grade ?? 1}年生で選べる授業クエスト</h2></div><button className="text-button" onClick={resetSearch}>条件をリセット</button></div>
              <form className="quest-search" onSubmit={search}>
                <div className="keyword-box"><span>⌕</span><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="授業名・教室・コードで検索" aria-label="キーワード" /></div>
                <select value={selectedTerm} onChange={(event) => setSelectedTerm(event.target.value)} aria-label="ターム"><option value="">全ターム</option>{["1", "2", "4", "5", "7", "8", "9", "10"].map((term) => <option key={term} value={term}>{formatTermLabel(term)}</option>)}</select>
                <select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value as ScheduledWeekday)} aria-label="曜日">{weekdays.map((day) => <option key={day} value={day}>{day}曜日</option>)}</select>
                <div className="period-select"><select value={fromPeriod} onChange={(event) => setFromPeriod(Number(event.target.value))} aria-label="開始時限">{periods.map((period) => <option key={period.no} value={period.no}>{period.no}限</option>)}</select><span>〜</span><select value={toPeriod} onChange={(event) => setToPeriod(Number(event.target.value))} aria-label="終了時限">{periods.map((period) => <option key={period.no} value={period.no}>{period.no}限</option>)}</select></div>
                <button className="primary-button" type="submit">探索する</button>
              </form>

              <div className="education-filter" role="group" aria-label="教育区分で絞り込む">
                <span>教育区分</span>{(["all", "universal", "professional"] as const).map((value) => <button type="button" className={educationFilter === value ? "active" : ""} key={value} onClick={() => { setEducationFilter(value); setUniversalCategoryFilter("all"); setProfessionalCategoryFilter("all"); setShowAllResults(false); }}>{value === "all" ? "すべて" : value === "universal" ? "普遍教育" : "専門科目"}</button>)}
              </div>
              {educationFilter === "universal" && <div className="education-subcategory-filter" role="group" aria-label="普遍教育の科目区分で絞り込む">
                <span>普遍教育の区分</span>
                <div><button type="button" className={universalCategoryFilter === "all" ? "active" : ""} onClick={() => { setUniversalCategoryFilter("all"); setShowAllResults(false); }}>すべて</button>{universalEducationCategories.map((category) => <button type="button" className={universalCategoryFilter === category ? "active" : ""} key={category} onClick={() => { setUniversalCategoryFilter(category); setShowAllResults(false); }}>{category}</button>)}</div>
              </div>}
              {educationFilter === "professional" && <div className="education-subcategory-filter professional-subcategory-filter" role="group" aria-label="専門科目の区分で絞り込む">
                <span>専門科目の区分</span>
                <div><button type="button" className={professionalCategoryFilter === "all" ? "active" : ""} onClick={() => { setProfessionalCategoryFilter("all"); setShowAllResults(false); }}>すべて</button>{professionalCourseCategories.map((category) => <button type="button" className={professionalCategoryFilter === category ? "active" : ""} key={category} onClick={() => { setProfessionalCategoryFilter(category); setShowAllResults(false); }}>{category}</button>)}</div>
              </div>}
              {retakeCourses.length > 0 && <section className="retake-list" aria-labelledby="retake-list-title">
                <header><div><span>RETRY QUEST</span><h3 id="retake-list-title">再履修リスト</h3></div><strong>{retakeCourses.length}科目</strong></header>
                <p>学期末に「未取得」だった授業です。修得するまで通常の授業とは分けて表示し、学年が上がってもここから再登録できます。</p>
                <div className="retake-list-grid">{retakeCourses.map((course) => {
                  const registeredRetakeCourse = selectedCourseClasses.find((item) => courseFamilyKey(item) === courseFamilyKey(course));
                  const selected = Boolean(registeredRetakeCourse) || registrationIdsForCourse(course).some((id) => registered.includes(id));
                  return <article key={`retake-${course.id}`}>
                    <span className="retake-status">未取得・再履修待ち</span>
                    <h4>{course.name}</h4>
                    <p>{course.recommendedGrade ? `${course.recommendedGrade}年向け・` : ""}{formatTermLabel(course.term)}・{course.credits}単位</p>
                    <div><small>{course.unitCategory}</small><button type="button" className={selected ? "selected" : ""} onClick={() => toggleRegistration(registeredRetakeCourse ?? course)}>{selected ? "✓ 再履修を登録済み" : "↻ 時間割へ再登録"}</button></div>
                  </article>;
                })}</div>
              </section>}
              <div className="course-list-heading"><span>{grade ?? 1}年生まで・{results.length}件のクエスト（下級年次は再履修可能）</span><div className="legend-mini">{(Object.keys(requirementMeta) as RequirementType[]).slice(0, 5).map((requirement) => <i key={requirement} title={requirementMeta[requirement].label} style={{ background: requirementMeta[requirement].color }} />)}</div></div>
              <div className="course-grid">
                {visibleResults.map((course) => {
                  const meta = requirementMeta[course.requirement];
                  const selected = registrationIdsForCourse(course).some((id) => registered.includes(id));
                  const parallelCourse = parallelRegisteredCourse(course);
                  const outsideTimetable = isOutsideTimetableCourse(course);
                  const isRetake = failedCourseFamilies.has(courseFamilyKey(course));
                  const isLowerGrade = grade !== null && course.recommendedGrade !== null && course.recommendedGrade < grade;
                  return <article className={`course-card ${isRetake ? "retake-course-card" : ""}`} key={course.id} style={{ "--course-color": isRetake ? "#ed8a3c" : meta.color } as React.CSSProperties}>
                    <div className="course-rarity"><span style={{ background: meta.soft, color: meta.color }}>{meta.rune} {meta.label}</span><button aria-label={`${course.name}をお気に入り`}>♡</button></div>
                    <h3>{course.name}</h3>
                    <p>{outsideTimetable ? "時間割外で履修" : `${course.location} ・ ${course.day}${course.period ? `${course.period}限` : "・時限未定"}`}</p>
                    <div className="course-category">{course.unitCategory}{course.recommendedGrade ? ` ・ ${course.recommendedGrade}年向け` : ""}{isRetake ? " ・ 再履修" : isLowerGrade ? " ・ 上級年次でも履修可" : ""}{parallelCourse ? " ・ 同列クラス登録済み" : ""}</div>
                    <div className="course-meta"><span>💎 {course.credits}単位</span><span>📜 {formatTermLabel(course.term)}</span></div>
                    <div className="course-actions">
                      <button type="button" className="course-detail-button" onClick={() => setDetailCourse(course)}>⌖ 詳しく</button>
                      <button type="button" disabled={Boolean(parallelCourse) || (outsideTimetable && selected)} className={`register-quest ${selected ? "selected" : ""}`} onClick={() => toggleRegistration(course)}>{selected ? outsideTimetable ? "✓ 時間割外で自動登録済み" : "✓ 時間割に登録済み" : parallelCourse ? `同列「${parallelCourse.name}」を登録済み` : "＋ クエストを受注"}</button>
                    </div>
                  </article>;
                })}
              </div>
              {results.length > 8 && <button className="more-button" onClick={() => setShowAllResults((current) => !current)}>{showAllResults ? "表示を戻す" : `残り${results.length - 8}件を見る`}</button>}
            </section>

            <aside className="panel guide-panel">
              <div className="guide-head"><span className="guide-avatar"><img src="/characters/genius-sage-v3.svg?v=20260807-3" alt="案内役の天才賢者" /></span><div><small>案内役</small><h2>賢者に聞く</h2></div></div>
              <p className="guide-intro">履修・単位・装備について、冒険のヒントをお伝えします。</p>
              <div className="chat-log" aria-live="polite">
                {messages.length === 0 && <div className="message bot">困ったときは、ここで質問してくださいね。</div>}
                {messages.slice(-5).map((message, index) => <div className={`message ${message.role}`} key={`${message.role}-${index}`}>{message.text}</div>)}
              </div>
              <div className="quick-questions">{quickQuestions.map((question) => <button key={question} onClick={() => ask(question)}>{question}</button>)}</div>
              <form className="chat-form" onSubmit={(event) => { event.preventDefault(); ask(chatInput); }}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="質問を入力…" aria-label="賢者への質問" /><button aria-label="送信">➤</button></form>
            </aside>
          </div>

          <section className="panel timetable-panel" id="timetable">
            <div className="section-heading"><div><span className="eyebrow">WEEKLY MAP</span><h2>冒険の時間割</h2></div><button className="text-button danger" onClick={() => {
              setRegistered((current) => current.filter((id) => {
                const course = courses.find((item) => item.id === id);
                return !course || !courseIsInTermGroup(course, activeTimetableGroup) || isOutsideTimetableCourse(course);
              }));
              setNotice(`${termGroupLabel[activeTimetableGroup]}の通常時間割を空にしました。時間割外の必修は保持しています`);
            }}>通常授業をすべて外す</button></div>
            <div className="term-tabs" role="tablist" aria-label="時間割のターム切替">
              {(["first", "second"] as TermGroup[]).map((group) => {
                const groupCourses = selectedCourses.filter((course) => courseIsInTermGroup(course, group));
                const groupCourseClasses = uniqueCourseClasses(groupCourses);
                return <button key={group} role="tab" aria-selected={activeTimetableGroup === group} className={activeTimetableGroup === group ? "active" : ""} onClick={() => setActiveTimetableGroup(group)}><strong>{termGroupLabel[group]}</strong><span>{groupCourseClasses.length}科目・{groupCourseClasses.reduce((sum, course) => sum + course.credits, 0)}単位</span></button>;
              })}
            </div>
            {(grade === 4 || outsideTimetableCourses.length > 0) && <div className="outside-timetable-courses"><div><span>REQUIRED・OUTSIDE TIMETABLE</span><strong>時間割外の4年次必修</strong><small>曜日・時限には配置せず、学期末の単位奉納には含まれます。</small></div>{outsideTimetableCourses.length > 0 ? <div>{outsideTimetableCourses.map((course) => <article key={course.id}><b>✓ 自動登録済み</b><strong>{course.name}</strong><span>{formatTermLabel(course.term)}・{course.credits}単位・{course.unitCategory}</span></article>)}</div> : <p>このタームの時間割外必修は修得済みです。</p>}</div>}
            <div className="timetable-wrap"><div className="timetable">
              <div className="corner">時限</div>{weekdays.map((day) => <div className="weekday-cell" key={day}>{day}</div>)}
              {periods.map((period) => <div className="period-row" key={period.no}>
                <div className="time-cell"><strong>{period.no}限</strong><span>{period.time}</span></div>
                {weekdays.map((day) => <div className="schedule-cell" key={`${day}-${period.no}`}>{scheduledTimetableCourses.filter((course) => course.day === day && course.period === period.no && !concentratedCourses.includes(course)).map((course) => <button className="course-chip" key={course.id} style={{ background: requirementMeta[course.requirement].soft, borderColor: requirementMeta[course.requirement].color }} onClick={() => toggleRegistration(course)} title="クリックで登録解除"><strong>{course.name}</strong><small>{formatTermLabel(course.term)}・{course.credits}単位</small></button>)}</div>)}
              </div>)}
            </div></div>
            <div className="concentrated-courses"><strong>{activeTimetableGroup === "first" ? "前期" : "後期"}集中・時限未定</strong>{concentratedCourses.length > 0 ? <div>{concentratedCourses.map((course) => <button key={course.id} onClick={() => toggleRegistration(course)}><span>{course.name}</span><small>{formatTermLabel(course.term)}・{course.credits}単位 ×</small></button>)}</div> : <p>登録されている科目はありません</p>}</div>
          </section>

          <section className="panel equipment-panel" id="equipment">
            <div className="section-heading"><div><span className="eyebrow">RELIC COLLECTION</span><h2>獲得装備</h2></div><span className="collection-count">{equipment.length} / {equipmentCatalog.length}</span></div>
            <div className="equipment-grid">{equipmentCatalog.map((item) => {
              const unlocked = equipment.includes(item.id);
              return <article className={unlocked ? "unlocked" : "locked"} key={item.id}><span className="equipment-icon">{unlocked ? item.icon : "?"}</span><div><small>{unlocked ? "獲得済み" : "未解放"}</small><h3>{item.name}</h3><p>{item.note}</p></div></article>;
            })}</div>
          </section>

          <section className="panel contact-panel" id="contact" aria-labelledby="contact-title">
            <div className="contact-emblem" aria-hidden="true"><span>✉</span><i>✦</i></div>
            <div className="contact-copy"><span className="eyebrow">MESSAGES ACROSS THE REALMS</span><h2 id="contact-title">異国の勇者からの伝書</h2><p>冒険の途中で見つけた不具合、ほしい機能、賢者への意見を伝書に託してください。届いた声は、まなプラン王国の次のアップデートに役立てます。</p><small>Googleフォームが新しいタブで開きます。回答者にフォームの編集権限は必要ありません。</small></div>
            <a className="contact-form-link" href={CONTACT_FORM_URL} target="_blank" rel="noopener noreferrer"><span>伝書をしたためる</span><b>お問い合わせフォームへ ↗</b></a>
          </section>
        </div>
      </div>

      {detailCourse && <div className="modal-layer course-detail-layer" role="dialog" aria-modal="true" aria-labelledby="course-detail-title" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setDetailCourse(null);
      }}>
        <article className="course-detail-modal">
          <button type="button" className="modal-close" onClick={() => setDetailCourse(null)} aria-label="授業詳細を閉じる">×</button>
          <header className="course-detail-header">
            <span className="course-detail-rune" style={{ background: requirementMeta[detailCourse.requirement].soft, color: requirementMeta[detailCourse.requirement].color }}>{requirementMeta[detailCourse.requirement].rune}</span>
            <div><small>COURSE DETAIL</small><h2 id="course-detail-title">{detailCourse.name}</h2><p>{detailCourse.unitCategory}</p></div>
          </header>
          <div className="course-detail-facts">
            <div><span>教室</span><strong>{detailIsOutsideTimetable ? "時間割外（自動登録）" : detailCourse.location}</strong></div>
            <div><span>開講</span><strong>{detailIsOutsideTimetable ? `${formatTermLabel(detailCourse.term)}・曜日／時限なし` : `${formatTermLabel(detailCourse.term)}・${detailCourse.day}${detailCourse.period ? `${detailCourse.period}限` : "集中・時限未定"}`}</strong></div>
            <div><span>単位</span><strong>{detailCourse.credits}単位</strong></div>
            <div><span>区分</span><strong>{requirementMeta[detailCourse.requirement].label}</strong></div>
          </div>
          <section className="campus-map-section">
            <div className="campus-map-heading">
              <div><small>CAMPUS MAP</small><h3>教室までの場所</h3></div>
              <span>{detailMaps.length ? `${detailMaps.length}件` : "地図なし"}</span>
            </div>
            {detailMaps.length ? <div className="campus-map-grid">
              {detailMaps.map((map) => <figure className="campus-map-card" key={map.key}>
                <figcaption><strong>{map.label}</strong><small>CSV表記：{detailCourse.location}</small></figcaption>
                <a href={map.image} target="_blank" rel="noreferrer" aria-label={`${map.label}の地図を拡大表示`}>
                  <img src={map.image} alt={`${map.label}の位置を丸で示したキャンパスマップ`} loading="lazy" />
                  <span>タップして拡大 ↗</span>
                </a>
              </figure>)}
            </div> : <div className="map-empty"><span>⌖</span><div><strong>対応する地図はありません</strong><p>「各研究室」など場所が固定されていない授業は、担当教員の案内を確認してください。</p></div></div>}
          </section>
          <footer className="course-detail-footer">
            {detailSyllabusUrl && <a className="syllabus-link" href={detailSyllabusUrl} target="_blank" rel="noopener noreferrer">大学シラバスで詳細を見る <span>↗</span></a>}
            <button type="button" disabled={Boolean(detailParallelCourse) || (detailIsOutsideTimetable && registrationIdsForCourse(detailCourse).some((id) => registered.includes(id)))} className={`register-quest ${registrationIdsForCourse(detailCourse).some((id) => registered.includes(id)) ? "selected" : ""}`} onClick={() => toggleRegistration(detailCourse)}>{registrationIdsForCourse(detailCourse).some((id) => registered.includes(id)) ? detailIsOutsideTimetable ? "✓ 時間割外で自動登録済み" : "✓ 時間割に登録済み" : detailParallelCourse ? `同列「${detailParallelCourse.name}」を登録済み` : "＋ このクエストを受注"}</button>
          </footer>
        </article>
      </div>}

      {onboardingStep !== "done" && <div className="modal-layer onboarding-layer" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="onboarding-card">
          <div className="onboarding-art"><span>🧭</span><small>ADVENTURE SETUP</small></div>
          {onboardingStep === "grade" ? <>
            <span className="step-chip">STEP 1</span><h2 id="onboarding-title">あなたは何年生ですか？</h2><p>学年に合わせて、卒業までの冒険マップを準備します。</p>
            <div className="grade-grid">{[1, 2, 3, 4].map((value) => <button key={value} onClick={() => chooseGrade(value)}><strong>{value}</strong><span>年生</span><small>{value === 1 ? "新しい冒険を始める" : "これまでの単位を登録"}</small></button>)}</div>
          </> : onboardingStep === "course" ? <>
            <button className="back-button" onClick={() => setOnboardingStep("grade")}>← 学年を選び直す</button><span className="step-chip">STEP 2 / 4</span><h2 id="onboarding-title">3年次のコースを選んでください</h2><p>2年後期を終えて3年1〜2タームへ進むと、専門科目の最低単位数がコース別に変わります。</p>
            <div className="course-choice-grid">{(Object.keys(studyCourseLabels) as StudyCourse[]).map((value) => <button type="button" key={value} onClick={() => chooseStudyCourse(value)}><span>{value === "information" ? "1" : "2"}</span><strong>{studyCourseLabels[value]}</strong><small>{value === "information" ? "情報工学基礎13・情報工学専門16単位以上" : "DS基礎12・DS専門22単位以上"}</small></button>)}</div>
          </> : onboardingStep === "term" ? <>
            <button className="back-button" onClick={() => setOnboardingStep(grade !== null && grade >= 3 ? "course" : "grade")}>← {grade !== null && grade >= 3 ? "コース" : "学年"}を選び直す</button><span className="step-chip">STEP {grade !== null && grade >= 3 ? "3 / 4" : `2 / ${grade === 1 ? 2 : 3}`}</span><h2 id="onboarding-title">現在のタームはどちらですか？</h2><p>挑戦タームを選ぶと、同じ学年の1〜2・4〜5ターム両方へ必修を自動登録します。3年生以上は選択したコースの必修も対象です。</p>
            <div className="battle-term-choice onboarding-term-choice">{(["first", "second"] as TermGroup[]).map((group) => { const boss = bossFor(grade ?? 1, group); return <button type="button" className={`boss-choice-grade-${boss.grade} boss-choice-term-${boss.termGroup}`} key={group} onClick={() => chooseAdventureTerm(group)}><img src={boss.image} alt={`${boss.name}の姿`} /><span><strong>{termGroupLabel[group]}</strong><small>{boss.title}</small><b>{boss.name}</b><em>{boss.threat}</em></span></button>; })}</div>
          </> : <>
            <button className="back-button" onClick={() => setOnboardingStep("term")}>← タームを選び直す</button><span className="step-chip">STEP {grade !== null && grade >= 3 ? "4 / 4" : "3 / 3"}</span><h2 id="onboarding-title">これまでに修得した授業を選んでください</h2><p>今の学年・タームより前に履修できた授業を、普遍教育と専門科目の区分ごとに表示しています。同列授業は修得した1クラスだけ選べます。</p>
            <form onSubmit={finishPriorCredits} className="prior-course-form">
              <div className="prior-course-search"><span>⌕</span><input type="search" value={priorCourseSearch} onChange={(event) => setPriorCourseSearch(event.target.value)} placeholder="授業名・授業コード・単位区分で検索" aria-label="過去の履修科目を検索" /></div>
              <PriorCourseChecklist courseOptions={priorCourseOptions} selectedKeys={priorCompletedCourseKeys} onToggle={togglePriorCompletedCourse} />
              <div className="entry-total"><span>選択した修得済み科目</span><strong>{priorSelectedCourses.length}科目・{sumLedger(priorFields)} 単位</strong><small>卒業まであと {Math.max(GRADUATION_CREDITS - sumLedger(priorFields), 0)} 単位。科目ごとの単位数を重複なしで集計します。</small></div>
              <button className="primary-button wide" type="submit">冒険マップを作成する</button>
            </form>
          </>}
        </div>
      </div>}

      {coursePromptOpen && <div className="modal-layer compact-layer" role="dialog" aria-modal="true" aria-labelledby="course-prompt-title">
        <div className="event-popup course-prompt"><span className="event-kicker">COURSE SELECTION</span><h2 id="course-prompt-title">3年次のコースを選択</h2><p>2年後期を突破しました。選んだコースの必修科目と木曜3〜5限のプロジェクト研究を時間割へ自動登録します。</p><div>{(Object.keys(studyCourseLabels) as StudyCourse[]).map((value) => <button type="button" className="primary-button wide" key={value} onClick={() => { applyStudyCourse(value); setCoursePromptOpen(false); }}>{studyCourseLabels[value]}</button>)}</div></div>
      </div>}

      {termPromptOpen && <div className="modal-layer compact-layer" role="dialog" aria-modal="true" aria-labelledby="term-prompt-title">
        <div className="event-popup"><button className="modal-close" onClick={() => setTermPromptOpen(false)} aria-label="閉じる">×</button><img className="event-boss-thumb" src={currentBoss.image} alt="" /><span className="event-kicker">{grade ?? 1}年生・{termGroupLabel[adventureTermGroup]}の学期末イベント</span><h2 id="term-prompt-title">「{currentBoss.name}」へ<br />挑戦しますか？</h2><p>弱点武器があれば確定勝利。GPAが高いほど必殺技と討伐演出が豪華になります。</p><button className="primary-button wide" onClick={openOffering}>確定したので登録する</button><button className="secondary-button" onClick={() => setTermPromptOpen(false)}>まだ確定していない</button></div>
      </div>}

      {offeringOpen && <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="offering-title">
        <form className="offering-modal" onSubmit={prepareBattle}><button type="button" className="modal-close" onClick={() => setOfferingOpen(false)} aria-label="閉じる">×</button><div className="altar-icon">🏆</div><span className="event-kicker">SEMESTER RESULT</span><h2 id="offering-title">学期の成果を奉納する</h2><p>各授業の評語をS・A・B・C・不可から選んでください。合格単位、再履修リスト、GPAを同じ成績データから自動計算します。</p>
          <div className="progress-lock">🔒 ボスは冒険の進行順で固定されます。勝利すると次のタームへ進みます。</div>
          <div className="battle-term-choice" role="group" aria-label="ボス戦の対象学期">{(["first", "second"] as TermGroup[]).map((group) => { const boss = bossFor(grade ?? 1, group); const isCurrent = offeringTermGroup === group; return <button type="button" disabled={!isCurrent} className={`${isCurrent ? "active" : "locked"} boss-choice-grade-${boss.grade} boss-choice-term-${boss.termGroup}`} key={group}><strong>{termGroupLabel[group]}{isCurrent ? "・現在の挑戦" : "・未解放"}</strong><span><img className="boss-token" src={boss.image} alt="" />{boss.name}</span><small>{boss.threat}</small></button>; })}</div>
          <div className="auto-gpa-card"><div><span>自動計算GPA</span><strong>{offeringGpa.toFixed(2)}</strong></div><p>（評点×単位数）の合計 {offeringGradePointTotal} ÷ 成績入力済み {offeringGradedCredits}単位</p><small>不可も履修した単位として分母に含め、評点0で計算します。</small></div>
          <div className="semester-credit-cap"><div><span>時間割から算出した登録上限</span><strong>{plannedSemesterCredits} 単位</strong></div><p>{unitCategories.filter((category) => (semesterCreditLimits[category] || 0) > 0).map((category) => <span key={category}>{category} <b>{semesterCreditLimits[category]}</b></span>)}</p><div className="bulk-grade-actions"><span>全科目を一括設定</span>{academicGradeOptions.map((option) => <button type="button" className={`grade-${option.value.toLowerCase()}`} key={option.value} onClick={() => setOfferingGrades(Object.fromEntries(offeringCourses.map((course) => [courseClassKey(course), option.value])))}>{option.label}</button>)}</div></div>
          <div className="offering-course-results">{offeringCourses.map((course) => {
            const key = courseClassKey(course);
            const result = offeringGrades[key];
            const rows = selectedCourses.filter((row) => courseClassKey(row) === key && courseIsInTermGroup(row, adventureTermGroup));
            const periodsLabel = Array.from(new Set(rows.map((row) => row.period).filter((period): period is number => period !== null))).sort().join("・");
            return <article className={`${result && result !== "F" ? "acquired" : result === "F" ? "not-acquired" : "ungraded"}`} key={key}>
              <div className="offering-course-copy"><span><strong>{course.name}</strong><small>{formatTermLabel(course.term)}・{course.day}{periodsLabel ? `${periodsLabel}限` : "時限未定"}・{course.unitCategory}</small></span><b>{course.credits}単位{result === "F" ? "・再履修へ" : result ? "・修得" : "・未選択"}</b></div>
              <div className="course-grade-options" role="group" aria-label={`${course.name}の成績`}>{academicGradeOptions.map((option) => <button type="button" className={`${result === option.value ? "active" : ""} grade-${option.value.toLowerCase()}`} aria-pressed={result === option.value} title={option.note} key={option.value} onClick={() => setOfferingGrades((current) => ({ ...current, [key]: option.value }))}><strong>{option.label}</strong><small>{option.note}</small></button>)}</div>
            </article>;
          })}</div>
          <div className="offering-total"><span>合格単位 / 履修単位</span><strong>{sumLedger(offeringFields)} / {plannedSemesterCredits} 単位</strong></div><button className="primary-button wide" type="submit" disabled={plannedSemesterCredits <= 0 || !offeringAllGraded}>{offeringAllGraded ? "成績を奉納してボス戦へ ⚔" : `未入力 ${offeringCourses.filter((course) => !offeringGrades[courseClassKey(course)]).length}科目`}</button>
        </form>
      </div>}

      {battle && <div className="modal-layer battle-layer" role="dialog" aria-modal="true" aria-labelledby="battle-title">
        <div className={`battle-modal ${battle.resolved ? "resolved" : ""} ${battle.resolved ? (retentionGameOver ? "game-over" : battle.outcome.victory ? "victory" : "defeat") : ""} effect-${battle.outcome.effectLevel} boss-grade-${battle.boss.grade} boss-term-${battle.boss.termGroup}`}>
          <div className="battle-flash" /><div className="battle-sky"><BossVisual boss={battle.boss} /><span className="battle-hero"><img src="/characters/student-hero.svg?v=20260807-2" alt="自分の学生冒険者" /></span>{battle.resolved && !battle.outcome.victory && !retentionGameOver && <><span className="genius-sage" aria-hidden="true"><img src="/characters/genius-sage-v3.svg?v=20260807-3" alt="" /></span><i className="sage-slash" aria-hidden="true">✦</i></>}<span className="gpa-aura" aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i><i>✧</i><i>✦</i><i>✧</i><i>✦</i><i>✧</i></span><i className="slash">✦</i><span className="battle-threat">{battle.boss.threat}</span></div><span className="event-kicker">{battle.boss.title}・BOSS BATTLE</span><h2 id="battle-title">{battle.boss.name}</h2>
          {!battle.resolved ? <><p className="boss-quote">「貴様の半年間を見せてみろ！」</p><div className="battle-checks"><div><span>今学期GPA</span><strong>{battle.gpa.toFixed(2)}・演出{battle.outcome.effectRank}</strong></div><div><span>弱点武器を確認</span><strong>{battle.outcome.effectiveWeapon ? `${battle.outcome.effectiveWeapon.icon} ${battle.outcome.effectiveWeapon.name}――確定勝利！` : "有効な武器なし"}</strong></div><small>{battle.outcome.victoryByWeapon ? "勝利保証：弱点武器がボス攻略を確定（GPAは演出へ反映）" : `勝利条件：有効武器なしのためGPA ${battle.outcome.requiredGpa.toFixed(1)}以上`}</small></div><div className="special-prompt">{battle.outcome.specialMove}</div><button className="primary-button wide battle-button" onClick={resolveBattle}>必殺技を放つ！</button></> : retentionGameOver ? <><div className="game-over-title">GAME OVER</div><div className="battle-result retention-result"><strong>進級の門は閉ざされた</strong><span>2年後期終了時の累計：{Math.min(battle.beforeCredits + battle.semesterCredits, GRADUATION_CREDITS)}単位</span><span>進級には65単位を超える必要があります。あと{Math.max(66 - (battle.beforeCredits + battle.semesterCredits), 0)}単位必要です。</span><span>2年1〜2タームから冒険をやり直します。</span></div><button className="game-over-button wide" onClick={closeBattle}>2年1〜2タームから再出発</button></> : battle.outcome.victory ? <><div className="special-move-name">{battle.outcome.specialMove}</div><div className="damage-number">{battle.outcome.damage.toLocaleString()} <small>DAMAGE</small></div><div className="finish-label">{battle.outcome.finishLabel}</div><div className="battle-result victory-result"><strong>{battle.boss.name}を粉砕しました</strong><span>{battle.outcome.victoryByWeapon ? `${battle.outcome.effectiveWeapon?.name}が弱点を貫通して確定勝利！` : `GPA ${battle.gpa.toFixed(2)}の地力で撃破！`}</span><span>GPA {battle.gpa.toFixed(2)}・演出ランク「{battle.outcome.effectRank}」</span><span>修得済み単位：{Math.min(battle.beforeCredits + battle.semesterCredits, GRADUATION_CREDITS)}単位</span><span>{battle.boss.termGroup === "first" ? `次は${termGroupLabel.second}の「${bossFor(battle.boss.grade, "second").name}」へ進みます。` : battle.boss.grade < 4 ? `次は${battle.boss.grade + 1}年生の「${bossFor(battle.boss.grade + 1, "first").name}」へ進みます。` : graduation.complete ? "すべての学期ボスを撃破し、卒業要件も達成しました！" : `全ボス撃破。ただし卒業要件は未達成です（不足${unmetGraduationChecks.length}項目）。`}</span></div>{battle.rewards.length > 0 && <div className="reward-reveal"><small>NEW EQUIPMENT</small><div>{battle.rewards.map((reward) => <span key={reward.id}>{reward.icon} {reward.name}</span>)}</div></div>}<button className="primary-button wide" onClick={closeBattle}>{battle.boss.termGroup === "first" ? `${termGroupLabel.second}へ進む` : battle.boss.grade < 4 ? `${battle.boss.grade + 1}年生へ進む` : graduation.complete ? "卒業する" : "卒業要件を確認"}</button></> : <><div className="damage-number zero">0 <small>DAMAGE</small></div><div className="enemy-counter">敵の反撃！<strong>999,999 DAMAGE</strong></div><div className="battle-result defeat-result rescue-result"><strong>画面が闇に沈んだ――</strong><span>あなたが倒れ、ボスが勝ち誇ったその瞬間。</span><div className="sage-card"><b><img src="/characters/genius-sage-v3.svg?v=20260807-3" alt="謎の天才賢者" /></b><p><em>謎の天才賢者</em>「ここは私が片づけよう。」</p></div><span className="sage-finish">天才賢者の一撃！ {battle.boss.name}は跡形もなく消滅した。</span><span>あなたの修得単位は記録され、賢者が次への道を開きました。</span></div>{battle.rewards.length > 0 && <div className="reward-reveal"><small>NEW EQUIPMENT</small><div>{battle.rewards.map((reward) => <span key={reward.id}>{reward.icon} {reward.name}</span>)}</div></div>}<button className="sage-button wide" onClick={closeBattle}>{battle.boss.termGroup === "first" ? `${termGroupLabel.second}へ進む` : battle.boss.grade < 4 ? `${battle.boss.grade + 1}年生へ進む` : graduation.complete ? "卒業する" : "卒業要件を確認"}</button></>}
        </div>
      </div>}

      {graduationClearOpen && <div className="graduation-clear-layer" role="dialog" aria-modal="true" aria-labelledby="graduation-clear-title">
        <div className="graduation-rays" aria-hidden="true" />
        <div className="graduation-confetti" aria-hidden="true">{Array.from({ length: 48 }, (_, index) => <i key={index} style={{ left: `${(index * 37) % 100}%`, animationDelay: `${-((index % 12) * .19)}s`, "--confetti-hue": `${(index * 47) % 360}` } as React.CSSProperties} />)}</div>
        <div className="graduation-clear-card">
          <div className="clear-stars" aria-hidden="true"><i>✦</i><i>✧</i><i>★</i><i>✧</i><i>✦</i></div>
          <div className="graduation-seal" aria-hidden="true">卒</div>
          <span className="clear-kicker">ALL SEMESTER BOSSES DEFEATED</span>
          <div className="clear-title"><span>QUEST</span><strong>CLEAR</strong></div>
          <h2 id="graduation-clear-title">卒業おめでとう！</h2>
          <p>130単位、すべての必修授業、普遍教育・専門科目の内訳を達成しました。4年間の冒険は堂々の完全クリアです。</p>
          <div className="clear-stats"><span><small>取得単位</small><b>{graduation.totalCredits}</b></span><span><small>撃破ボス</small><b>8</b></span><span><small>称号</small><b>卒業勇者</b></span></div>
          <button type="button" onClick={() => setGraduationClearOpen(false)}>エンディングを閉じる</button>
        </div>
      </div>}

      {notice && <button className="toast" onClick={() => setNotice("")} aria-live="polite">{notice}<span>×</span></button>}
    </main>
  );
}

function PriorCourseChecklist({ courseOptions, selectedKeys, onToggle }: {
  courseOptions: Course[];
  selectedKeys: string[];
  onToggle: (course: Course) => void;
}) {
  const sections = [
    { key: "universal" as const, title: "普遍教育科目", subtitle: "語学・国際・地域・教養・数理データサイエンス" },
    { key: "professional" as const, title: "専門科目", subtitle: "共通専門基礎・各コース基礎・専門科目" },
  ];

  if (courseOptions.length === 0) return <div className="prior-course-empty">条件に一致する過去の授業はありません。</div>;

  return <div className="prior-course-checklist">{sections.map((section) => {
    const sectionCourses = courseOptions.filter((course) => educationGroupForCourse(course) === section.key);
    if (sectionCourses.length === 0) return null;
    const selectedSectionCount = sectionCourses.filter((course) => selectedKeys.includes(courseClassKey(course))).length;
    const categories = unitCategories.filter((category) => sectionCourses.some((course) => creditCategoryForCourse(course) === category));
    return <section className={`prior-education-section ${section.key}`} key={section.key}>
      <header><div><span>{section.key === "universal" ? "UNIVERSAL QUESTS" : "PROFESSIONAL QUESTS"}</span><h3>{section.title}</h3><p>{section.subtitle}</p></div><strong>{selectedSectionCount} / {sectionCourses.length}科目</strong></header>
      <div className="prior-category-list">{categories.map((category, categoryIndex) => {
        const categoryCourses = sectionCourses.filter((course) => creditCategoryForCourse(course) === category);
        const selectedCategoryCourses = categoryCourses.filter((course) => selectedKeys.includes(courseClassKey(course)));
        const selectedCredits = selectedCategoryCourses.reduce((sum, course) => sum + course.credits, 0);
        return <details key={category} open={categoryIndex === 0 || selectedCategoryCourses.length > 0}>
          <summary><span><i>{iconForCategory(category)}</i><b>{category}</b></span><em>{selectedCategoryCourses.length}科目・{selectedCredits}単位</em></summary>
          <div className="prior-course-grid">{categoryCourses.map((course) => {
            const key = courseClassKey(course);
            const selected = selectedKeys.includes(key);
            const parallelSelected = courseOptions.find((candidate) => selectedKeys.includes(courseClassKey(candidate))
              && courseFamilyKey(candidate) === courseFamilyKey(course)
              && courseClassKey(candidate) !== key);
            return <label className={`${selected ? "selected" : ""} ${parallelSelected ? "parallel-selected" : ""}`} key={key}>
              <input type="checkbox" checked={selected} onChange={() => onToggle(course)} />
              <span><strong>{course.name}</strong><small>{course.classCode || "授業コードなし"}・{formatTermLabel(course.term)}・{course.location || "教室未定"}</small></span>
              <b>{parallelSelected ? "同列を入替" : `${course.credits}単位`}</b>
            </label>;
          })}</div>
        </details>;
      })}</div>
    </section>;
  })}</div>;
}

function RequirementList({ checks }: { checks: ReturnType<typeof evaluateGraduation>["universalChecks"] }) {
  return <div className="requirement-list">{checks.map((check) => <div className={check.met ? "met" : "pending"} key={check.id}><span>{check.met ? "✓" : "○"}</span><div><strong>{check.label}</strong>{check.note && <small>{check.note}</small>}</div><b>{check.current} / {check.target}</b></div>)}</div>;
}

function BossVisual({ boss }: { boss: SemesterBoss }) {
  return <div className={`battle-boss boss-visual boss-grade-${boss.grade} boss-term-${boss.termGroup}`}>
    <img src={boss.image} alt={`${boss.name}の姿`} />
    <span className="boss-image-vignette" aria-hidden="true" />
  </div>;
}

function iconForCategory(category: string) {
  if (category === "英語") return "🪄";
  if (category.includes("情報工学")) return "⚡";
  if (category.includes("データサイエンス")) return "🔮";
  if (category.includes("専門")) return "🔱";
  if (category.includes("地域")) return "🏹";
  if (category.includes("コア")) return "⚔️";
  return "📚";
}
