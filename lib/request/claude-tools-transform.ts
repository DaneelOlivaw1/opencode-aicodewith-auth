/**
 * @file claude-tools-transform.ts
 * @input  Claude API request body and response
 * @output Transformed request/response with mcp_ prefix handling
 * @pos    Handles tool name transformation to bypass Claude Code OAuth restrictions
 *
 * 📌 On change: Update this header + lib/request/ARCHITECTURE.md
 */

const TOOL_PREFIX = "mcp_";

interface ToolDefinition {
  name?: string;
  [key: string]: unknown;
}

interface ContentBlock {
  type: string;
  name?: string;
  [key: string]: unknown;
}

interface Message {
  content?: ContentBlock[];
  [key: string]: unknown;
}

interface ClaudeRequestBody {
  tools?: ToolDefinition[];
  messages?: Message[];
  [key: string]: unknown;
}

/**
 * Transform Claude API request to add mcp_ prefix to tool names
 * This bypasses the "This credential is only authorized for use with Claude Code" error
 */
export function transformClaudeRequest(init?: RequestInit): RequestInit | undefined {
  if (!init?.body || typeof init.body !== "string") {
    return init;
  }

  try {
    const parsed = JSON.parse(init.body) as ClaudeRequestBody;
    let modified = false;

    // Add prefix to tools definitions
    if (parsed.tools && Array.isArray(parsed.tools)) {
      parsed.tools = parsed.tools.map((tool) => {
        if (tool.name) {
          modified = true;
          return {
            ...tool,
            name: `${TOOL_PREFIX}${tool.name}`,
          };
        }
        return tool;
      });
    }

    // Add prefix to tool_use blocks in messages
    if (parsed.messages && Array.isArray(parsed.messages)) {
      parsed.messages = parsed.messages.map((msg) => {
        if (msg.content && Array.isArray(msg.content)) {
          const newContent = msg.content.map((block) => {
            if (block.type === "tool_use" && block.name) {
              modified = true;
              return { ...block, name: `${TOOL_PREFIX}${block.name}` };
            }
            return block;
          });
          return { ...msg, content: newContent };
        }
        return msg;
      });
    }

    if (!modified) {
      return init;
    }

    return {
      ...init,
      body: JSON.stringify(parsed),
    };
  } catch (e) {
    // If parsing fails, return original init
    return init;
  }
}

/**
 * Transform Claude API response to remove mcp_ prefix from tool names
 * This restores the original tool names in the streaming response
 */
export function transformClaudeResponse(response: Response): Response {
  if (!response.body) {
    return response;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        let text = decoder.decode(value, { stream: true });
        // Remove mcp_ prefix from all tool names in the response
        text = text.replace(new RegExp(`"name"\\s*:\\s*"${TOOL_PREFIX}([^"]+)"`, "g"), '"name": "$1"');
        controller.enqueue(encoder.encode(text));
      } catch (error) {
        controller.error(error);
      }
    },
    cancel() {
      reader.cancel();
    },
  });

  return new Response(stream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
