import { openai } from "@ai-sdk/openai";

export function getPrimaryModel() {
  return openai("gpt-4o-mini");
}
