#!/usr/bin/env node

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const PACKAGE_NAME = "opencode-aicodewith-auth";
const PROVIDER_ID = "aicodewith";
const PROVIDER_NAME = "AICodewith";
const PLUGIN_ENTRY = new URL("../index.ts", import.meta.url).href;
const PROVIDER_NPM = new URL("../provider.ts", import.meta.url).href;
const DEFAULT_API = "https://api.openai.com/v1";
const DEFAULT_ENV = ["AICODEWITH_API_KEY"];

const IMAGE_MODALITIES = { input: ["text", "image"], output: ["text"] };

const MODEL_CONFIGS = {
  "gpt-5.2-codex": { name: "GPT-5.2 Codex", modalities: IMAGE_MODALITIES },
  "gpt-5.2": { name: "GPT-5.2", modalities: IMAGE_MODALITIES },
  "claude-sonnet-4-5-20250929": { name: "Claude Sonnet 4.5", modalities: IMAGE_MODALITIES },
  "claude-opus-4-5-20251101": { name: "Claude Opus 4.5", modalities: IMAGE_MODALITIES },
  "gemini-3-pro-high": { name: "Gemini 3 Pro", modalities: IMAGE_MODALITIES },
};

const ALLOWED_MODEL_IDS = Object.keys(MODEL_CONFIGS);
const ALLOWED_MODEL_SET = new Set(ALLOWED_MODEL_IDS);

const home = process.env.OPENCODE_TEST_HOME || os.homedir();
const configRoot = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
const configDir = path.join(configRoot, "opencode");
const configPath = path.join(configDir, "opencode.json");

async function readJson(filePath) {
  try {
    const text = await readFile(filePath, "utf-8");
    return JSON.parse(text);
  } catch {
    return;
  }
}

function toModelMap(ids, existing = {}) {
  return ids.reduce((acc, id) => {
    const existingConfig = Object.prototype.hasOwnProperty.call(existing, id) ? existing[id] : {};
    const defaultConfig = MODEL_CONFIGS[id] ?? {};
    acc[id] = { ...defaultConfig, ...(typeof existingConfig === 'object' ? existingConfig : {}) };
    return acc;
  }, {});
}

function ensurePluginEntry(list) {
  if (!Array.isArray(list)) return [PLUGIN_ENTRY];
  const hasPlugin = list.some(
    (entry) =>
      typeof entry === "string" &&
      (entry === PLUGIN_ENTRY || entry === PACKAGE_NAME || entry.startsWith(`${PACKAGE_NAME}@`)),
  );
  return hasPlugin ? list : [...list, PLUGIN_ENTRY];
}

function applyProviderConfig(config) {
  if (!config || typeof config !== "object") return false;

  let changed = false;

  const providerMap = config.provider && typeof config.provider === "object" ? config.provider : {};
  const existing = providerMap[PROVIDER_ID] && typeof providerMap[PROVIDER_ID] === "object" ? providerMap[PROVIDER_ID] : {};
  const existingModels = existing.models && typeof existing.models === "object" ? existing.models : {};

  const next = { ...existing };

  if (!next.name) {
    next.name = PROVIDER_NAME;
    changed = true;
  }

  if (!Array.isArray(next.env)) {
    next.env = DEFAULT_ENV;
    changed = true;
  }

  if (
    !next.npm ||
    (typeof next.npm === "string" &&
      (next.npm === PACKAGE_NAME || next.npm.startsWith(`${PACKAGE_NAME}@`)))
  ) {
    next.npm = PROVIDER_NPM;
    changed = true;
  }

  if (!next.api) {
    next.api = DEFAULT_API;
    changed = true;
  }

  const hasExtraModels = Object.keys(existingModels).some((id) => !ALLOWED_MODEL_SET.has(id));
  const hasMissingModels = ALLOWED_MODEL_IDS.some(
    (id) => !Object.prototype.hasOwnProperty.call(existingModels, id),
  );
  if (!next.models || hasExtraModels || hasMissingModels) {
    next.models = toModelMap(ALLOWED_MODEL_IDS, existingModels);
    changed = true;
  }

  providerMap[PROVIDER_ID] = next;
  if (config.provider !== providerMap) {
    config.provider = providerMap;
    changed = true;
  }

  const nextPlugins = ensurePluginEntry(config.plugin);
  if (nextPlugins !== config.plugin) {
    config.plugin = nextPlugins;
    changed = true;
  }

  return changed;
}

async function main() {
  const config = (await readJson(configPath)) ?? {};

  const changed = applyProviderConfig(config);
  if (!changed) return;

  await mkdir(configDir, { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
}

main().catch((error) => {
  console.error(
    `[${PACKAGE_NAME}] Failed to update opencode config: ${error instanceof Error ? error.message : error}`,
  );
});
