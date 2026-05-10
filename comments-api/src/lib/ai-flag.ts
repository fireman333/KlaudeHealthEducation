/**
 * Workers AI PHI detection.
 *
 * Best-effort: classifies comment body as containing personal health
 * information (PHI) — defined narrowly as identifiable personal medical
 * details (specific age + diagnosis, drug name + personal dosing, lab
 * values, hospital/physician identifiers). General health questions and
 * supportive chatter are NOT PHI.
 *
 * Returns { phi, reason }. Reason is a short Chinese phrase suitable for
 * showing the moderator in the email + admin UI.
 */

const SYSTEM_PROMPT = `你是醫療衛教文章留言審核員，判斷留言是否包含「個人醫療資訊」（PHI）。

PHI 嚴格定義（必須符合下列任一）：
1. 具體年齡 + 診斷或檢查結果（例：「我媽 67 歲肺腺癌」）
2. 具體藥名 + 個人服用情境（例：「我吃 osimertinib 三個月」）
3. 檢驗數值或影像描述（例：「CT 看到 4cm 結節」）
4. 醫師、醫院、病歷號等可識別資訊

非 PHI（常見讀者留言應視為 no）：
- 一般感謝、提問、討論
- 無個人化的衛教提問
- 第三人稱抽象描述（不含具體年齡 / 檢驗值）

留言：「__BODY__」

只回傳 JSON，格式：
{"phi": true|false, "reason": "<20 字以內的繁中說明>"}`;

interface AiFlagResult {
  phi: boolean;
  reason: string;
}

export async function aiFlagPhi(ai: Ai, body: string): Promise<AiFlagResult> {
  const prompt = SYSTEM_PROMPT.replace('__BODY__', body.slice(0, 1500));

  // @cf/meta/llama-3.1-8b-instruct — free tier, ~500ms latency, decent zh.
  // Falls back to llama-3.1-8b-instruct-fast if available; pick the stable
  // one for consistency.
  const result = (await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: '你是嚴謹的醫療文字分類器，只回 JSON。' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 80,
    temperature: 0,
  })) as { response?: string };

  const raw = (result.response ?? '').trim();
  // Strip ``` fences if the model added them
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');

  const match = cleaned.match(/\{[\s\S]*?\}/);
  if (!match) return { phi: false, reason: 'parse_failed' };

  try {
    const parsed = JSON.parse(match[0]) as { phi?: unknown; reason?: unknown };
    return {
      phi: parsed.phi === true,
      reason:
        typeof parsed.reason === 'string'
          ? parsed.reason.slice(0, 60)
          : '',
    };
  } catch {
    return { phi: false, reason: 'parse_failed' };
  }
}
