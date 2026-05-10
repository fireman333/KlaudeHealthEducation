import { useEffect, useRef, useState } from 'react';
import './CommentBox.css';

interface Props {
  slug: string;
  apiBase: string;
  turnstileSiteKey: string;
}

interface PublicComment {
  id: number;
  author_name: string;
  body: string;
  created_at: number;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; comments: PublicComment[] }
  | { kind: 'error'; message: string };

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'submitted' }
  | { kind: 'error'; message: string };

const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        },
      ) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

export function CommentBox({ slug, apiBase, turnstileSiteKey }: Props) {
  const [list, setList] = useState<LoadState>({ kind: 'loading' });
  const [submit, setSubmit] = useState<SubmitState>({ kind: 'idle' });
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [showPhiHint, setShowPhiHint] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  // Load comments on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${apiBase}/api/comments?slug=${encodeURIComponent(slug)}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { comments: PublicComment[] };
        if (!cancelled) {
          setList({ kind: 'ready', comments: data.comments ?? [] });
        }
      } catch (err) {
        if (!cancelled) {
          setList({
            kind: 'error',
            message: err instanceof Error ? err.message : '載入失敗',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBase, slug]);

  // Mount Turnstile widget once script loads
  useEffect(() => {
    function renderWidget() {
      if (!window.turnstile || !turnstileRef.current) return;
      if (turnstileWidgetIdRef.current) return;
      turnstileWidgetIdRef.current = window.turnstile.render(
        turnstileRef.current,
        {
          sitekey: turnstileSiteKey,
          callback: (token) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(null),
          'error-callback': () => setTurnstileToken(null),
        },
      );
    }

    if (window.turnstile) {
      renderWidget();
      return;
    }

    const existing = document.querySelector(
      `script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]`,
    );
    if (!existing) {
      const script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    const interval = setInterval(() => {
      if (window.turnstile) {
        clearInterval(interval);
        renderWidget();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [turnstileSiteKey]);

  // Inline PHI hint — basic regex, complements server-side AI flag
  function bodyContainsPhiHints(text: string): boolean {
    if (!text) return false;
    const ageDx = /\d{1,3}\s*歲.{0,20}(癌|腺癌|腫瘤|肺|肝|乳|腸|攝護腺|胃|胰)/;
    const lab = /\d+(\.\d+)?\s*(cm|mm|公分|毫米|mg|ml)/i;
    const drug = /我.{0,5}(吃|服用|打|用)/;
    return ageDx.test(text) || lab.test(text) || drug.test(text);
  }

  function onBodyChange(value: string) {
    setBody(value);
    setShowPhiHint(bodyContainsPhiHints(value));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!turnstileToken) {
      setSubmit({ kind: 'error', message: '請先完成人機驗證。' });
      return;
    }
    if (!name.trim() || !body.trim()) {
      setSubmit({ kind: 'error', message: '暱稱與留言內容都要填。' });
      return;
    }
    setSubmit({ kind: 'submitting' });
    try {
      const res = await fetch(`${apiBase}/api/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          post_slug: slug,
          author_name: name.trim(),
          body: body.trim(),
          turnstile_token: turnstileToken,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setSubmit({ kind: 'submitted' });
      setName('');
      setBody('');
      setShowPhiHint(false);
      if (turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetIdRef.current);
      }
      setTurnstileToken(null);
    } catch (err) {
      setSubmit({
        kind: 'error',
        message: err instanceof Error ? err.message : '送出失敗',
      });
    }
  }

  return (
    <section className="comment-box" aria-labelledby="comments-heading">
      <h3 id="comments-heading" className="comment-box__title">讀者留言</h3>

      <div className="comment-box__notice">
        ⚠ 為保護所有人，請<strong>勿輸入個人醫療資訊</strong>（具體年齡 + 病名、藥名、檢驗值、醫師 / 醫院名稱）。所有留言會經人工審核後才公開（通常 24 小時內）。
      </div>

      {submit.kind === 'submitted' ? (
        <div className="comment-box__success" role="status">
          已收到留言，審核通過後 24 小時內公開。感謝！
        </div>
      ) : (
        <form className="comment-box__form" onSubmit={onSubmit}>
          <label className="comment-box__label">
            暱稱（會公開）
            <input
              type="text"
              maxLength={30}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：康家屬"
              required
              disabled={submit.kind === 'submitting'}
            />
          </label>
          <label className="comment-box__label">
            留言內容
            <textarea
              maxLength={2000}
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              placeholder="想問的問題、想分享的延伸資訊…（請避免個人醫療細節）"
              rows={5}
              required
              disabled={submit.kind === 'submitting'}
            />
          </label>
          {showPhiHint && (
            <div className="comment-box__phi-warn" role="alert">
              ⚠ 你的留言看起來像在描述個人醫療情況。請改寫成「一般性提問」，並把個別細節留給你的主治醫師討論。
            </div>
          )}
          <div ref={turnstileRef} className="comment-box__turnstile" />
          {submit.kind === 'error' && (
            <div className="comment-box__error" role="alert">{submit.message}</div>
          )}
          <button
            type="submit"
            className="comment-box__submit"
            disabled={submit.kind === 'submitting' || !turnstileToken}
          >
            {submit.kind === 'submitting' ? '送出中…' : '送出留言'}
          </button>
        </form>
      )}

      <div className="comment-box__list">
        {list.kind === 'loading' && (
          <div className="comment-box__placeholder">載入留言中…</div>
        )}
        {list.kind === 'error' && (
          <div className="comment-box__placeholder">留言載入失敗：{list.message}</div>
        )}
        {list.kind === 'ready' && list.comments.length === 0 && (
          <div className="comment-box__placeholder">還沒有留言，歡迎當第一個。</div>
        )}
        {list.kind === 'ready' &&
          list.comments.map((c) => (
            <article key={c.id} className="comment-box__item">
              <div className="comment-box__item-meta">
                <span className="comment-box__item-author">{c.author_name}</span>
                <span className="comment-box__item-date">
                  {new Date(c.created_at).toLocaleDateString('zh-TW')}
                </span>
              </div>
              <p className="comment-box__item-body">{c.body}</p>
            </article>
          ))}
      </div>
    </section>
  );
}

export default CommentBox;
