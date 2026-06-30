// Minimal Gemini REST client (Gemini Developer API). Server-side only.

const KEY = process.env.GEMINI_API_KEY ?? "";
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

type Part =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

interface GenOpts {
  system?: string;
  json?: boolean;
  temperature?: number;
}

async function call(parts: Part[], opts: GenOpts = {}): Promise<string> {
  if (!KEY) throw new Error("GEMINI_API_KEY missing");
  const body: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

  const res = await fetch(`${BASE}/${MODEL}:generateContent?key=${KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  return text.trim();
}

export async function genText(prompt: string, opts: GenOpts = {}): Promise<string> {
  return call([{ text: prompt }], opts);
}

export async function genJSON<T>(prompt: string, opts: GenOpts = {}): Promise<T> {
  const raw = await call([{ text: prompt }], { ...opts, json: true });
  return JSON.parse(stripFence(raw)) as T;
}

/** dataUrl like "data:image/jpeg;base64,...." */
function toInline(dataUrl: string): Part {
  const m = dataUrl.match(/^data:(.+?);base64,(.*)$/);
  if (!m) throw new Error("expected data URL");
  return { inline_data: { mime_type: m[1], data: m[2] } };
}

export async function genJSONWithImage<T>(
  prompt: string,
  imageDataUrl: string,
  opts: GenOpts = {},
): Promise<T> {
  const raw = await call([{ text: prompt }, toInline(imageDataUrl)], {
    ...opts,
    json: true,
  });
  return JSON.parse(stripFence(raw)) as T;
}

export async function genJSONWithImages<T>(
  prompt: string,
  imageDataUrls: string[],
  opts: GenOpts = {},
): Promise<T> {
  const parts: Part[] = [{ text: prompt }, ...imageDataUrls.map(toInline)];
  const raw = await call(parts, { ...opts, json: true });
  return JSON.parse(stripFence(raw)) as T;
}

function stripFence(s: string): string {
  return s
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
}

export const geminiReady = () => Boolean(KEY);
