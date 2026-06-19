import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export async function GET() {
    const templatePath = path.join(process.cwd(), "app", "LSTrace", "template.html");
    const html = fs.readFileSync(templatePath, "utf-8");

    const configScript = `<script>window.__FIREBASE_CONFIG__=${JSON.stringify(firebaseConfig)};</script>`;
    const withConfig = html.replace("</head>", `${configScript}</head>`);

    return new Response(withConfig, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
}
