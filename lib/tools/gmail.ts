import { google } from "googleapis";

import { auth0 } from "@/lib/auth0";

export async function createGmailDraft({
  to,
  subject,
  message,
}: {
  to: string;
  subject: string;
  message: string;
}) {
  try {
    const accessToken =
      await auth0.getAccessToken();

    if (!accessToken?.token) {
      throw new Error(
        "Google access token missing"
      );
    }

    const auth = new google.auth.OAuth2();

    auth.setCredentials({
      access_token: accessToken.token,
    });

    const gmail = google.gmail({
      version: "v1",
      auth,
    });

    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      message,
    ];

    const email = emailLines.join("\n");

    const encodedMessage = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response =
      await gmail.users.drafts.create({
        userId: "me",

        requestBody: {
          message: {
            raw: encodedMessage,
          },
        },
      });

    return {
      success: true,
      draftId: response.data.id,
    };
  } catch (error: any) {
    console.error(
      "Create Gmail Draft Error:",
      error
    );

    return {
      success: false,
      error: error.message,
    };
  }
}