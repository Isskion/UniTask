import fs from "fs";
import path from "path";
import { toSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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
