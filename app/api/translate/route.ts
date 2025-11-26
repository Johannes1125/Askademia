import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English",
  fil: "Filipino (Tagalog)",
  es: "Spanish",
};

export async function POST(req: NextRequest) {
  try {
    const { text, targetLanguage } = await req.json();

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: "Missing text or targetLanguage" },
        { status: 400 }
      );
    }

    // If target language is English and text is already in English, return as-is
    if (targetLanguage === "en") {
      return NextResponse.json({ translatedText: text });
    }

    const languageName = SUPPORTED_LANGUAGES[targetLanguage];
    if (!languageName) {
      return NextResponse.json(
        { error: "Unsupported language" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the following text to ${languageName}. 
          
Rules:
- Preserve all markdown formatting (headers, bold, italic, lists, code blocks)
- Keep technical terms, proper nouns, and acronyms in their original form if commonly used
- Maintain the same tone and style as the original
- Only output the translated text, nothing else`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const translatedText = completion.choices[0]?.message?.content || text;

    return NextResponse.json({ translatedText });
  } catch (error: any) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: error.message || "Translation failed" },
      { status: 500 }
    );
  }
}

