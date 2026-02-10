import { transformRequestForCodex } from "../lib/request/fetch-helpers"

const capturedRequestBody = {
  model: "gpt-5.3-codex",
  input: [
    { role: "developer", content: "System prompt" },
    { role: "user", content: [{ type: "input_text", text: "hi" }] },
    { type: "item_reference", id: "msg_062420f006f4f47201698af8acf180819186b552452948a2c0" },
    { role: "user", content: [{ type: "input_text", text: "hi again" }] }
  ],
  store: false,
  previousResponseId: "response-123",
  tools: [],
  max_output_tokens: 32000
}

async function reproduce() {
  console.log("INPUT: item_reference present:", capturedRequestBody.input.some((item: any) => item.type === "item_reference"))
  
  const init: RequestInit = { method: "POST", body: JSON.stringify(capturedRequestBody) }
  const result = await transformRequestForCodex(init)
  
  if (!result) {
    console.log("RESULT: Transform returned undefined - BUG REPRODUCED (silent failure)")
    process.exit(1)
  }
  
  const transformedBody = JSON.parse(result.updatedInit.body as string)
  const hasItemRef = transformedBody.input?.some((item: any) => item.type === "item_reference")
  
  console.log("OUTPUT: item_reference present:", hasItemRef)
  console.log("OUTPUT: previousResponseId present:", !!transformedBody.previousResponseId)
  
  if (hasItemRef) {
    console.log("BUG REPRODUCED: item_reference not filtered")
    process.exit(1)
  }
  
  console.log("BUG NOT REPRODUCED: Filter working correctly")
  process.exit(0)
}

reproduce().catch((error) => { console.error("ERROR:", error); process.exit(1) })
