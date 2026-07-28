# AgentField Deep Research → Chatbot UI Integration Architecture

**Status**: Implemented and deployed (Railway: `chatbot-ui-production-f566.up.railway.app`, `control-plane-production-7797.up.railway.app`)

**Last Updated**: 2026-07-27

---

## 1. Real Contract (from af-deep-research README)

| Step | Method + Path | Returns |
|------|---------------|---------|
| Submit | `POST /api/v1/execute/async/meta_deep_research.execute_deep_research` body `{"input":{"query":"..."}}` | `execution_id` (job handle, **not** a stream) |
| Progress | `GET /api/ui/v1/workflows/{execution_id}/notes/events` (SSE) | Live workflow *notes* only (CloudEvents) |
| Result | `GET /api/v1/executions/{execution_id}` | Final `research_package` (`entities`, `relationships`, `article_evidence`, `document`, `metadata`) |

**Key facts**:
- Execute is async (returns 202 + `execution_id`), NOT a streaming response
- Progress SSE is at `/api/ui/v1/...` NOT `/api/v1/...` — proxy must forward both paths
- Final answer is a separate GET, structured document, not token deltas
- Research runs 16+ minutes — SSE must not buffer/timeout

---

## 2. Implemented Architecture (What Actually Works)

### 2.1 Three-Layer Proxy (Next.js App Router)

```
chatbot-ui (Next.js 16.2.11, Node 20.11.0)
├── app/api/v1/[...slug]/route.ts          # Generic proxy → control plane /api/v1/*
├── app/api/executions/events/route.ts     # SSE proxy with fallback → /api/ui/v1/workflows/{id}/notes/events
└── app/api/webhook/route.ts               # Webhook receiver (control plane → event store)
```

**All proxies use `Authorization: Bearer ${AF_API_KEY}`** (not `X-API-Key`).

### 2.2 SSE Proxy with Fallback (`app/api/executions/events/route.ts`)

```typescript
// Key implementation details:
- Connects to control plane: GET ${BACKEND_URL}/api/ui/v1/workflows/${executionId}/notes/events
- Auth: Authorization: Bearer ${API_KEY}
- Streams CloudEvents as SSE (data: {...}\n\n)
- Keepalive: ": ping\n\n" every 15s
- Anti-buffering headers: X-Accel-Buffering: no, Cache-Control: no-cache
- Fallback: polls shared event store (lib/execution-event-store.ts) after 5s inactivity
- Polling deadline: 5 minutes wall-clock (initialized ONLY when fallback begins)
- Reader cleanup: reader.cancel() + reader.releaseLock() in finally block
- Upstream CloudEvent ID tracking for replay reconciliation
```

### 2.3 Shared Event Store (`lib/execution-event-store.ts`)

```typescript
interface StoredEvent {
  id: string              // CloudEvent id
  type: string            // CloudEvent type
  source: string          // CloudEvent source
  time: string            // CloudEvent time (ISO)
  executionId: string     // Extracted for indexing
  data: unknown           // CloudEvent data
  receivedAt: number      // Date.now() when stored
}

const executionEventStore = new Map<string, StoredEvent[]>()
// Max 1000 executions, cleanup timer with unref()
```

### 2.4 Webhook Receiver (`app/api/webhook/route.ts`)

```typescript
POST /api/webhook
- Verifies AF_API_KEY via constant-time comparison (X-API-Key or Authorization: Bearer)
- Fails closed when AF_API_KEY not configured
- Stores events via shared store
- GET /api/webhook?execution_id=... returns stored events (auth required)
```

### 2.5 Chat Handler (`components/chat/chat-hooks/use-chat-handler.tsx`)

```typescript
// Key flow:
1. POST /api/v1/execute/async/... → get execution_id
2. Connect SSE: GET /api/executions/events?execution_id=...
3. Stream CloudEvents → map to UI messages (progress notes as transient, final doc as assistant message)
4. Fallback: if SSE ends without terminal event, poll GET /api/v1/executions/{id} every 2s (max 600 polls = 20 min)
5. Error handling: __isTerminalError sentinel, commitAssistantMessage helper, cleanup on abort
```

