// src/lib/tools/gdocs.ts
// add reumemaker pdf 

/* eslint-disable @typescript-eslint/no-explicit-any */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { google } from "googleapis";

import { auth0 } from "@/lib/auth0";
import { extractTextFromGoogleDoc } from "@/lib/google-utils";

/* -------------------------------------------------------------------------- */
/*                            READ GOOGLE DOC TOOL                            */
/* -------------------------------------------------------------------------- */

export const readGoogleDocContent = tool(
  async ({ docId }) => {
    try {
      // Get Auth0 access token
      const accessToken = await auth0.getAccessToken();

      if (!accessToken?.token) {
        throw new Error("Google access token not found");
      }

      // Configure Google OAuth
      const auth = new google.auth.OAuth2();

      auth.setCredentials({
        access_token: accessToken.token,
      });

      // Google Docs API
      const docs = google.docs({
        version: "v1",
        auth,
      });

      // Fetch document
      const response = await docs.documents.get({
        documentId: docId,
      });

      const body = response.data.body?.content || [];

      // Extract readable text
      const blocks = await extractTextFromGoogleDoc(body);

      return {
        success: true,
        blocks,
      };
    } catch (error: any) {
      console.error(
        "Read Google Doc Error:",
        error
      );

      return {
        success: false,
        error: error.message,
      };
    }
  },
  {
    name: "readGoogleDocContent",

    description:
      "Reads and extracts plain text content from a Google Docs document using the document ID.",

    schema: z.object({
      docId: z
        .string()
        .describe(
          "Google Docs document ID from URL."
        ),
    }),
  }
);

/* -------------------------------------------------------------------------- */
/*                         CREATE RESUME GOOGLE DOC TOOL                      */
/* -------------------------------------------------------------------------- */

export const createGoogleDocResume = tool(
  async ({
    docTitle,
    fullName,
    email,
    phone,
    location,
    linkedin,
    github,
    experience,
    education,
    skills,
    projects,
  }) => {
    try {
      // Get Auth0 access token
      const accessToken = await auth0.getAccessToken();

      if (!accessToken?.token) {
        throw new Error("Google access token not found");
      }

      // Configure Google OAuth
      const auth = new google.auth.OAuth2();

      auth.setCredentials({
        access_token: accessToken.token,
      });

      // Google Docs API
      const docs = google.docs({
        version: "v1",
        auth,
      });

      // Create Google Doc
      const created = await docs.documents.create({
        requestBody: {
          title: `${fullName} - ${docTitle}`,
        },
      });

      if (!created.data.documentId) {
        throw new Error(
          "Failed to create Google Doc"
        );
      }

      const docId = created.data.documentId;

      let index = 1;

      const requests: any[] = [];

      /* ----------------------------- UTILITIES ----------------------------- */

      const addText = (text: string) => {
        requests.push({
          insertText: {
            location: { index },
            text,
          },
        });

        index += text.length;
      };

      const bold = (
        startIndex: number,
        endIndex: number
      ) => {
        requests.push({
          updateTextStyle: {
            range: {
              startIndex,
              endIndex,
            },
            textStyle: {
              bold: true,
            },
            fields: "bold",
          },
        });
      };

      const center = (
        startIndex: number,
        endIndex: number
      ) => {
        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex,
              endIndex,
            },
            paragraphStyle: {
              alignment: "CENTER",
            },
            fields: "alignment",
          },
        });
      };

      const addSection = (title: string) => {
        const start = index;

        addText(`${title}\n`);

        bold(start, start + title.length);

        requests.push({
          updateTextStyle: {
            range: {
              startIndex: start,
              endIndex: start + title.length,
            },
            textStyle: {
              foregroundColor: {
                color: {
                  rgbColor: {
                    red: 0.1,
                    green: 0.1,
                    blue: 0.1,
                  },
                },
              },
              fontSize: {
                magnitude: 14,
                unit: "PT",
              },
            },
            fields:
              "foregroundColor,fontSize",
          },
        });

        center(start, start + title.length);
      };

      const addBullet = (text: string) => {
        const start = index;

        addText(`${text}\n`);

        requests.push({
          createParagraphBullets: {
            range: {
              startIndex: start,
              endIndex: index,
            },
            bulletPreset:
              "BULLET_DISC_CIRCLE_SQUARE",
          },
        });
      };

      const addTitle = (text: string) => {
        const start = index;

        addText(text);

        bold(start, index);
      };

      /* ------------------------------ HEADER ------------------------------ */

      addSection(fullName);

      const contactLine = `${email} | ${phone} | ${location}\n`;

      const contactStart = index;

      addText(contactLine);

      center(contactStart, index);

      const socialLine = `${linkedin} | ${github}\n\n`;

      const socialStart = index;

      addText(socialLine);

      center(socialStart, index);

      /* ---------------------------- EXPERIENCE ---------------------------- */

      addSection("Experience");

      for (const exp of experience) {
        addTitle(
          `${exp.role} - ${exp.company}\n`
        );

        addText(`${exp.duration}\n`);

        for (const bullet of exp.bullets) {
          addBullet(bullet);
        }

        addText("\n");
      }

      /* ----------------------------- EDUCATION ---------------------------- */

      addSection("Education");

      for (const edu of education) {
        addTitle(
          `${edu.degree} - ${edu.institution}\n`
        );

        addText(`${edu.duration}\n\n`);
      }

      /* ------------------------------ PROJECTS ---------------------------- */

      addSection("Projects");

      for (const project of projects) {
        addTitle(`${project.name}\n`);

        addText(
          `${project.description}\n\n`
        );
      }

      /* ------------------------------- SKILLS ----------------------------- */

      addSection("Skills");

      addText(`${skills.join(" • ")}\n`);

      /* ----------------------------- UPDATE DOC --------------------------- */

      await docs.documents.batchUpdate({
        documentId: docId,

        requestBody: {
          requests,
        },
      });

      return {
        success: true,

        documentUrl: `https://docs.google.com/document/d/${docId}/edit`,
      };
    } catch (error: any) {
      console.error(
        "Create Google Resume Error:",
        error
      );

      return {
        success: false,
        error: error.message,
      };
    }
  },
  {
    name: "createGoogleDocResume",

    description:
      "Creates a professional resume inside Google Docs and returns the document URL.",

    schema: z.object({
      docTitle: z.string(),

      fullName: z.string(),

      email: z.string(),

      phone: z.string(),

      location: z.string(),

      linkedin: z.string().url(),

      github: z.string().url(),

      experience: z.array(
        z.object({
          role: z.string(),
          company: z.string(),
          duration: z.string(),
          bullets: z.array(z.string()),
        })
      ),

      education: z.array(
        z.object({
          degree: z.string(),
          institution: z.string(),
          duration: z.string(),
        })
      ),

      skills: z.array(z.string()),

      projects: z.array(
        z.object({
          name: z.string(),
          description: z.string(),
        })
      ),
    }),
  }
);