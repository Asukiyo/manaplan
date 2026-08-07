export function answerFor(question: string, credits: number) {
  if (question.includes("必修")) return "必修クエストは、検索結果で「必修」と表示されている授業です。まず卒業要件との対応を確認しましょう。";
  if (question.includes("火曜3限")) return "火曜3限には「Webプログラミング」があります。検索欄の授業時間から絞り込めます。";
  if (question.includes("重複")) return "同じ曜日・時限のクエストは同時に受注できません。受注時に自動で知らせます。";
  if (question.includes("卒業")) return `卒業ボスの最大HPは124です。現在は${credits}単位分の攻撃ポイントを予約しています。`;
  return "授業名、時間、コード、単位数、種類、場所から探せます。気になる条件を入力してみてください。";
}
