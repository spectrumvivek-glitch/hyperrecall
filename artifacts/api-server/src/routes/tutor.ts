import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ?? "dummy",
});

const SYSTEM_PROMPT = `You are Scholar, an expert AI tutor inside Recallify — a spaced repetition learning app. You help students deeply understand concepts and retain them long-term.

When given a question or topic, respond with a structured JSON object. Be thorough but concise. Encourage the student and guide deeper thinking.

Respond ONLY with valid JSON in this exact structure:
{
  "explanation": "A clear, engaging explanation (2-4 paragraphs if needed)",
  "steps": ["Key point or step 1", "Key point or step 2", "Key point or step 3"],
  "summary": "One sentence the student can use as a memory hook",
  "followUp": ["Follow-up question 1?", "Follow-up question 2?", "Follow-up question 3?"]
}

Rules:
- Use analogies and examples to make concepts stick
- Steps should be actionable insights or memorable key points
- Summary should be a single memorable sentence
- Follow-up questions should progressively deepen understanding
- If the student attaches an image, analyze it thoroughly`;

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

router.post("/tutor/ask", async (req, res) => {
  try {
    const { question, imageBase64, noteContext, history } = req.body as {
      question?: string;
      imageBase64?: string;
      noteContext?: string;
      history?: HistoryMessage[];
    };

    if (!question || typeof question !== "string" || question.trim() === "") {
      res.status(400).json({ error: "question is required" });
      return;
    }

    const userContent: OpenAI.ChatCompletionContentPart[] = [];

    if (imageBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
      });
    }

    const questionText = noteContext
      ? `Context from my study note: "${noteContext}"\n\nMy question: ${question}`
      : question;

    userContent.push({ type: "text", text: questionText });

    // Build message history (last 5 exchanges = 10 messages)
    const historyMessages: OpenAI.ChatCompletionMessageParam[] = (history ?? [])
      .slice(-10)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 800,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...historyMessages,
        { role: "user", content: userContent },
      ],
    });

    const rawContent = response.choices[0]?.message?.content ?? "";

    let parsed: {
      explanation: string;
      steps: string[];
      summary: string;
      followUp: string[];
    };

    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
    } catch {
      parsed = {
        explanation: rawContent,
        steps: [],
        summary: "",
        followUp: [],
      };
    }

    res.json(parsed);
  } catch (err) {
    console.error("Tutor error:", err);
    res.status(500).json({ error: "Failed to get AI response. Please try again." });
  }
});

export default router;