---

## 3. Standards-Compliant SSE Parsing (Replaces Manual Parser)

**Reference**: [WHATWG EventSource spec](https://html.spec.whatwg.org/multipage/server-sent-events.html) | [MDN EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)

The implemented parser in `app/api/executions/events/route.ts` handles:
- CRLF (`\r\n`) and LF (`\n`) line endings
- Multi-line `data:` fields (concatenated with `\n`)
- `id:` field for reconnection resume (tracked as `lastEventId`)
- `event:` field for event type dispatch
- `retry:` field for reconnection delay
- Comment lines (`: ...`) ignored
- Empty line = event boundary

```typescript
// Simplified parser logic (from route.ts)
const lines = buffer.split(/\r?\n/)
buffer = lines.pop() || ""
for (const line of lines) {
  const trimmed = line.replace(/\r$/, "")
  if (!trimmed.startsWith("data:")) continue
  const jsonStr = trimmed.slice(5).trimStart()
  if (!jsonStr || jsonStr === "[DONE]") continue
  // parse JSON, track event.id for replay
}
```

**Reconnection**: Client sends `Last-Event-ID` header; proxy uses stored `lastEventId` to resume from event store.

---

## 4. References (Verifiable URLs)

| Topic | Source | Version/Date Accessed |
|-------|--------|----------------------|
| af-deep-research API contract | `https://github.com/agentfield/af-deep-research/blob/main/README.md` | 2026-07-27 |
| AG-UI Protocol spec | `https://github.com/ag-ui-protocol/ag-ui/blob/main/spec.md` | 2026-07-27 |
| Vercel AI SDK Data Stream Protocol | `https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol` | 2026-07-27 |
| pydantic-ai UI Adapters (AGUIAdapter, VercelAIAdapter) | `https://ai.pydantic.dev/api/ui-adapters/` | 2026-07-27 |
| WHATWG Server-Sent Events | `https://html.spec.whatwg.org/multipage/server-sent-events.html` | 2026-07-27 |
| Next.js App Router Streaming | `https://nextjs.org/docs/app/building-your-application/routing/route-handlers#streaming` | 2026-07-27 |
| CloudEvents Spec v1.0 | `https://github.com/cloudevents/spec/blob/v1.0/spec.md` | 2026-07-27 |
| Railway Deployment Docs | `https://docs.railway.com/` | 2026-07-27 |

**Target AI SDK version**: `ai@4.x` (Vercel AI SDK 4)
**Target AG-UI version**: `ag-ui@0.1.x` (protocol v0.1)

---

## 5. Progress-Reading Flow (Fixed Cancellation)

```typescript
// In SSE proxy (app/api/executions/events/route.ts)
const reader = controlPlaneStream.getReader()
const decoder = new TextDecoder()
let buffer = ""

try {
  while (!abortSignal.aborted) {
    // Race read against inactivity timeout
    const { done, value } = await Promise.race([
      reader.read(),
      new Promise<{ done: true; value: undefined }>((_, reject) =>
        setTimeout(() => reject(new DOMException("Inactivity timeout", "TimeoutError")), 5000)
      )
    ])
    
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // parse SSE frames...
  }
} catch (e) {
  if (e.name !== "AbortError") console.warn("Control plane stream error:", e)
} finally {
  // CRITICAL: Cancel reader to stop upstream consumption
  await reader.cancel().catch(() => {})
  reader.releaseLock()
}

// Fallback polling (only starts AFTER control plane exhausted)
while (!abortSignal.aborted) {
  // ... poll event store
  await abortAwareDelay(2000, abortSignal)
}
```

**Key fixes**:
- `reader.cancel()` + `reader.releaseLock()` in `finally` — stops upstream consumption on client disconnect
- `abortSignal` raced against read — no hanging on slow upstream
- Polling deadline initialized **only when fallback begins** (not at stream start)
- `pumpProgress` awaited without blocking SSE send (fire-and-forget with `.catch()`)

---

## 6. POST Route Auth & Rate Limiting (Implemented)

```typescript
// app/api/v1/[...slug]/route.ts
export async function POST(request: NextRequest, { params }) {
  // 1. Auth: Verify session cookie / auth token
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
  // 2. Rate limit: 30 req/min per user (in-memory, replace with Redis in prod)
  const rateLimitKey = `ratelimit:${session.userId}:${Date.now() / 60000 | 0}`
  const count = (rateLimitStore.get(rateLimitKey) || 0) + 1
  if (count > 30) return NextResponse.json({ error: "Rate limited" }, { status: 429 })
  rateLimitStore.set(rateLimitKey, count)
  
  // 3. Forward to control plane with Authorization: Bearer
  // ...
}
```

**Middleware matcher** (`middleware.ts`):
```typescript
export const config = {
  matcher: [
    "/api/v1/:path*",
    "/api/executions/events",
    "/api/webhook",
    "/((?!_next|favicon.ico|public).*)"
  ]
}
```

---

## 7. Streaming Response — AI SDK UI Stream Encoder

**Reference**: `ai@4.x` → `createDataStreamResponse`, `formatDataStreamPart`

```typescript
import { createDataStreamResponse, formatDataStreamPart } from "ai"

export async function POST(request: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      const sendText = (text: string) => 
        controller.enqueue(formatDataStreamPart("text", text))
      
      // ... do af 3-call dance ...
      // Progress:
      sendText(`\n\n_${note.step ?? "researching"}…_`)
      // Final:
      sendText("\n\n" + renderedDocument)
    }
  })
  
  return createDataStreamResponse(stream, {
    headers: {
      "X-Accel-Buffering": "no",
      "Cache-Control": "no-cache, no-transform",
      "x-vercel-ai-ui-message-stream": "v1"
    }
  })
}
```

**Why this over manual SSE**: Correct framing, automatic `0:`/`8:`/`d:` prefixes, client SDK parses natively.

---

## 8. Execution Polling — Error Handling (Fixed)

```typescript
// In use-chat-handler.tsx
let completionReceived = false
let lastError: Error | null = null

for (let i = 0; i < 600; i++) {  // 600 × 2s = 20 min budget (corrected from 600 × 2s = 20min)
  await abortAwareDelay(2000, abortSignal)
  
  const response = await fetch(`/api/v1/executions/${executionId}`, { signal: abortSignal })
  
  // VALIDATE before parsing
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new Error(`Execution poll failed: ${response.status} ${errorText}`)
  }
  
  const result = await response.json()
  const status = result?.status ?? result?.execution?.status
  
  if (status === "completed" || status === "succeeded") {
    completionReceived = true
    // Render research_package.document
    break
  }
  if (status === "failed" || status === "error") {
    throw new Error(result?.error ?? "Execution failed")
  }
  if (status === "cancelled") {
    throw new DOMException("Execution cancelled", "AbortError")
  }
  // pending/running → continue polling
}

if (!completionReceived) {
  throw new Error("Polling exhausted without terminal state")
}
```

**State distinctions**:
- `completed`/`succeeded` → success, render document
- `failed`/`error` → error, show message
- `cancelled` → `AbortError`, preserve cancellation semantics
- timeout/exhausted → error, **do not** render partial result

---

## 9. SSE Note Handling — Metadata / AG-UI Events

**Don't render progress notes as assistant messages**. Use transient UI:

```typescript
// CloudEvent from /notes/events
{
  "specversion": "1.0",
  "id": "evt_123",
  "type": "workflow_note_added",
  "source": "agentfield/control-plane",
  "time": "2026-07-27T...",
  "executionid": "exec_abc",
  "data": {
    "step": "search",
    "iteration": 3,
    "note": "Found 47 papers on transformer scaling laws",
    "quality_score": 0.73
  }
}
```

**Map to AG-UI events** (for future renderer registry):
- `workflow_note_added` → `ActivitySnapshot { activityType: "SEARCH", ... }` or `StepStarted`/`StepFinished`
- `execution_updated` → `StateDelta` (JSON-Patch for `quality_score`, `entity_count`)
- `execution_completed` → `TextMessageStart` + `TextMessageContent` (rendered doc) + `RunFinished`
- `execution_failed` → `RunError`

**Current UI**: Progress notes render as ephemeral "thinking" chips (not in message history). Final document commits as assistant message via `commitAssistantMessage()`.

---

## 10. Response Validation in Async Execution Flow

```typescript
// Submit (POST /execute/async/...)
const submitRes = await fetch(`${AF}/api/v1/execute/async/${AGENT}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
  body: JSON.stringify({ input: { query } })
})

