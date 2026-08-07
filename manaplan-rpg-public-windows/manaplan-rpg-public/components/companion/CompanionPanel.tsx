"use client";
import { useState, type FormEvent } from "react";
import type { ChatMessage } from "@/features/course-quest/types";
import { quickQuestions } from "@/features/course-quest/constants";
import { Icon } from "@/components/ui/Icon";

type Props = { messages: ChatMessage[]; onAsk: (question: string) => void };
export function CompanionPanel({ messages, onAsk }: Props) {
  const [input, setInput] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); onAsk(input); setInput(""); }
  return <aside className="panel companion-panel"><div className="panel-heading"><h2><Icon>◯</Icon>相棒に相談</h2><span className="source-badge">案内役</span></div><div className="mascot" aria-label="相棒のマルー"><div className="mascot-body"><span className="eye left" /><span className="eye right" /><span className="smile" /></div></div><div className="companion-name"><strong>マルー</strong><span>相棒レベル1</span></div><div className="speech">まずは必修クエストを確認しよう。授業情報は正式なシラバスを基準に案内するよ。</div>
    {messages.slice(-2).map((message, index) => <div className={`chat-message ${message.role}`} key={index}>{message.text}</div>)}<div className="quick-list">{quickQuestions.map((question) => <button type="button" key={question} onClick={() => onAsk(question)}>{question}</button>)}</div><form className="chat-form" onSubmit={submit}><input value={input} onChange={(e) => setInput(e.target.value)} aria-label="相棒への質問" placeholder="相棒に質問する" /><button type="submit">送信</button></form>
  </aside>;
}
