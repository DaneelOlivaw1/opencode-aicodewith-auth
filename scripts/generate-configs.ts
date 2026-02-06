#!/usr/bin/env bun
/**
 * @file scripts/generate-configs.ts
 * @description Generate all config files from lib/models.ts
 *
 * Usage: bun run generate
 */

import { writeFileSync } from "node:fs"
import path from "node:path"
import { generateProviderConfig, generateOmoConfig } from "../lib/models"

const ROOT_DIR = path.join(import.meta.dir, "..")

const PROVIDER_CONFIG_PATH = path.join(ROOT_DIR, "lib/provider-config.json")
const OMO_CONFIG_PATH = path.join(ROOT_DIR, "assets/default-omo-config.json")

// Generate provider-config.json
const providerConfig = generateProviderConfig()
writeFileSync(PROVIDER_CONFIG_PATH, JSON.stringify(providerConfig, null, 2) + "\n")
console.log(`✓ Generated ${PROVIDER_CONFIG_PATH}`)

// Generate default-omo-config.json
const omoConfig = generateOmoConfig()
writeFileSync(OMO_CONFIG_PATH, JSON.stringify(omoConfig, null, 2) + "\n")
console.log(`✓ Generated ${OMO_CONFIG_PATH}`)

console.log("\nDone! All configs generated from lib/models.ts")