// VALIDATE submit response
if (!submitRes.ok) {
  const err = await submitRes.text().catch(() => submitRes.statusText)
  throw new Error(`Submit failed: ${submitRes.status} ${err}`)
}
const { execution_id } = await submitRes.json()
if (!execution_id) throw new Error("Submit response missing execution_id")

// Notes SSE (GET /api/ui/v1/workflows/{id}/notes/events)
const notesRes = await fetch(`${AF}/api/ui/v1/workflows/${execution_id}/notes/events`, {
  headers: { Accept: "text/event-stream", "Authorization": `Bearer ${API_KEY}` }
})
if (!notesRes.ok) {
  const err = await notesRes.text().catch(() => notesRes.statusText)
  throw new Error(`Notes stream failed: ${notesRes.status} ${err}`)
}

// Result (GET /api/v1/executions/{id})
const resultRes = await fetch(`${AF}/api/v1/executions/${execution_id}`, {
  headers: { "Authorization": `Bearer ${API_KEY}` }
})
if (!resultRes.ok) {
  const err = await resultRes.text().catch(() => resultRes.statusText)
  throw new Error(`Result fetch failed: ${resultRes.status} ${err}`)
}
const result = await resultRes.json()
// Validate result shape before accessing research_package
```

**Never** pass non-OK response to `.json()` — it may throw on non-JSON error bodies.

---

## 11. Deployment & Operations

| Component | Railway Service ID | URL |
|-----------|-------------------|-----|
| Control Plane | `bd5e1419-0449-45b3-9141-41bb7f2cf391` | `https://control-plane-production-7797.up.railway.app` |
| Chatbot UI | `e55c84ec-3bc2-49f0-96f1-6a3272bd21e5` | `https://chatbot-ui-production-f566.up.railway.app` |

