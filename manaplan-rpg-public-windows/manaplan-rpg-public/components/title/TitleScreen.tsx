"use client";
import { useState, type FormEvent } from "react";
import type { NewPlayer, SaveData } from "@/features/save-data/types";

type Mode = "menu" | "new" | "continue";
type Props = { saves: SaveData[]; loaded: boolean; onCreate: (player: NewPlayer) => void; onContinue: (save: SaveData) => void; onDelete: (id: string) => void };

export function TitleScreen({ saves, loaded, onCreate, onContinue, onDelete }: Props) {
  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const playerName = name.trim();
    if (playerName) onCreate({ name: playerName, grade: 1, semester: "前期" });
  }
  return <main className="title-screen">
    <div className="title-emblem">♢</div><p className="title-kicker">履修という冒険へ</p><h1>CAMPUS<br />QUEST</h1><p className="title-copy">授業を選び、単位を集め、卒業への道を切り拓こう。</p>
    <section className="title-menu" aria-live="polite">
      {mode === "menu" && <><button className="title-primary" type="button" onClick={() => setMode("continue")} disabled={!loaded}>つづきから</button><button type="button" onClick={() => setMode("new")}>はじめから</button><small>{saves.length}件の冒険データ</small></>}
      {mode === "new" && <form className="new-player-form" onSubmit={submit}><h2>冒険者登録</h2><label htmlFor="player-name">名前</label><input id="player-name" name="playerName" type="text" value={name} onChange={(event) => setName(event.currentTarget.value)} maxLength={20} autoComplete="name" autoFocus required placeholder="冒険者の名前" /><div className="start-grade"><span>開始地点</span><strong>1年・前期</strong><small>すべての冒険者は大学生活の始まりから出発します。</small></div><button className="title-primary" type="submit" disabled={!name.trim()}>冒険を始める</button><button type="button" onClick={() => setMode("menu")}>戻る</button></form>}
      {mode === "continue" && <div className="save-list"><h2>冒険データを選ぶ</h2>{saves.length === 0 ? <p className="no-save">まだ冒険データがありません。</p> : saves.map((save) => <article className="save-card" key={save.id}><button className="save-select" type="button" onClick={() => onContinue(save)}><strong>{save.name}</strong><span>{save.grade}年・{save.semester}</span><span>{save.registeredCourseIds.length}クエスト受注中</span><small>更新：{new Date(save.updatedAt).toLocaleDateString("ja-JP")}</small></button><button className="save-delete" type="button" onClick={() => { if (window.confirm(`${save.name}のデータを削除しますか？`)) onDelete(save.id); }}>データを消す</button></article>)}<button type="button" onClick={() => setMode("menu")}>戻る</button></div>}
    </section><p className="title-footer">PRESS A QUEST TO BEGIN</p>
  </main>;
}
