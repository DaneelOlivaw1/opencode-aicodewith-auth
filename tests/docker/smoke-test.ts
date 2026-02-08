import { getActiveModels, PROVIDER_ID } from "../../lib/models/registry"

interface TestResult {
  model: string
  success: boolean
  responsePreview?: string
  error?: string
  durationMs: number
}

async function waitForServer(baseUrl: string, maxRetries = 30): Promise<void> {
  console.log(`⏳ Waiting for OpenCode server at ${baseUrl}...`)
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${baseUrl}/health`, { method: "GET" })
      if (res.ok) {
        console.log(`✅ Server is ready!`)
        return
      }
    } catch (e) {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    if ((i + 1) % 5 === 0) {
      console.log(`   Still waiting... (${i + 1}/${maxRetries})`)
    }
  }
  
  throw new Error(`Server did not become ready after ${maxRetries} seconds`)
}

async function testModel(
  baseUrl: string,
  modelId: string
): Promise<TestResult> {
  const fullModelId = `${PROVIDER_ID}/${modelId}`
  const start = Date.now()
  
  console.log(`\n🧪 Testing ${fullModelId}...`)
  
  try {
    // Create session
    const sessionRes = await fetch(`${baseUrl}/v2/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    
    if (!sessionRes.ok) {
      throw new Error(`Failed to create session: ${sessionRes.status} ${await sessionRes.text()}`)
    }
    
    const { data: session } = await sessionRes.json()
    
    // Send prompt
    const promptRes = await fetch(`${baseUrl}/v2/sessions/${session.id}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parts: [{ type: "text", text: "Say 'OK' if you can hear me" }],
        model: {
          providerID: PROVIDER_ID,
          modelID: modelId,
        },
      }),
    })
    
    if (!promptRes.ok) {
      const errorText = await promptRes.text()
      throw new Error(`Prompt failed: ${promptRes.status} ${errorText}`)
    }
    
    const promptResponseText = await promptRes.text()
    let response
    try {
      const parsed = JSON.parse(promptResponseText)
      response = parsed.data
    } catch (e) {
      throw new Error(`Failed to parse JSON response: ${promptResponseText.slice(0, 200)}`)
    }
    const assistantMessage = response?.parts?.find((p: any) => p.type === "text")
    const responseText = assistantMessage?.text || "(no text response)"
    
    const duration = Date.now() - start
    console.log(`✅ ${fullModelId} responded in ${duration}ms`)
    console.log(`   Response: "${responseText.slice(0, 100)}${responseText.length > 100 ? '...' : ''}"`)

    return {
      model: fullModelId,
      success: true,
      responsePreview: responseText.slice(0, 200),
      durationMs: duration,
    }
  } catch (error) {
    const duration = Date.now() - start
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.log(`❌ ${fullModelId} failed after ${duration}ms: ${errorMsg}`)
    
    return {
      model: fullModelId,
      success: false,
      error: errorMsg,
      durationMs: duration,
    }
  }
}

async function main() {
  console.log("🚀 AICodewith Model Smoke Test (HTTP Server)")
  console.log("==============================================\n")

  if (!process.env.AICODEWITH_API_KEY) {
    console.error("❌ AICODEWITH_API_KEY environment variable is required")
    process.exit(1)
  }

  const baseUrl = process.env.OPENCODE_SERVER_URL || "http://localhost:4096"
  console.log(`📡 Connecting to OpenCode server at ${baseUrl}`)

  const activeModels = getActiveModels()
  console.log(`\nFound ${activeModels.length} active models:`)
  activeModels.forEach(m => console.log(`  - ${m.id} (${m.displayName})`))

  try {
    // Wait for server to be ready
    await waitForServer(baseUrl)

    // Set API key
    console.log("\n🔑 Setting API key...")
    const authRes = await fetch(`${baseUrl}/v2/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerID: PROVIDER_ID,
        auth: { type: "api", key: process.env.AICODEWITH_API_KEY },
      }),
    })
    
    if (!authRes.ok) {
      throw new Error(`Failed to set auth: ${authRes.status} ${await authRes.text()}`)
    }

    const results: TestResult[] = []
    
    for (const model of activeModels) {
      const result = await testModel(baseUrl, model.id)
      results.push(result)
    }

    console.log("\n\n📊 Summary")
    console.log("==========")
    
    const passed = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    
    console.log(`\n✅ Passed: ${passed.length}/${results.length}`)
    passed.forEach(r => {
      console.log(`   ${r.model} (${r.durationMs}ms)`)
    })
    
    if (failed.length > 0) {
      console.log(`\n❌ Failed: ${failed.length}/${results.length}`)
      failed.forEach(r => {
        console.log(`   ${r.model}: ${r.error}`)
      })
    }

    process.exit(failed.length > 0 ? 1 : 0)

  } catch (error) {
    console.error("\n💥 Fatal error:", error)
    process.exit(1)
  }
}

main()