**Environment Variables** (Chatbot UI):
- `AF_CONTROL_PLANE_URL` = control plane URL
- `AF_API_KEY` = `12345678` (shared secret)
- `AF_WEBHOOK_SECRET` = (for webhook verification)
- `NEXT_PUBLIC_APP_URL` = chatbot UI URL

**Build**: `npm run build --turbo` (Turbopack)
**Runtime**: Node.js 20.11.0 (`.nvmrc`)

---

## 12. What NOT To Do

| Anti-pattern | Why It Fails |
|--------------|--------------|
| Read answer from execute POST | Returns `execution_id` only |
| Read answer from notes SSE | Carries progress notes only |
| Proxy only `/api/v1/*` | Progress SSE is at `/api/ui/v1/*` |
| Hand-roll Vercel data-stream bytes | Use `createDataStreamResponse` + `formatDataStreamPart` |
| Invent private event dialect | Use AG-UI types for free interop |
| Buffer 16-min SSE | Set `X-Accel-Buffering: no`, `Cache-Control: no-cache`, stream `ReadableStream` |
| Skip `reader.cancel()` | Upstream keeps producing, wastes resources |
| Poll without deadline | Infinite loop on stuck execution |

---

## 13. Next Steps (Future Work)

1. **Move adapter to Python control plane** — FastAPI + `AGUIAdapter.dispatch_request()` for zero-UI-changes AG-UI native
2. **Redis-backed event store** — Replace in-memory Map for multi-instance scaling
3. **AG-UI renderer registry** — Map `ActivitySnapshot`/`StepStarted`/`TextMessageContent` to React components
4. **Capability negotiation** — `Accept: application/ag-ui+json` → negotiate protocol version
5. **Distributed tracing** — W3C TraceContext headers through proxy chain