import { bossMaxHp } from "@/features/course-quest/constants";
type Props = { bossHp: number; totalCredits: number; registeredCount: number; playerName: string; location: string };
export function StatusStrip({ bossHp, totalCredits, registeredCount, playerName, location }: Props) {
  return <section className="status-strip" aria-label="冒険の進行状況"><div className="boss-status"><div className="status-title"><strong>⚔ ラスボス「卒業要件」</strong><b>HP {bossHp} / {bossMaxHp}</b></div><div className="hp-track"><span style={{ width: `${(bossHp / bossMaxHp) * 100}%` }} /></div><div className="status-caption"><span>今学期の登録で {totalCredits}ダメージ</span><span>残り{bossHp}単位</span></div></div><div className="player-status"><span className="level-box">Lv.1</span><div><strong>{playerName}の冒険</strong><p>現在地：{location}</p><p>受注済みクエスト：{registeredCount}件</p></div></div></section>;
}
