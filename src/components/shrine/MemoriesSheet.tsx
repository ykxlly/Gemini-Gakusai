
// 裏動線「思い出」: FABで開くシート。主フロー（S0〜S3）からは呼ばない。
// 音声・お守りカード・チャット・まとめ・しおりを収容する。
"use client";

import { BookMarked, BookOpen, MessageCircle, RefreshCw, Send, Share2, Volume2, Wand2, X } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { copy } from "@/lib/copy";
import { isValidHex, type Result } from "@/lib/fortune";
import type { HistoryEntry } from "@/hooks/usePersistentState";
import type { useMemories } from "@/hooks/useMemories";

function MemoriesSheet({
  open,
  fabHidden,
  result,
  history,
  store,
  notify,
  onOpen,
  onClose,
}: {
  open: boolean;
  fabHidden: boolean;
  result: Result | null;
  history: HistoryEntry[];
  store: ReturnType<typeof useMemories>;
  notify: (message: string) => void;
  onOpen: () => void;
  onClose: () => void;
}) {
  const chatLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [store.chatMessages, open]);

  return (
    <>
      {!fabHidden && (
        <button
          className="memories-fab"
          onClick={onOpen}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <BookMarked size={18} /> {copy.memories.open}
        </button>
      )}
      {open && (
        <div className="memories-sheet-backdrop" onClick={onClose} aria-hidden="true" />
      )}
      {open && (
        <section className="memories-sheet" role="dialog" aria-modal="true" aria-label={copy.memories.open}>
          <div className="memories-sheet-heading">
            <div>
              <span>今日の記録</span>
              <h2>思い出を持ち帰ろう</h2>
              <p>しおり、お守りカード、今日のまとめを作れます。</p>
            </div>
            <button className="memories-sheet-close" onClick={onClose} type="button" aria-label="閉じる">
              <X size={18} />
            </button>
          </div>
          <details className="extras-accordion" open>
            <summary>
              <BookMarked size={14} /> 思い出を残す
            </summary>
            <div className="ai-tools">
              <button
                className="ai-button"
                disabled={store.isNarrating || !result}
                onClick={() => store.playNarration(notify)}
                type="button"
              >
                {store.isNarrating ? <RefreshCw className="spin" size={14} /> : <Volume2 size={14} />}{" "}
                音声で聞く
              </button>
              <button
                className="ai-button"
                disabled={store.isGeneratingCard || !result}
                onClick={() => store.generateCard(notify)}
                type="button"
              >
                {store.isGeneratingCard ? <RefreshCw className="spin" size={14} /> : <Wand2 size={14} />}{" "}
                お守りカードを作る
              </button>
            </div>
            {store.narrationUrl && (
              <audio autoPlay className="narration-player" controls src={store.narrationUrl} />
            )}
            {store.card && result && (
              <div className="card-opening" aria-live="polite">
                <div className="card-envelope" aria-hidden="true">
                  <span className="envelope-back" />
                  <span className="envelope-flap" />
                </div>
                <div
                  className="omamori-card"
                  style={
                    isValidHex(store.card.accentHex)
                      ? ({ "--accent": store.card.accentHex } as CSSProperties)
                      : undefined
                  }
                >
                  <span className="omamori-seal">御守</span>
                  <strong>{result.fortune_name}</strong>
                  <p>{store.card.phrase}</p>
                  <small>{result.mission.target_spot}</small>
                </div>
              </div>
            )}
            <div aria-live="polite" className="ai-panel chat-panel">
              <h3>
                <MessageCircle size={14} /> 巫女さんに聞いてみる
              </h3>
              {store.chatMessages.length === 0 && (
                <p className="chat-hint">運勢やミッションについて気になることを聞いてみましょう</p>
              )}
              <div className="chat-log" ref={chatLogRef}>
                {store.chatMessages.map((entry, index) => (
                  <p
                    className={`chat-bubble ${entry.role === "user" ? "chat-bubble-user" : "chat-bubble-model"}`}
                    key={index}
                  >
                    {entry.text}
                  </p>
                ))}
              </div>
              <form
                className="chat-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  store.sendChatMessage(store.chatInput, notify);
                }}
              >
                <input
                  onChange={(event) => store.setChatInput(event.target.value)}
                  placeholder="例：一人でもできる？(Enterで送信)"
                  type="text"
                  value={store.chatInput}
                />
                <button
                  className="ai-button"
                  disabled={!store.chatInput.trim() || store.isChatting || !result}
                  type="submit"
                >
                  {store.isChatting ? <RefreshCw className="spin" size={14} /> : <Send size={14} />}
                </button>
              </form>
            </div>
            <div aria-live="polite" className="ai-panel">
              <h3>
                <BookOpen size={14} /> 今日のまとめ
              </h3>
              {history.length >= 2 ? (
                store.summaryText ? (
                  <p>{store.summaryText}</p>
                ) : (
                  <button
                    className="ai-button"
                    disabled={store.isSummarizing}
                    onClick={() => store.fetchSummary(notify)}
                    type="button"
                  >
                    {store.isSummarizing ? <RefreshCw className="spin" size={14} /> : <BookOpen size={14} />}{" "}
                    今日のまとめを聞く
                  </button>
                )
              ) : (
                <p className="chat-hint">あと{2 - history.length}回引くと「今日のまとめ」を聞けます</p>
              )}
            </div>
            <div className="memory-bookmark-panel" aria-live="polite">
              <h3>
                <BookMarked size={15} /> 今日の寄り道しおり
              </h3>
              {!store.bookmark ? (
                <button
                  className="ai-button"
                  disabled={store.isCreatingBookmark || !result}
                  onClick={() => store.createBookmark(notify)}
                  type="button"
                >
                  {store.isCreatingBookmark ? (
                    <RefreshCw className="spin" size={14} />
                  ) : (
                    <BookMarked size={14} />
                  )}{" "}
                  しおりを作る
                </button>
              ) : (
                <div className="bookmark-preview">
                  <small>
                    {copy.site.festival} · {copy.site.title}
                  </small>
                  <strong>{store.bookmark.title}</strong>
                  <p>{store.bookmark.closingComment}</p>
                  <button className="ai-button" onClick={() => store.exportBookmark()} type="button">
                    <Share2 size={14} /> 画像を保存・共有
                  </button>
                </div>
              )}
            </div>
          </details>
        </section>
      )}
    </>
  );
}

export default memo(MemoriesSheet);
