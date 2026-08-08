import {
  courseIsInTermGroup,
  courses,
  coursesConflict,
  formatTermLabel,
  unitCategories,
  type Course,
  type RequirementType,
  type TermGroup,
} from "@/data/syllabus";
import { bossFor, equipmentCatalog } from "@/features/battle/semesterBattle";
import { studyCourseLabels, type StudyCourse } from "@/features/credits/graduationRequirements";

export type AdviserContext = {
  grade: number;
  termGroup: TermGroup;
  completedCredits: number;
  remainingCredits: number;
  registeredCourses: Course[];
  studyCourse: StudyCourse | null;
  conversation?: string[];
};

const requirementLabels: Record<RequirementType, string> = {
  required: "必修",
  selectRequired: "選択必修",
  informationRequired: "情報工学必修",
  dataScienceRequired: "DS必修",
  elective: "その他",
  unknown: "必修区分未設定",
};

const normalize = (value: string) => value
  .normalize("NFKC")
  .replace(/ウェブ/g, "web")
  .replace(/[\s　「」『』"'、。！？!?・,，.．:：;；()（）［］【】]/g, "")
  .toLowerCase();

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const editDistance = (left: string, right: string) => {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
};

const distanceWithinText = (courseName: string, question: string) => {
  let best = Number.POSITIVE_INFINITY;
  const shortest = Math.max(3, courseName.length - 2);
  const longest = Math.min(question.length, courseName.length + 2);
  for (let length = shortest; length <= longest; length++) {
    for (let start = 0; start + length <= question.length; start++) {
      best = Math.min(best, editDistance(courseName, question.slice(start, start + length)));
    }
  }
  return best;
};

const scheduleFor = (course: Course) => {
  const period = course.period === null ? "時限未定" : `${course.period}限`;
  return `${formatTermLabel(course.term)}・${course.day}曜${period}`;
};

const listCourses = (items: Course[], heading: string) => {
  const uniqueCourses = Array.from(new Map(items.map((course) => [course.classCode || `${course.name}-${course.term}-${course.day}-${course.period}`, course])).values());
  if (uniqueCourses.length === 0) return `${heading}は見つかりませんでした。`;
  const shown = uniqueCourses.slice(0, 10).map((course) => `・${course.name}（${scheduleFor(course)}・${course.credits}単位）`).join("\n");
  const prefix = `${heading}は${uniqueCourses.length}件あります。`;
  const suffix = uniqueCourses.length > 10 ? "\n先頭10件を表示しました。曜日、時限、タームなどを追加すると絞り込めます。" : "";
  return `${prefix}\n${shown}${suffix}`;
};

const mentionedCourseRows = (question: string) => {
  const normalizedQuestion = normalize(question);
  const names = unique(courses.map((course) => course.name)).sort((left, right) => right.length - left.length);
  const name = names.find((courseName) => normalizedQuestion.includes(normalize(courseName)));
  if (name) return courses.filter((course) => course.name === name);

  const fuzzyMatches = names
    .map((courseName) => ({ courseName, normalizedName: normalize(courseName) }))
    .filter(({ normalizedName }) => normalizedName.length >= 5 && normalizedQuestion.length >= 3)
    .map(({ courseName, normalizedName }) => ({ courseName, distance: distanceWithinText(normalizedName, normalizedQuestion) }))
    .sort((left, right) => left.distance - right.distance);
  const best = fuzzyMatches[0];
  const runnerUp = fuzzyMatches[1];
  if (!best || best.distance > 2 || (runnerUp && runnerUp.distance === best.distance)) return [];
  return courses.filter((course) => course.name === best.courseName);
};

const answerCourseQuestion = (question: string, rows: Course[]) => {
  const name = rows[0].name;
  const schedules = unique(rows.map(scheduleFor));
  const terms = unique(rows.map((course) => formatTermLabel(course.term)));
  const credits = unique(rows.map((course) => String(course.credits)));
  const locations = unique(rows.map((course) => course.location || "未定"));
  const requirements = unique(rows.map((course) => requirementLabels[course.requirement]));
  const categories = unique(rows.map((course) => course.unitCategory));
  const grades = unique(rows.map((course) => course.recommendedGrade ? `${course.recommendedGrade}年` : "対象学年未設定"));
  const classCodes = unique(rows.map((course) => course.classCode || "未設定"));
  const numberingCodes = unique(rows.map((course) => course.numberingCode || "未設定"));

  if (/担当教員|誰が教え|授業内容|何を学|成績評価|配点|欠席|出席条件|教科書|教材|定員|抽選|履修条件|休講|教室変更|オンデマンド/.test(question)) return `「${name}」について、その情報はこの案内では確認できません。大学シラバスや最新のお知らせを確認してください。`;

  const details: string[] = [];
  if (/何曜|何限|いつ|時間|曜日|時限/.test(question)) details.push(`${schedules.join("、")}に開講`);
  if (/ターム/.test(question)) details.push(`開講時期は${terms.join("、")}`);
  if (/何単位|単位数|単位は|単位と|単位、/.test(question)) details.push(`${credits.join("または")}単位`);
  if (/教室|授業場所|どこ|場所/.test(question)) details.push(locations.every((location) => location === "未定") ? "授業場所は未登録（大学シラバスを確認してください）" : `授業場所は${locations.join("、")}`);
  if (/必修/.test(question)) details.push(`必修区分は${requirements.join("、")}`);
  if (/科目区分|どの区分|単位区分/.test(question)) details.push(`科目区分は「${categories.join("、")}」`);
  if (/何年|対象学年|年生向け/.test(question)) details.push(`対象学年は${grades.join("、")}`);
  if (/授業コード|class\s*code/i.test(question)) details.push(`Class Codeは${classCodes.join("、")}`);
  if (/ナンバリング|numbering\s*code/i.test(question)) details.push(`Numbering Codeは${numberingCodes.join("、")}`);
  if (details.length > 0) return `「${name}」は、${details.join("、")}です。`;

  return `「${name}」は${grades.join("、")}向けで、${schedules.join("、")}に開講されます。授業場所は${locations.join("、")}、${credits.join("または")}単位、必修区分は${requirements.join("、")}、科目区分は「${categories.join("、")}」です。`;
};

const answerPartialCourseSearch = (question: string) => {
  const quoted = question.match(/[「『"]([^」』"]+)[」』"]/u)?.[1]?.trim();
  if (!quoted) return null;
  const keyword = normalize(quoted);
  const matches = courses.filter((course) => normalize(course.name).includes(keyword));
  if (matches.length === 0) return `「${quoted}」に一致する授業は見つかりませんでした。授業名の一部や表記を確認して、もう一度質問してください。`;
  return listCourses(matches, `「${quoted}」に部分一致する授業`);
};

const answerFilteredCourseSearch = (question: string, context: AdviserContext) => {
  let matches = courses;
  const conditions: string[] = [];
  const weekday = question.match(/([月火水木金土])曜/)?.[1];
  const period = question.match(/([1-5])限/)?.[1];
  const singleTerm = question.match(/(?<![-〜~])(10|[1245789])ターム/)?.[1];
  const firstTerm = /1[-〜~]2ターム|前期/.test(question);
  const secondTerm = /4[-〜~]5ターム|後期/.test(question);
  const currentTerm = /今学期|現在のターム|今のターム/.test(question);
  const targetGrade = question.match(/([1-4])年(?:生|向け)?/)?.[1];
  const requestedRequirement: RequirementType | null = question.includes("情報工学必修") ? "informationRequired"
    : question.includes("ds必修") ? "dataScienceRequired"
      : question.includes("選択必修") ? "selectRequired"
        : question.includes("必修") ? "required"
          : question.includes("その他") ? "elective" : null;
  const requestedCategory = unitCategories.find((category) => question.includes(normalize(category)));

  if (weekday) {
    matches = matches.filter((course) => course.day === weekday);
    conditions.push(`${weekday}曜日`);
  }
  if (period) {
    matches = matches.filter((course) => course.period === Number(period));
    conditions.push(`${period}限`);
  }
  if (singleTerm) {
    const matchingTerms = singleTerm === "1" || singleTerm === "2" ? [singleTerm, "7"] : singleTerm === "4" || singleTerm === "5" ? [singleTerm, "8"] : [singleTerm];
    matches = matches.filter((course) => matchingTerms.includes(course.term));
    conditions.push(`${singleTerm}ターム`);
  } else if (firstTerm || secondTerm || currentTerm) {
    const group: TermGroup = currentTerm ? context.termGroup : firstTerm ? "first" : "second";
    matches = matches.filter((course) => courseIsInTermGroup(course, group));
    conditions.push(group === "first" ? "1〜2ターム" : "4〜5ターム");
  }
  if (/集中講義/.test(question)) {
    matches = matches.filter((course) => course.term === "9" || course.term === "10" || course.day === "集");
    conditions.push("集中講義");
  }
  if (targetGrade) {
    matches = matches.filter((course) => course.recommendedGrade === Number(targetGrade));
    conditions.push(`${targetGrade}年生向け`);
  }
  if (requestedRequirement) {
    matches = matches.filter((course) => course.requirement === requestedRequirement);
    conditions.push(requirementLabels[requestedRequirement]);
  }
  if (requestedCategory) {
    matches = matches.filter((course) => course.unitCategory === requestedCategory);
    conditions.push(`科目区分「${requestedCategory}」`);
  }

  if (conditions.length === 0) return null;
  const asksForCourses = /授業|科目|講義|クエスト|一覧|どれ|教えて|ある|探して|候補/.test(question);
  if (!asksForCourses && conditions.length < 2) return null;
  return listCourses(matches, `${conditions.join("・")}に合う授業`);
};

export function answerAdviser(question: string, context: AdviserContext) {
  const normalized = normalize(question);
  const currentBoss = bossFor(context.grade, context.termGroup);
  if (/卒業研究|時間割外/.test(normalized)) return "4年次の卒業研究Ⅰは1〜2ターム、卒業研究Ⅱは4〜5タームの共通専門・各2単位の必修です。曜日・時限には置かず、時間割の上に「時間割外の4年次必修」として自動登録状況を表示し、学期末の単位奉納には含めます。";
  let courseRows = mentionedCourseRows(question);
  const isCourseFollowUp = /^(それ|その授業|この授業)/.test(normalized)
    || /^(何単位|何曜|何限|どこ|場所)(ですか|なの|か)?$/.test(normalized)
    || /^(必修|選択必修)(ですか|なの|か)?$/.test(normalized);
  if (courseRows.length === 0 && isCourseFollowUp) {
    const history = [...(context.conversation ?? [])].reverse();
    for (const message of history) {
      courseRows = mentionedCourseRows(message);
      if (courseRows.length > 0) break;
    }
  }
  if (courseRows.length > 0) return answerCourseQuestion(question, courseRows);

  const partialCourseAnswer = answerPartialCourseSearch(question);
  if (partialCourseAnswer) return partialCourseAnswer;

  if (/このサイト.*(できる|何)|何ができます/.test(normalized)) return "このサイトでは、授業検索、1〜2ターム・4〜5ターム別の時間割作成、単位管理ができます。学期末にはGPAと修得単位を登録し、装備の解放やボス戦に挑戦できます。";
  if (/最初から|さいしょから/.test(normalized)) return "最初の画面で「さいしょから」を選び、学年と現在のタームを登録してください。";
  if (/検索.*(どう|方法|でき)|(どう|方法).*検索/.test(normalized)) return "「授業探索」で授業名、曜日、時限、タームなどを入力して「クエストを探索」を押してください。";
  if (/必修.*(確認|どのよう|どう|自動|登録)|自動.*必修/.test(normalized)) return "学年と現在タームを選ぶと、その学年の1〜2ターム・4〜5ターム両方の必修を自動登録します。1年生は力学基礎も必修で、微積分学演習・線形代数学演習のB1／B2は4科目セットです。2年生の情報工学実験IA・IB・ICもセット、3年次は選択コースの必修とプロジェクト研究を登録します。4年次の卒業研究Ⅰ・Ⅱは曜日・時限を使わない時間割外必修として表示します。";
  if (/(授業|科目).*時間割.*(登録|追加)|時間割.*(登録|追加).*(どう|方法)/.test(normalized)) return "授業検索結果で「＋ クエストを受注」を押してください。登録後は「冒険の時間割」でタームごとに確認できます。";
  if (/時間割.*(どこ|確認)/.test(normalized)) return "画面左の「時間割」、または画面中央の「冒険の時間割」で確認できます。1〜2タームと4〜5タームはタブで切り替えられます。";
  if (/chatbot|賢者.*(何|役割)|何をしてくれ/.test(normalized)) return "私は履修を支援する賢者です。授業の曜日・時限、ターム、単位数、教室、必修区分に加え、時間割・学期末・RPG機能の使い方を案内できます。条件をいくつか組み合わせた質問や、直前の授業についての続きの質問にも対応します。";

  if (/数理.*データサイエンス.*展開.*(教養展開|回す|算入)|教養展開.*(超過|余分|数理)/.test(normalized)) return "数理データサイエンス展開科目は最低2単位です。2単位を超えて修得した分は、教養展開の5〜9単位要件へ算入できます。例：数理DS展開を4単位修得した場合、超過2単位を教養展開として扱えます。普遍教育26単位の合計では二重加算しません。";
  if (/call|writing|presentation|英語授業|英語.*自動/.test(normalized)) return "1年生の英語必修は、便宜上CALLを自動登録の対象外にしています。時間割にはWritingとPresentationを、並行クラスからそれぞれ1クラスずつ自動登録します。";
  if (/実験.*(1a|1b|1c|ia|ib|ic|セット)|情報工学実験i/.test(normalized)) return "2年生の情報工学実験IA・IB・ICは一体の授業として扱います。どれか1つを登録・解除すると3科目すべてへ反映され、金曜3〜5限にセットで時間割へ入ります。";
  if (/(微積|線形代数).*演習.*(b1|b2|セット)|数学演習.*セット/.test(normalized)) return "微積分学演習B1・B2と線形代数学演習B1・B2は4科目セットです。いずれかを登録すると4科目すべてが前後期へ登録され、セット内の同一時限は正規の組合せとして重複警告の対象外になります。";
  if (/プロジェクト研究|コース必修/.test(normalized)) return "3年次にコースを選ぶと、そのコースの必修科目を自動登録します。情報工学コースは情報工学系プロジェクト研究、データサイエンスコースはデータサイエンス系プロジェクト研究が対象で、どちらも木曜3〜5限の必修です。";
  if (/同列|並行クラス|\(1\).*\(2\)|かさまし|同じ授業/.test(normalized)) return "授業名末尾の(1)・(2)などは同じ授業の並行クラスです。同時に登録できるのは1クラスだけで、複数クラスを履修して単位を重複加算することはできません。いずれかで単位を修得すると、その同列授業はすべて検索結果と時間割から除外されます。";
  if (/再履修|未取得|落とした|取れなかった/.test(normalized)) return "学期末は授業ごとに取得／未取得を選びます。未取得の授業は再履修候補として残り、対象学年を過ぎても時間割へ登録できます。3・4年生は2年生向けを含む下級年次の授業も検索・登録できます。";
  if (/コース選択|情報工学コース|データサイエンスコース/.test(normalized)) return `コースは2年後期のボス撃破後、3年1〜2タームへ進むときに選択します。選択時にはコース必修と木曜3〜5限のプロジェクト研究を自動登録します。情報工学コースはDS基礎8・情報工学基礎13・DS専門12・情報工学専門16単位以上、データサイエンスコースはDS基礎12・情報工学基礎9・DS専門22・情報工学専門6単位以上です。現在は${context.studyCourse ? `「${studyCourseLabels[context.studyCourse]}」を選択中` : "未選択"}です。`;
  if (/ボス.*hp|hp.*ボス|卒業要件.*ボス/.test(normalized)) return `現在の挑戦目標は${context.grade}年生・${context.termGroup === "first" ? "1〜2ターム" : "4〜5ターム"}の「${currentBoss.name}」です。130単位をボスHPのように見せる表示は誤解を避けるため廃止しました。卒業要件は専用パネルで確認できます。`;
  if (/全部とれた|一括入力/.test(normalized)) return "学期末入力の「✓ 全部とれた」を押すと、現在のタームで判定対象になっている全授業をまとめて「取得」にできます。必要なら授業ごとにチェックを外して「未取得・再履修可」へ変更できます。";
  if (/学期末.*(入力|何)|強化タイム/.test(normalized)) return "学期末にはGPAを入力し、時間割に登録した授業ごとに取得／未取得を選びます。取得した授業だけが単位区分へ自動集計され、未取得の授業は次学期・次学年以降の再履修候補として残ります。全科目を修得した場合は「✓ 全部とれた」で一括選択できます。";
  if (/装備|武器/.test(normalized)) return `修得した単位区分と数に応じて解放されます。ボスの弱点に合う有効武器があれば、GPAに関係なく確定勝利です。主な装備は${equipmentCatalog.map((item) => `${item.name}：${item.note}`).join("、")}です。`;
  if (/ボス.*(いつ|時期|出て)|(いつ|時期).*ボス/.test(normalized)) return `ボスは学期末のGPAと修得単位の登録後に挑戦できます。次の相手は「${currentBoss.name}」です。`;
  if (/ボス戦.*(勝敗|条件)|勝つ.*条件/.test(normalized)) return "ボスの弱点に合う有効武器があればGPAに関係なく確定勝利です。有効武器がない場合はGPA 2.5以上なら地力で勝利します。";
  if (/gpa.*(高|変)|(高|変).*gpa/.test(normalized)) return "GPAは主に勝利演出の豪華さへ反映します。GPA 2.5・3.0・3.5・3.9を境に演出ランクが上がり、必殺技名、ダメージ、星の粒子、画面振動、フラッシュ、消滅演出が段階的に派手になります。有効武器があれば低GPAでも勝てます。";
  if (/65単位|留年|進級条件/.test(normalized)) return "2年後期終了時点で累計単位が65単位以下の場合は留年GAME OVERです。3年生へは進めず、修得済み単位を保持したまま2年1〜2タームからやり直します。進級には66単位以上が必要です。";
  if (/ボス.*負|敗北/.test(normalized)) return "ボス戦に敗北すると画面が暗転し、謎の天才賢者が代わりにボスを討伐する救援イベントが発生します。単位は記録され、通常は次のタームへ進みます。ただし2年後期終了時に65単位以下なら救援より進級判定が優先され、留年GAME OVERになります。";

  if (/卒業.*(あと|残り)|あと何単位|残り何単位/.test(normalized)) return `卒業要件は130単位です。修得済み${context.completedCredits}単位なので、合計単位の残りは${context.remainingCredits}単位です。ただし130単位に達しても、個別の必修授業、普遍教育26単位・専門科目104単位、各区分の最低要件に未達があれば卒業できません。`;
  if (/卒業要件|130単位|普遍教育/.test(normalized)) return "卒業要件は合計130単位に加え、すべての個別必修と区分別要件の達成が必要です。普遍教育は26単位で、英語6、国際基礎・国際展開各1、地域基礎・地域展開各1、教養コア4区分各1、教養展開5、数理DS基礎1、数理DS展開2単位以上が基本です。合計が26単位を超えていても、国際展開や地域展開など1区分でも不足すると未達成です。専門科目は104単位とコース別内訳に加え、卒業研究Ⅰ・Ⅱを含む必修授業をすべて修得してください。";
  if (/専門科目|専門.*104|共通専門基礎/.test(normalized)) return context.studyCourse === "dataScience"
    ? "データサイエンスコースは、共通専門基礎29、DS基礎12、情報工学基礎9、共通専門10、DS専門22、情報工学専門6単位以上です。DS専門では医療・看護、環境・園芸、人間・感性を各4単位以上修得し、専門全体を104単位にします。"
    : context.studyCourse === "information"
      ? "情報工学コースは、共通専門基礎29、DS基礎8、情報工学基礎13、共通専門10、DS専門12、情報工学専門16単位以上です。最低値に加えて16単位を選択し、専門全体を104単位にします。"
      : "専門科目は合計104単位です。共通専門基礎29・共通専門10単位以上は両コース共通で、3年進級時に選ぶコースによってDS基礎、情報工学基礎、DS専門、情報工学専門の最低値が変わります。";
  if (/重複|かぶっ|被っ/.test(normalized)) {
    for (let left = 0; left < context.registeredCourses.length; left++) {
      for (let right = left + 1; right < context.registeredCourses.length; right++) {
        if (coursesConflict(context.registeredCourses[left], context.registeredCourses[right])) {
          const first = context.registeredCourses[left];
          const second = context.registeredCourses[right];
          return `${first.day}曜${first.period}限で「${first.name}」と「${second.name}」が重複しています。どちらか一方を変更してください。`;
        }
      }
    }
    return "現在の時間割に、同じターム・曜日・時限の重複はありません。";
  }
  if (/登録中.*(合計|何単位)|時間割.*合計単位/.test(normalized)) {
    const registered = Array.from(new Map(context.registeredCourses.map((course) => [course.classCode || String(course.id), course])).values());
    return `現在登録している授業は${registered.length}科目、合計${registered.reduce((sum, course) => sum + course.credits, 0)}単位です。`;
  }
  if (/空き時間|空いている.*授業/.test(normalized)) {
    const candidates = courses.filter((course) => courseIsInTermGroup(course, context.termGroup)
      && (course.recommendedGrade === null || course.recommendedGrade <= context.grade)
      && !context.registeredCourses.some((registered) => coursesConflict(registered, course))
      && !context.registeredCourses.some((registered) => registered.id === course.id));
    return listCourses(candidates, "現在の空き時間に入る候補");
  }

  const filteredCourseAnswer = answerFilteredCourseSearch(normalized, context);
  if (filteredCourseAnswer) return filteredCourseAnswer;

  return "うまく質問を特定できませんでした。「火曜3限の必修を教えて」「Webプログラミングの単位と教室は？」「今の時間割に重複はある？」のように聞いてみてください。確認できない内容は大学シラバスや最新のお知らせをご案内します。";
}
