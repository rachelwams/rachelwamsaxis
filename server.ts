import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Axis Action Mailer' });
});

app.post('/api/generate-emails', async (req, res) => {
  try {
    const { meetingNotes, senderName = 'Rachel', senderRole = 'Manager of Community Engagement', organization = 'Axis Connects', extraContext = '' } = req.body;

    if (!meetingNotes || typeof meetingNotes !== 'string' || !meetingNotes.trim()) {
      return res.status(400).json({ error: 'Meeting notes are required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check Settings > Secrets.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `You are an expert executive assistant and communication specialist for Rachel, Manager of Community Engagement at Axis Connects (a non-profit in Alberta).

CRITICAL EMAIL DRAFTING RULES (MANDATORY & STRICTLY ENFORCED):

1. GREETING RULE (ALWAYS START WITH A GREETING):
   - Every email MUST start with a proper greeting line, followed by a blank line (\\n\\n):
     - For SPONSORS / corporate outreach / external corporate partners: ALWAYS start with:
       "Hello [Name]," (or "Hello [Sponsor Name]," or specific name if known, e.g. "Hello Sarah,")
     - For VOLUNTEERS / mentors: ALWAYS start with:
       "Hi [Name]," (or "Hi [Volunteer Name]," or specific name if known, e.g. "Hi Alex,")
     - For speakers, venues, or general partners: use "Hello [Name]," or "Hi [Name],".

2. ABBREVIATIONS - LWAL DEFINITION:
   - "LWAL" stands ONLY and EXCLUSIVELY for "Lunch with a Leader".
   - NEVER invent or use any other meaning for LWAL or other abbreviations. If LWAL is mentioned, always refer to it as Lunch with a Leader (or LWAL / Lunch with a Leader).

3. SPONSOR OUTREACH PATTERN (MANDATORY FORMAT):
   - For any sponsor outreach email, you MUST follow this structure:
     a) GREETING: "Hello [Name],"
     b) INTRODUCTION: Introduce Rachel explicitly: "My name is Rachel, and I am the Manager of Community Engagement at Axis Connects."
     c) EVENT SIZE: Mention the event attendance/size (if in notes, e.g. "our upcoming gala for 250 attendees"; if not in notes, use "[SUGGESTED: expected attendance of 200+ community leaders, please confirm]" or "[PLACEHOLDER: expected event size, check shared Drive]").
     d) SPONSORSHIP ASKING & DELEGATE CLAUSE: Present the sponsorship opportunity and explicitly ask:
        "If someone else on your team handles community sponsorships or partnerships, could you please connect us or pass this along?"
     e) SIGN-OFF: End with:
Thank you!
Rachel

4. NEVER PRESENT MADE-UP DATES, WEEKDAYS, TIMES, OR VENUES AS FACT:
   - If a detail is explicitly mentioned in the meeting notes, use it exactly as provided.
   - If you think an extra detail would improve an email but it is NOT in the notes (for example, suggesting a reply-by date), you MAY include it, BUT you MUST mark it clearly as:
     [SUGGESTED: your idea, please confirm]
     Example: "Could you please let us know by [SUGGESTED: Friday, November 6, please confirm]?"
   - Never present any unmentioned date, weekday, time, or venue as an established fact.

5. MISSING DETAILS WITHOUT A SPECIFIC SUGGESTION:
   - If a needed detail is missing and you have no specific suggestion, write:
     [PLACEHOLDER: what's missing, check shared Drive]
     Example: "[PLACEHOLDER: venue room number, check shared Drive]" or "[PLACEHOLDER: sponsorship deck link, check shared Drive]"

6. EXACT SIGN-OFF RULE:
   - Every single email must end with EXACTLY this sign-off and NOTHING ELSE:
Thank you!
Rachel
   - Do NOT write "Warm regards", "Best regards", "Sincerely", or include job titles or organization names in the sign-off.
   - Do not include the sign-off inside the "body" field; put it in the "signOff" field as "Thank you!\\nRachel".

7. PARAGRAPH FORMATTING:
   - Format each email body with short, readable paragraphs separated by blank lines (\\n\\n).
   - NEVER produce a single wall or block of text. Break into 2-3 brief, scannable paragraphs.

8. TONE & PROHIBITED OPENINGS:
   - Keep the tone professional but friendly, never stiff.
   - PROHIBITED: NEVER open with "I hope you are having a wonderful week", "I hope this email finds you well", "I hope your week is off to a great start", or similar canned openings.
   - Open directly and naturally following the greeting.

TASK:
1. Identify all action items in the provided notes.
2. Separate into:
   - Action items assigned to Rachel (or Community Engagement) -> draft an email for each.
   - Action items assigned to other team members or general updates -> mark as SKIPPED with assignee name and reason.
3. For each Rachel action item, write:
   - "to": Recipient name/email, or "[PLACEHOLDER: recipient contact, check shared Drive]"
   - "subject": Clear, professional subject line
   - "body": Short paragraphs separated by \\n\\n, adhering to all rules above. Do not include sign-off in the body.
   - "signOff": "Thank you!\\nRachel"
4. "questionsForUser": Short list of key questions or reminders for Rachel, especially regarding any [SUGGESTED: ...] or [PLACEHOLDER: ...] items she should verify before hitting send.`;

    const promptText = `Here are the meeting notes:
---
${meetingNotes.trim()}
---

${extraContext ? `Rachel's notes/preferences:\n${extraContext.trim()}\n` : ''}

Draft follow-up emails strictly following all rules:
1. Start with greeting: "Hello [Name]," for sponsors, "Hi [Name]," for volunteers.
2. LWAL = Lunch with a Leader only.
3. Sponsor outreach: Introduce as "Rachel, Manager of Community Engagement at Axis Connects", mention event size, and ask for an intro if someone else handles sponsorships.
4. Unstated dates/details marked as [SUGGESTED: ..., please confirm] or [PLACEHOLDER: ..., check shared Drive].
5. Sign-off must be exactly "Thank you!\\nRachel".
6. Short paragraphs with \\n\\n line breaks, no canned "I hope you are having a wonderful week".`;

    let response: any;
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        attempts++;
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: promptText,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                rachelActionItems: {
                  type: Type.ARRAY,
                  description: `Action items assigned to Rachel`,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      details: { type: Type.STRING, description: 'Brief context or snippet from notes' },
                      deadline: { type: Type.STRING, description: 'Due date if mentioned, else "Not specified"' },
                      urgency: { type: Type.STRING, description: 'High, Medium, or Normal' },
                    },
                    required: ['id', 'title', 'details'],
                  },
                },
                skippedActionItems: {
                  type: Type.ARRAY,
                  description: `Action items not assigned to Rachel`,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      assignedTo: { type: Type.STRING, description: 'Person or department assigned' },
                      reasonSkipped: { type: Type.STRING, description: 'Why skipped (e.g. Assigned to Devon)' },
                    },
                    required: ['id', 'title', 'assignedTo', 'reasonSkipped'],
                  },
                },
                draftEmails: {
                  type: Type.ARRAY,
                  description: `Draft follow-up emails for each of Rachel's action items`,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      actionItemId: { type: Type.STRING },
                      actionItemTitle: { type: Type.STRING },
                      to: { type: Type.STRING, description: 'Recipient name/email or [PLACEHOLDER:...]' },
                      subject: { type: Type.STRING },
                      body: { type: Type.STRING, description: 'Email body text with short paragraphs (separated by \\n\\n) and no sign-off' },
                      signOff: { type: Type.STRING, description: 'Must be exactly "Thank you!\\nRachel"' },
                    },
                    required: ['id', 'actionItemId', 'actionItemTitle', 'to', 'subject', 'body', 'signOff'],
                  },
                },
                questionsForUser: {
                  type: Type.ARRAY,
                  description: `Short list of questions or placeholders Rachel needs to check`,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      question: { type: Type.STRING },
                      context: { type: Type.STRING, description: 'Why this question matters or which email/placeholder it relates to' },
                    },
                    required: ['id', 'question'],
                  },
                },
              },
              required: ['rachelActionItems', 'skippedActionItems', 'draftEmails', 'questionsForUser'],
            },
          },
        });
        break;
      } catch (err: any) {
        if (attempts < maxAttempts && (err?.status === 503 || err?.message?.includes('503') || err?.status === 429 || err?.message?.includes('429'))) {
          console.warn(`Gemini call attempt ${attempts} hit transient issue, retrying in ${1200 * attempts}ms...`);
          await new Promise((resolve) => setTimeout(resolve, 1200 * attempts));
          continue;
        }
        throw err;
      }
    }

    const rawJson = response.text || '{}';
    const parsedData = JSON.parse(rawJson);

    // POST-PROCESSING SAFETY NET TO GUARANTEE RACHEL'S RULES ARE 100% RESPECTED:
    if (Array.isArray(parsedData.draftEmails)) {
      parsedData.draftEmails = parsedData.draftEmails.map((draft: any) => {
        let body = (draft.body || '').trim();

        // Rule 8: Strip banned canned pleasantries if present
        const bannedOpenings = [
          /^(?:I\s+)?hope you are having a wonderful week[!,.]?\s*/i,
          /^(?:I\s+)?hope you're having a wonderful week[!,.]?\s*/i,
          /^(?:I\s+)?hope you are having a great week[!,.]?\s*/i,
          /^(?:I\s+)?hope you're having a great week[!,.]?\s*/i,
          /^(?:I\s+)?hope this email finds you well[!,.]?\s*/i,
          /^(?:I\s+)?hope your week is off to a wonderful start[!,.]?\s*/i,
          /^(?:I\s+)?hope your week is off to a great start[!,.]?\s*/i,
        ];
        for (const pattern of bannedOpenings) {
          body = body.replace(pattern, '').trim();
        }

        // Rule 1: Greetings enforcement
        const isSponsor = /sponsor|corporate|partnership/i.test(draft.actionItemTitle || '') || /sponsor|corporate|partnership/i.test(draft.subject || '');
        const isVolunteer = /volunteer|mentor/i.test(draft.actionItemTitle || '') || /volunteer|mentor/i.test(draft.subject || '');

        if (!/^(?:hello|hi|dear)\b/i.test(body)) {
          if (isSponsor) {
            body = `Hello [Name],\n\n${body}`;
          } else if (isVolunteer) {
            body = `Hi [Name],\n\n${body}`;
          } else {
            body = `Hello [Name],\n\n${body}`;
          }
        } else {
          // Standardize greeting prefix
          if (isSponsor && /^hi\s+/i.test(body)) {
            body = body.replace(/^hi\s+/i, 'Hello ');
          } else if (isVolunteer && /^hello\s+/i.test(body)) {
            body = body.replace(/^hello\s+/i, 'Hi ');
          }
        }

        // Ensure greeting is followed by clean blank line (\n\n)
        body = body.replace(/^((?:Hello|Hi|Dear)\s+[^,\n]+,)(?!\n\n)\s*\n?/i, '$1\n\n');

        // Also check if banned openings appear immediately after greeting
        for (const pattern of bannedOpenings) {
          body = body.replace(new RegExp(`((?:Hello|Hi|Dear)\\s+[^,\\n]+,\\n\\n)${pattern.source}`, 'i'), '$1').trim();
        }

        // Rule 6: Strip any duplicate trailing sign-off from body
        const trailingSignOffs = [
          /\n*(?:warm regards|best regards|kind regards|warmly|regards|sincerely|best|cheers)[\s\S]*$/i,
          /\n*thank you!\s*rachel[\s\S]*$/i,
          /\n*rachel\s*(?:manager of community engagement.*)?$/i,
        ];
        for (const pattern of trailingSignOffs) {
          body = body.replace(pattern, '').trim();
        }

        // Rule 6: Enforce strict sign-off: "Thank you!\nRachel"
        const strictSignOff = "Thank you!\nRachel";

        return {
          ...draft,
          body,
          signOff: strictSignOff,
        };
      });
    }

    return res.json(parsedData);
  } catch (error: any) {
    console.error('Error generating action emails:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to process meeting notes and generate emails.',
    });
  }
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Axis Action Mailer running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
