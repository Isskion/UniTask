import fs from "fs";
import path from "path";
import { toSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

// Las env vars NEXT_PUBLIC_FIREBASE_* en Vercel traen a veces un "\n" pegado al final
// (artefacto de copy-paste al configurarlas) — lib/firebase.ts ya lo sanea para el cliente normal,
// aquí hay que hacerlo también porque este HTML se sirve como string fuera del bundler de Next.
function cleanEnvVar(val: string | undefined): string | undefined {
    if (!val) return val;
    return val.replace(/^["']|["']$/g, "").trim();
}

const firebaseConfig = {
    apiKey: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    authDomain: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    appId: cleanEnvVar(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug: rawSlug } = await params;
    const slug = toSlug(rawSlug);

    const templatePath = path.join(process.cwd(), "app", "UniTrace", "[slug]", "template.html");
    const html = fs.readFileSync(templatePath, "utf-8");

    const configScript =
        `<script>window.__FIREBASE_CONFIG__=${JSON.stringify(firebaseConfig)};` +
        `window.__UNITRACE_SLUG__=${JSON.stringify(slug)};</script>`;
    const withConfig = html.replace("</head>", `${configScript}</head>`);

    return new Response(withConfig, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
}
