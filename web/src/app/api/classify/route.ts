import { NextResponse } from "next/server";
import { genJSONWithImage, geminiReady } from "@/lib/gemini";
import { CATEGORY_META, type IssueCategory, type Severity } from "@/lib/types";

export const dynamic = "force-dynamic";

const CATEGORIES: IssueCategory[] = [
  "pothole", "water_leak", "streetlight", "garbage",
  "sewage", "fallen_tree", "traffic_signal", "other",
];

export interface Classification {
  /** false → the photo is NOT a civic infrastructure issue (selfie, food, meme…) */
  relevant: boolean;
  category: IssueCategory;
  severity: Severity;
  title: string;
  description: string;
  confidence: number;
  /** short human explanation, e.g. why it was rejected or what was seen */
  reason: string;
}

const SYS = `You are the vision intake agent of "Samadhaan", a civic issue platform serving the citizen's own city.
You are shown ONE citizen-submitted photo (and maybe a note). Decide if it genuinely shows a
PUBLIC civic / infrastructure problem the municipality should fix — e.g. potholes, water leaks,
broken streetlights, garbage piles, sewage overflow, fallen trees, broken traffic signals,
damaged footpaths or public property.

REJECT (relevant=false) anything that is clearly NOT a public civic issue: selfies/portraits,
food, pets, screenshots, memes, documents, indoor private spaces, product photos, blurry/black
frames. When rejecting, set category="other", severity="low", confidence low, and put a short,
friendly reason telling the citizen what to photograph instead.

Return STRICT JSON only:
{"relevant": boolean,
 "category": one of ${JSON.stringify(CATEGORIES)},
 "severity": "low"|"medium"|"high"|"critical",
 "title": "<=8 word headline of the issue",
 "description": "1-2 factual sentences describing the problem and its public-safety risk",
 "confidence": 0..1,
 "reason": "one short sentence — what you see, or why it was rejected"}
Judge severity by public-safety impact (sewage on a road, a burst main, a live traffic hazard = high/critical).`;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const imageUrl: string | undefined = body.imageUrl;
  const note: string = (body.note ?? "").toString().slice(0, 400);

  if (!imageUrl?.startsWith("data:")) {
    return NextResponse.json({ error: "imageUrl (data URL) required" }, { status: 400 });
  }

  if (!geminiReady()) {
    // Graceful demo fallback: accept and let the swarm classify by heuristic.
    return NextResponse.json({
      classification: {
        relevant: true,
        category: "other",
        severity: "medium",
        title: note.slice(0, 50) || "Civic issue from photo",
        description: note || "Citizen-submitted photo of a civic issue.",
        confidence: 0.6,
        reason: "Photo received — AI vision is offline, agents will diagnose it.",
      } satisfies Classification,
    });
  }

  try {
    const prompt = `${SYS}\n\nCitizen note (may be empty): "${note || "(none)"}"`;
    const c = await genJSONWithImage<Classification>(prompt, imageUrl, { temperature: 0.2 });
    // normalize
    if (!CATEGORIES.includes(c.category)) c.category = "other";
    c.confidence = Math.max(0, Math.min(1, Number(c.confidence) || 0.5));
    if (!c.title) c.title = CATEGORY_META[c.category].label;
    return NextResponse.json({ classification: c });
  } catch {
    return NextResponse.json({
      classification: {
        relevant: true,
        category: "other",
        severity: "medium",
        title: note.slice(0, 50) || "Civic issue from photo",
        description: note || "Citizen-submitted photo.",
        confidence: 0.55,
        reason: "Couldn't fully analyze the image — agents will take it from here.",
      } satisfies Classification,
    });
  }
}
