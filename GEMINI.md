# Gemini CLI Response Format

When using MCP tools via Gemini CLI, return ONLY valid JSON in this format:

```json
{"server":"railway","tool":"tool_name","success":true,"result":<data>,"error":null}
```

## Rules

1. **JSON ONLY** - No markdown, no explanations, no code blocks
2. **Maximum 500 characters** - Keep responses concise
3. **Error structure**: `{"server":"railway","tool":"tool_name","success":false,"result":null,"error":"error message"}`

## Available MCP Servers

- **railway**: Railway deployment management (tools: deploy, logs, status, etc.)

## Example

**Task**: "Get Railway deployment status"

**Response**:
```json
{"server":"railway","tool":"get_deployment_status","success":true,"result":{"status":"building","id":"123"},"error":null}
```
