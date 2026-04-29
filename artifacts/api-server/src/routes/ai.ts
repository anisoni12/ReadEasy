import { Router, type IRouter } from "express";
import {
  AiSummarizeBody,
  AiSummarizeResponse,
  AiExplainBody,
  AiExplainResponse,
  AiVocabularyBody,
  AiVocabularyResponse,
  AiDetectBookBody,
  AiDetectBookResponse,
} from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();

const MODEL = "gemini-2.5-flash";
const MAX_INPUT_CHARS = 60_000;

function trimText(text: string): string {
  if (text.length <= MAX_INPUT_CHARS) return text;
  return text.slice(0, MAX_INPUT_CHARS);
}

async function generateText(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 8192 },
  });
  const text = response.text;
  if (!text || !text.trim()) {
    throw new Error("Empty response from Gemini");
  }
  return text.trim();
}

async function generateJson<T>(prompt: string): Promise<T> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });
  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");
  return JSON.parse(text) as T;
}

router.post("/ai/summarize", async (req, res, next) => {
  try {
    const body = AiSummarizeBody.parse(req.body);
    const langClause = body.language
      ? ` Respond in ${body.language === "hi" ? "Hindi (Devanagari script)" : body.language}.`
      : " Match the language of the input text (Hindi or English).";
    const prompt = `Summarize the following book passage in 5-7 clear sentences for a reader who wants the key ideas.${langClause} Do not add headings or bullet points; write flowing prose.\n\nText:\n${trimText(body.text)}`;
    const text = await generateText(prompt);
    const data = AiSummarizeResponse.parse({ text });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post("/ai/explain", async (req, res, next) => {
  try {
    const body = AiExplainBody.parse(req.body);
    const langClause = body.language
      ? ` Respond in ${body.language === "hi" ? "Hindi (Devanagari script)" : body.language}.`
      : " Match the language of the input (Hindi or English).";
    const prompt = `Explain the following passage in simple, easy-to-understand language for a general reader. Keep it concise (3-5 sentences).${langClause}\n\nPassage:\n${trimText(body.text)}`;
    const text = await generateText(prompt);
    const data = AiExplainResponse.parse({ text });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post("/ai/vocabulary", async (req, res, next) => {
  try {
    const body = AiVocabularyBody.parse(req.body);
    const ctx = body.context ? `\nContext sentence: ${body.context}` : "";
    const prompt = `For the word "${body.word}", return a JSON object with these keys:
- "word": the word as given
- "meaning": a clear, simple meaning (1-2 sentences) in the same language as the word
- "example": one short example sentence using the word
- "synonyms": an array of 2-3 synonyms in the same language
- "meaningHindi": (only if the word is in Devanagari/Hindi) the meaning translated to English

Only return the JSON, no markdown.${ctx}`;
    const raw = await generateJson<unknown>(prompt);
    const data = AiVocabularyResponse.parse(raw);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post("/ai/detect-book", async (req, res, next) => {
  try {
    const rawText = typeof req.body?.text === "string" ? req.body.text : "";
    // No usable text on page 1 (e.g. image-only cover) — respond with neutral defaults.
    if (rawText.trim().length < 20) {
      res.json({ title: "Untitled", author: "Unknown" });
      return;
    }
    const body = AiDetectBookBody.parse({ text: rawText });
    const prompt = `From the following extracted text from the first page(s) of a book, infer:
- "title": the book title
- "author": the author's name
- "genre": a one-or-two-word genre (optional, omit if unknown)
- "language": ISO code "hi" for Hindi or "en" for English (optional)

If you cannot confidently identify a field, omit it (except title and author — make your best guess from the text). Return ONLY a JSON object, no markdown.

Text:
${trimText(body.text)}`;
    const raw = await generateJson<Record<string, unknown>>(prompt);
    const cleaned = {
      title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "Untitled",
      author: typeof raw.author === "string" && raw.author.trim() ? raw.author.trim() : "Unknown",
      ...(typeof raw.genre === "string" && raw.genre.trim() ? { genre: raw.genre.trim() } : {}),
      ...(typeof raw.language === "string" && raw.language.trim() ? { language: raw.language.trim() } : {}),
    };
    const data = AiDetectBookResponse.parse(cleaned);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
