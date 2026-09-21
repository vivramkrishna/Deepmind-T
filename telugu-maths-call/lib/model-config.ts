import { promises as fs } from "node:fs";
import path from "node:path";

export const MODEL_CATALOG = [
  { id: "groq-gpt-oss", name: "Groq · GPT-OSS 120B", note: "Fast production default", key: "GROQ_API_KEY" },
  { id: "gemini", name: "Gemini 3.7 Flash", note: "Strong Telugu and reasoning", key: "GOOGLE_API_KEY" },
  { id: "groq-qwen", name: "Groq · Qwen 3.8 27B", note: "Fast multilingual fallback", key: "GROQ_API_KEY" },
  { id: "openrouter", name: "OpenRouter Free", note: "Variable emergency fallback", key: "OPENROUTER_API_KEY" },
] as const;
export type ModelId = typeof MODEL_CATALOG[number]["id"];
export type ModelConfig = { order: ModelId[]; updatedAt: string };

const CONFIG_FILE = path.join(process.cwd(), "data", "model-config.json");
const DEFAULT_ORDER: ModelId[] = ["groq-gpt-oss", "gemini", "groq-qwen", "openrouter"];

export async function getModelConfig(): Promise<ModelConfig> {
  try {
    const parsed = JSON.parse(await fs.readFile(CONFIG_FILE, "utf8")) as ModelConfig;
    const valid = parsed.order.filter((id): id is ModelId => MODEL_CATALOG.some((model) => model.id === id));
    return { order: valid.length ? valid : DEFAULT_ORDER, updatedAt: parsed.updatedAt || new Date(0).toISOString() };
  } catch {
    return { order: DEFAULT_ORDER, updatedAt: new Date(0).toISOString() };
  }
}

export async function saveModelConfig(order: ModelId[]) {
  const unique = [...new Set(order)].filter((id): id is ModelId => MODEL_CATALOG.some((model) => model.id === id));
  if (!unique.length) throw new Error("At least one model is required");
  const value: ModelConfig = { order: unique, updatedAt: new Date().toISOString() };
  await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(value, null, 2));
  return value;
}

export function publicModelConfig(config: ModelConfig) {
  const models = MODEL_CATALOG.map((model) => ({ ...model, available: Boolean(process.env[model.key]) }));
  return {
    ...config,
    models,
    primary: config.order.map((id) => models.find((model) => model.id === id)).find((model) => model?.available) || models.find((model) => model.id === config.order[0]) || models[0],
  };
}
