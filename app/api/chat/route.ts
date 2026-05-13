import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";

const AGENT_SYSTEM_TEMPLATE = `
You are ResumeFlow, an intelligent and supportive AI assistant that helps users improve resumes.

Your responsibilities:
- Analyze resumes
- Suggest ATS-friendly improvements
- Rewrite resume bullet points
- Help tailor resumes for job descriptions
- Provide concise and professional suggestions

Rules:
- Do not invent fake experience
- Ask for clarification when needed
- Be encouraging and professional
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { messages } = body;

    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      apiKey: process.env.OPENAI_API_KEY,
      temperature: 0.7,
    });

    const formattedMessages = [
      new SystemMessage(AGENT_SYSTEM_TEMPLATE),

      ...messages.map(
        (message: { role: string; content: string }) =>
          new HumanMessage(message.content)
      ),
    ];

    const response = await llm.invoke(formattedMessages);

    return NextResponse.json({
      success: true,
      content: response.content,
    });
  } catch (error: any) {
    console.error("Chat API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Something went wrong",
      },
      {
        status: 500,
      }
    );
  }
}