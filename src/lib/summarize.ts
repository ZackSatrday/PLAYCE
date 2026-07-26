import { GoogleGenAI } from "@google/genai";

export type Chapter = { start_sec: number; title: string; summary: string };
export type SummaryResult = { chapters: Chapter[]; provider: string; model: string };

type LLMProvider = {
  name: string;
  model: string;
  call: (prompt: string) => Promise<string>;
};

const providers: LLMProvider[] = [
  {
    name: "gemini",
    model: "gemini-3.5-flash",
    call: async (prompt) => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });
      return response.text; // property, not function
    },
  },
  {
    name: "gemini",
    model: "gemini-3.6-flash",
    call: async (prompt) => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });
      return response.text;
    },
  },
  {
    name: "openrouter",
    model: "meta-llama/llama-3.3-70b-instruct",
    call: async (prompt) => {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "playce.app",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 800,
        }),
      });
      const data = await res.json();
      return data.choices[0].message.content;
    },
  },
];

function parseAndValidate(raw: string): Chapter[] {
  const trimmed = raw.trim();
  const cleaned = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return validateChapters(parsed);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn("Standard JSON.parse failed, attempting fallback regex parser. Error:", errMsg);
  }

  // Fallback regex-based parser
  return parseWithRegexFallback(cleaned);
}

function validateChapters(parsed: unknown[]): Chapter[] {
  const chapters: Chapter[] = [];
  for (const item of parsed) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("start_sec" in item) ||
      !("title" in item) ||
      !("summary" in item)
    ) {
      throw new Error("Missing start_sec, title, or summary in chapter");
    }
    const obj = item as Record<string, unknown>;
    chapters.push({
      start_sec: Number(obj.start_sec),
      title: String(obj.title),
      summary: String(obj.summary),
    });
  }
  return chapters;
}

function parseWithRegexFallback(raw: string): Chapter[] {
  // Extract the JSON array content between first [ and last ]
  const firstBracket = raw.indexOf("[");
  const lastBracket = raw.lastIndexOf("]");
  if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
    throw new Error("Could not find JSON array in LLM response");
  }
  
  const arrayContent = raw.substring(firstBracket + 1, lastBracket).trim();
  
  // Find each object block between { and }
  const objectMatches = arrayContent.match(/\{([^{}]+)\}/g);
  if (!objectMatches) {
    throw new Error("No chapter objects found in JSON array");
  }

  const chapters: Chapter[] = [];
  for (const objStr of objectMatches) {
    // Extract start_sec
    const startSecMatch = objStr.match(/['"]?start_sec['"]?\s*:\s*['"]?(\d+)['"]?/i);
    if (!startSecMatch) {
      continue;
    }
    const start_sec = parseInt(startSecMatch[1], 10);

    // Extract title
    // It is followed by either summary, start_sec, or end of object
    const titleMatch = objStr.match(/['"]?title['"]?\s*:\s*(['"])([\s\S]*?)\1\s*(?:,\s*['"]?(?:summary|start_sec)['"]?|\s*})/i);
    const title = titleMatch ? titleMatch[2].trim() : "";

    // Extract summary
    // It is followed by either title, start_sec, or end of object
    const summaryMatch = objStr.match(/['"]?summary['"]?\s*:\s*(['"])([\s\S]*?)\1\s*(?:,\s*['"]?(?:title|start_sec)['"]?|\s*})/i);
    const summary = summaryMatch ? summaryMatch[2].trim() : "";

    chapters.push({ start_sec, title, summary });
  }

  if (chapters.length === 0) {
    throw new Error("Failed to parse any valid chapters using fallback parser");
  }

  return chapters;
}

export async function generateSummary(
  videoId: string,
  videoTitle: string
): Promise<SummaryResult | null> {
  const prompt = `Watch this YouTube video: https://www.youtube.com/watch?v=${videoId}
Return ONLY a JSON array of chapters. No markdown, no backticks.
Format: [{"start_sec": 0, "title": "string", "summary": "string"}]
- 4 to 8 chapters
- Each summary under 30 words in English  
- If video is Hindi or Hinglish, write chapters in English
- start_sec must reflect real video timestamps`;

  const fallbackPrompt = `Given this YouTube video title: "${videoTitle}"
Return ONLY a JSON array of 4 likely chapters.
Format: [{"start_sec": 0, "title": "string", "summary": "string"}]
Summaries under 20 words. start_sec evenly spaced from 0.
No markdown, no backticks.`;

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const activePrompt = i === 2 ? fallbackPrompt : prompt;
    try {
      const raw = await provider.call(activePrompt);
      const chapters = parseAndValidate(raw);
      return { chapters, provider: provider.name, model: provider.model };
    } catch (err) {
      console.warn(`${provider.model} failed:`, err);
      continue;
    }
  }

  return null;
}
