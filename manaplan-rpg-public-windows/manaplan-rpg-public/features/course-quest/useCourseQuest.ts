"use client";

import { useMemo, useState } from "react";
import { courses, type Course } from "@/data/courses";
import { answerFor } from "./chat";
import { bossMaxHp } from "./constants";
import { emptyFilters, type ChatMessage, type Filters } from "./types";

export function useCourseQuest(initialRegistered: number[] = [1, 2, 4, 5]) {
  const [draft, setDraft] = useState<Filters>({ ...emptyFilters, name: "データ", time: "火曜3限" });
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [registered, setRegistered] = useState<number[]>(initialRegistered);
  const [notice, setNotice] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const selectedCourses = useMemo(() => courses.filter((course) => registered.includes(course.id)), [registered]);
  const totalCredits = selectedCourses.reduce((sum, course) => sum + course.credits, 0);
  const bossHp = bossMaxHp - totalCredits;
  const results = useMemo(() => courses.filter((course) => {
    const time = `${course.day}曜${course.period}限`;
    return (!filters.name || `${course.name}${course.teacher}`.toLowerCase().includes(filters.name.toLowerCase()))
      && (!filters.time || time.includes(filters.time))
      && (!filters.code || course.code.toLowerCase().includes(filters.code.toLowerCase()))
      && (!filters.credits || course.credits === Number(filters.credits))
      && (!filters.courseType || course.courseType === filters.courseType)
      && (!filters.location || course.location.includes(filters.location));
  }), [filters]);

  function setField(key: keyof Filters, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function search() {
    setFilters(draft);
    setNotice("条件に合う授業クエストを表示しました");
  }

  function clearFilters() {
    setDraft(emptyFilters);
    setFilters(emptyFilters);
  }

  function toggleRegistration(course: Course) {
    if (registered.includes(course.id)) {
      setRegistered((current) => current.filter((id) => id !== course.id));
      setNotice(`「${course.name}」の受注を取り消しました`);
      return;
    }
    const conflict = selectedCourses.find((item) => item.day === course.day && item.period === course.period);
    if (conflict) {
      setNotice(`「${conflict.name}」と時間が重なっています`);
      return;
    }
    setRegistered((current) => [...current, course.id]);
    setNotice(`「${course.name}」を受注しました`);
  }

  function ask(question: string) {
    const clean = question.trim();
    if (!clean) return;
    setMessages((current) => [...current, { role: "user", text: clean }, { role: "bot", text: answerFor(clean, totalCredits) }]);
  }

  return { draft, registered, notice, messages, selectedCourses, totalCredits, bossHp, results, setField, search, clearFilters, toggleRegistration, ask, setNotice };
}
