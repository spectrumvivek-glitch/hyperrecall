import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ?? "dummy",
});

const SYSTEM_PROMPT = `You are Scholar, an expert AI tutor specializing in helping students learn and retain knowledge through spaced repetition. You provide clear, structured explanations that make complex concepts easy to understand and remember.

When given a question or topic:
1. Provide a clear, concise explanation
2. Break it down into numbered steps or key points
3. Give a brief summary for quick recall
4. Suggest 2-3 follow-up questions to deepen understanding

Format your response as valid JSON with this exact structure:
{
  "explanation": "A clear, detailed explanation of the concept",
  "steps": ["Step or key point 1", "Step or key point 2", "Step or key point 3"],
  "summary": "One or two sentences for quick recall",
  "followUp": ["Follow-up question 1?", "Follow-up question 2?", "Follow-up question 3?"]
}

Keep explanations accurate and educational. Be encouraging and supportive.`;

router.post("/tutor/ask", async (req, res) => {
  try {
    const { question, imageBase64, noteContext } = req.body as {
      question?: string;
      imageBase64?: string;
      noteContext?: string;
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

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
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
