import { GoogleGenAI } from "@google/genai"
import { config } from "dotenv"

config({ path: ".env" })

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const response = await ai.models.generateContent({
  model: "gemini-3.5-flash",
  contents: "Reply with just the word: working",
})

console.log(response.text)