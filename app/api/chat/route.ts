import { NextRequest, NextResponse } from "next/server";

import Groq from "groq-sdk";

import { readGoogleDocContent } from "@/lib/tools/gdocs";
import { createGmailDraft } from "@/lib/tools/gmail";
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `
You are ResumeFlow AI assistant helping users improve resumes.

Your abilities:
- Review resumes
- Suggest ATS improvements
- Improve resume bullet points
- Rewrite professional summaries
- Analyze resume strengths and weaknesses
- Review Google Docs resume content automatically

Rules:
- Be concise and actionable
- Use bullet points when appropriate
- Never invent fake experience
- Give constructive professional feedback
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { messages } = body;

    const latestMessage =
      messages[messages.length - 1]?.content || "";
    if (
      latestMessage.toLowerCase().includes("send email")
    ) {
      const draft =
        await createGmailDraft({
          to: "recruiter@example.com",

          subject: "Resume Submission",

          message:
            "Hello,\n\nPlease find my resume attached.\n\nRegards,\nNagesh",
        });

      return NextResponse.json({
        content: `Email draft created successfully. Draft ID: ${draft.draftId}`,
      });
    }

    /* ------------------------------------------------------------------ */
    /*                    Detect Google Docs URL                          */
    /* ------------------------------------------------------------------ */

    const googleDocMatch =
      latestMessage.match(
        /https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9-_]+)/
      );

    let extractedResumeText = "";

    if (googleDocMatch) {
      const docId = googleDocMatch[1];

      console.log(
        "Google Doc detected:",
        docId
      );

      const result =
        await readGoogleDocContent.invoke({
          docId,
        });

      if (result?.success) {
        extractedResumeText = JSON.stringify(
          result.blocks,
          null,
          2
        );
      } else {
        extractedResumeText =
          "Unable to read Google Doc.";
      }
    }

    /* ------------------------------------------------------------------ */
    /*                          Final Prompt                              */
    /* ------------------------------------------------------------------ */

    const finalUserPrompt = extractedResumeText
      ? `
The user shared this resume content from Google Docs:

${extractedResumeText}

User request:
${latestMessage}

Please review and improve this resume professionally.
`
      : latestMessage;

    /* ------------------------------------------------------------------ */
    /*                          Groq Completion                           */
    /* ------------------------------------------------------------------ */

    const completion =
      await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",

        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },

          ...messages.slice(0, -1),

          {
            role: "user",
            content: finalUserPrompt,
          },
        ],
      });

    return NextResponse.json({
      content:
        completion.choices[0]?.message?.content ||
        "No response",
    });
  } catch (error: any) {
    console.error(
      "Chat API Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}