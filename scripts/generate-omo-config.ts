#!/usr/bin/env bun
import { writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { PROVIDER_ID } from "../lib/constants"
import { OMO_MODEL_ASSIGNMENTS } from "../lib/models/registry"

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputPath = join(__dirname, "../assets/default-omo-config.json")

const OMO_PATH = process.env.OMO_PATH || "/tmp/oh-my-opencode"

async function main() {
  const { generateModelConfig } = await import(`${OMO_PATH}/src/cli/model-fallback.ts`)
  const { AGENT_MODEL_REQUIREMENTS, CATEGORY_MODEL_REQUIREMENTS } = await import(`${OMO_PATH}/src/shared/model-requirements.ts`)
  
  const installConfig = {
    hasClaude: true,
    hasOpenAI: true,
    hasGemini: true,
    hasOpencodeZen: false,
    hasCopilot: false,
    hasZaiCodingPlan: false,
    hasKimiForCoding: false,
    isMax20: false,
  }

  const omoConfig = generateModelConfig(installConfig)

  const convertedConfig = {
    $schema: omoConfig.$schema,
    agents: {} as Record<string, any>,
    categories: {} as Record<string, any>,
  }

  if (omoConfig.agents) {
    for (const [name, agent] of Object.entries(omoConfig.agents)) {
      const agentConfig = agent as any
      const originalModel = agentConfig.model
      const aicodewithModel = convertToAicodewithModel(originalModel)
      
      // Copy all fields from original config, not just model
      convertedConfig.agents[name] = {
        ...agentConfig,
        model: aicodewithModel
      }
    }
  }

  const omoAgentNames = Object.keys(AGENT_MODEL_REQUIREMENTS)
  for (const agentName of Object.keys(OMO_MODEL_ASSIGNMENTS.agents)) {
    if (!omoAgentNames.includes(agentName) && OMO_MODEL_ASSIGNMENTS.agents[agentName]) {
      convertedConfig.agents[agentName] = { model: OMO_MODEL_ASSIGNMENTS.agents[agentName] }
    }
  }

  if (omoConfig.categories) {
    for (const [name, category] of Object.entries(omoConfig.categories)) {
      const categoryConfig = category as any
      const originalModel = categoryConfig.model
      const aicodewithModel = convertToAicodewithModel(originalModel)
      
      // Copy all fields from original config, not just model
      convertedConfig.categories[name] = {
        ...categoryConfig,
        model: aicodewithModel
      }
    }
  }

  const omoCategoryNames = Object.keys(CATEGORY_MODEL_REQUIREMENTS)
  for (const categoryName of Object.keys(OMO_MODEL_ASSIGNMENTS.categories)) {
    if (!omoCategoryNames.includes(categoryName) && OMO_MODEL_ASSIGNMENTS.categories[categoryName]) {
      convertedConfig.categories[categoryName] = { model: OMO_MODEL_ASSIGNMENTS.categories[categoryName] }
    }
  }

  // Override reasoning effort for GPT models to prevent excessive thinking
  // xhigh causes models to think for very long time, which looks like "stuck"
  const REASONING_OVERRIDES: Record<string, { variant?: string }> = {
    // Categories
    "ultrabrain": { variant: "high" },  // xhigh -> high (still deep reasoning, but faster)
    
    // Agents - keep medium for most, high for strategic ones
    "oracle": { variant: "high" },      // Strategic reasoning
    "momus": { variant: "medium" },     // Plan review
  }

  // Apply overrides
  for (const [name, override] of Object.entries(REASONING_OVERRIDES)) {
    if (convertedConfig.categories[name]) {
      convertedConfig.categories[name] = {
        ...convertedConfig.categories[name],
        ...override
      }
    }
    if (convertedConfig.agents[name]) {
      convertedConfig.agents[name] = {
        ...convertedConfig.agents[name],
        ...override
      }
    }
  }

  writeFileSync(outputPath, JSON.stringify(convertedConfig, null, 2) + "\n")

  const agentCount = Object.keys(convertedConfig.agents).length
  const categoryCount = Object.keys(convertedConfig.categories).length
  console.log(`Generated default-omo-config.json with ${agentCount} agents and ${categoryCount} categories`)
  console.log(`Source: oh-my-opencode at ${OMO_PATH} + custom agents/categories`)
}

function convertToAicodewithModel(omoModel: string): string {
  const [provider, model] = omoModel.split("/")
  
  const modelMap: Record<string, string> = {
    "claude-opus-4.6": "claude-opus-4-6-20260205",
    "claude-opus-4-6": "claude-opus-4-6-20260205",
    "claude-sonnet-4.6": "claude-sonnet-4-6",
    "claude-sonnet-4-6": "claude-sonnet-4-6",
    "claude-sonnet-4.5": "claude-sonnet-4-5-20250929",
    "claude-sonnet-4-5": "claude-sonnet-4-5-20250929",
    "claude-haiku-4.5": "claude-haiku-4-5-20251001",
    "claude-haiku-4-5": "claude-haiku-4-5-20251001",
    "gpt-5.3-codex": "gpt-5.3-codex",
    "gpt-5.2": "gpt-5.2",
    "gemini-3-pro": "gemini-3-pro",
    "gemini-3-pro-preview": "gemini-3-pro",
    "gemini-3-flash": "gemini-3-pro",
    "gemini-3-flash-preview": "gemini-3-pro",
  }

  const mappedModel = modelMap[model] || model
  return `${PROVIDER_ID}/${mappedModel}`
}

main()
