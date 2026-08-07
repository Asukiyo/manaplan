export type Category = "required" | "selectRequired" | "elective" | "general" | "open";
export type Weekday = "月" | "火" | "水" | "木" | "金" | "土";
export type CourseType = "専門" | "普遍";

export type Course = {
  id: number;
  name: string;
  teacher: string;
  day: Weekday;
  period: number;
  credits: number;
  category: Category;
  code: string;
  courseType: CourseType;
  location: string;
};

export const courses: Course[] = [
  { id: 1, name: "データ構造とアルゴリズム", teacher: "山田 太郎", day: "月", period: 2, credits: 2, category: "required", code: "DAT201", courseType: "専門", location: "総合2-201" },
  { id: 2, name: "Webプログラミング", teacher: "佐藤 花子", day: "火", period: 3, credits: 2, category: "selectRequired", code: "WEB103", courseType: "専門", location: "情報1-105" },
  { id: 3, name: "人工知能概論", teacher: "鈴木 一郎", day: "水", period: 2, credits: 2, category: "elective", code: "AI204", courseType: "専門", location: "情報2-301" },
  { id: 4, name: "現代社会と法", teacher: "高橋 美咲", day: "木", period: 4, credits: 2, category: "general", code: "LAW110", courseType: "普遍", location: "総合1-204" },
  { id: 5, name: "心理学入門", teacher: "田中 直樹", day: "金", period: 1, credits: 2, category: "open", code: "LIB112", courseType: "普遍", location: "総合1-301" },
  { id: 6, name: "データベース論", teacher: "井上 明", day: "月", period: 3, credits: 2, category: "required", code: "DB205", courseType: "専門", location: "情報1-201" },
  { id: 7, name: "線形代数学Ⅱ", teacher: "小林 翼", day: "火", period: 1, credits: 2, category: "selectRequired", code: "MAT202", courseType: "専門", location: "理学2-101" },
  { id: 8, name: "機械学習基礎", teacher: "中村 優", day: "水", period: 4, credits: 2, category: "elective", code: "ML301", courseType: "専門", location: "情報2-205" },
  { id: 9, name: "科学技術と倫理", teacher: "伊藤 真", day: "木", period: 2, credits: 2, category: "general", code: "ETH120", courseType: "普遍", location: "総合3-102" },
  { id: 10, name: "教育心理学", teacher: "渡辺 葵", day: "金", period: 3, credits: 2, category: "open", code: "EDU210", courseType: "普遍", location: "教育1-203" },
  { id: 11, name: "情報セキュリティ", teacher: "斎藤 健", day: "土", period: 2, credits: 2, category: "elective", code: "SEC302", courseType: "専門", location: "情報1-303" },
  { id: 12, name: "統計モデリング", teacher: "加藤 遥", day: "月", period: 5, credits: 2, category: "selectRequired", code: "STA220", courseType: "専門", location: "理学1-202" },
];
