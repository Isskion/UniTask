---
description: AI Configuration for UniTask Cloud Functions
---

# AI Configuration for UniTask

## Critical: Region Configuration

All AI-related Cloud Functions are deployed to **`europe-west1`**. Any client-side code calling these functions MUST target this region.

### Deployed Functions (europe-west1)

| Function | Purpose |
|----------|---------|
| `summarizeNotes` | Extracts tasks from daily notes |
| `analyzeDocumentStructure` | Analyzes document structure |
| `analyzePdf` | Extracts text from PDFs |
| `chat` | AI Chat Assistant |

---

## Client Configuration

### 1. REST/Fetch Approach (Recommended)

Use direct REST calls to avoid Firebase SDK initialization issues on Vercel:

```typescript
// Constants
const PROJECT_ID = "minuta-f75a4";
const REGION = "europe-west1";

async function callFunction(name: string, data: any) {
    const url = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${name}`;
    
    let token = "";
    if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data })
    });

    const json = await response.json();
    return { data: json.result };
}
```

### 2. Firebase SDK Approach (Alternative)

If using the Firebase Functions SDK, always specify the region explicitly:

```typescript
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";

const functionsEU = getFunctions(app, 'europe-west1');
const myFunction = httpsCallable(functionsEU, 'functionName');
```

---

## Key Files

| File | Purpose |
|------|---------|
| `app/actions/analyze-document.ts` | Task extraction & document analysis (REST) |
| `app/actions/chat-assistant.ts` | AI Chat (REST, `europe-west1`) |
| `functions/src/analyze.ts` | Backend Cloud Functions |
| `functions/src/chat.ts` | Backend Chat Function |

---

## Environment Variables

### Cloud Functions (Firebase Config)

```bash
# Set API key for Cloud Functions
npx firebase functions:config:set gemini.key="YOUR_API_KEY"
```

### Client-Side (.env.local)

```env
NEXT_PUBLIC_FIREBASE_PROJECT_ID=minuta-f75a4
NEXT_PUBLIC_GEMINI_API_KEY=your_key_here
```

---

## Troubleshooting

### CORS Errors with `us-central1`
**Cause:** Client calling wrong region.
**Fix:** Verify the `region` variable is set to `europe-west1` in:
- `chat-assistant.ts`
- `analyze-document.ts`

### "Application Error" on Vercel
**Cause:** Firebase SDK failing to initialize.
**Fix:** Use REST/fetch approach instead of `httpsCallable`.

### "AI Key missing" Error
**Cause:** API key not configured in Cloud Functions.
**Fix:** Run `npx firebase functions:config:set gemini.key="KEY"` and redeploy.
