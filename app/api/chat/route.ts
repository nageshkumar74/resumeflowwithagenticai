import { NextRequest, NextResponse } from "next/server";

import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `
You are ResumeFlow AI assistant helping users improve resumes.
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { messages } = body;

    const completion =
      await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",

        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },

          ...messages,
        ],
      });

    return NextResponse.json({
      content:
        completion.choices[0]?.message?.content ||
        "No response",
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}