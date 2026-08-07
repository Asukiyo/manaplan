type Props = { onNotice: (message: string) => void; onTitle: () => void };
export function AppHeader({ onNotice, onTitle }: Props) {
  return <header className="topbar"><a className="brand" href="#quest-board" aria-label="CAMPUS QUEST ホーム"><span className="brand-mark">♢</span><strong>CAMPUS QUEST</strong></a><nav aria-label="メインメニュー"><a className="active" href="#quest-board">クエストボード</a><a href="#timetable">時間割</a><button type="button" onClick={() => onNotice("冒険記録は次の実装で追加予定です")}>冒険記録</button><button type="button" onClick={() => onNotice("履修情報は次の実装で追加予定です")}>履修情報</button><button type="button" onClick={onTitle}>↪ タイトルへ</button></nav></header>;
}
