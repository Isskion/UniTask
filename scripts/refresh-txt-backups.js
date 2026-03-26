/**
 * Refresh UniTask "TXT backup" files in repo root.
 *
 * Non-destructive: only reads Firestore and rewrites TXT snapshots.
 * It intentionally does NOT delete/migrate any Firestore data.
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

function parseMaybeJson(val) {
  if (!val) return null;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}

function loadServiceAccount() {
  // Preferred: CI secret injects the JSON string.
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const parsed = parseMaybeJson(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (parsed) return parsed;
    throw new Error("FIREBASE_SERVICE_ACCOUNT is set but is not valid JSON.");
  }

  // Fallback: local file checked into this scratch folder.
  const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");
  if (fs.existsSync(serviceAccountPath)) {
    return JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  }

  // Fallback: try .env.local.
  const dotEnvPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(dotEnvPath)) {
    const envContent = fs.readFileSync(dotEnvPath, "utf8");
    // FIREBASE_SERVICE_ACCOUNT can be JSON with quotes/newlines; this regex is best-effort.
    const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT\s*=\s*['"]([\s\S]*?)['"]\s*$/m);
    if (match?.[1]) {
      const maybe = parseMaybeJson(match[1]);
      if (maybe) return maybe;
      // If it is escaped, unescape common sequences.
      const unescaped = match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
      const maybe2 = parseMaybeJson(unescaped);
      if (maybe2) return maybe2;
    }
  }

  throw new Error("No Firebase service account found (env secret or serviceAccountKey.json).");
}

async function main() {
  const rootDir = path.join(__dirname, "..");

  const serviceAccount = loadServiceAccount();
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = admin.firestore();

  // 1) users_list.txt: `${email} -> ${uid}`
  const usersSnap = await db.collection("users").get();
  const usersLines = [];
  usersSnap.forEach((doc) => {
    const data = doc.data() || {};
    const email = data.email;
    if (typeof email === "string" && email.trim().length > 0) {
      usersLines.push(`${email.trim()} -> ${doc.id}`);
    }
  });
  usersLines.sort((a, b) => a.localeCompare(b));
  fs.writeFileSync(path.join(rootDir, "users_list.txt"), usersLines.join("\n") + (usersLines.length ? "\n" : ""), "utf8");

  // 2) all_projects.txt: `P|${projectId}|${name}|${tenantId}`
  const projectsSnap = await db.collection("projects").get();
  const projects = [];
  projectsSnap.forEach((doc) => {
    const data = doc.data() || {};
    projects.push({
      id: doc.id,
      name: typeof data.name === "string" ? data.name : "",
      tenantId: data.tenantId == null ? "" : String(data.tenantId),
    });
  });
  projects.sort((a, b) => a.id.localeCompare(b.id));
  const allProjectsLines = projects.map(
    (p) => `P|${p.id}|${p.name.replace(/\r?\n/g, " ").trim()}|${p.tenantId}`
  );
  fs.writeFileSync(
    path.join(rootDir, "all_projects.txt"),
    allProjectsLines.join("\n") + (allProjectsLines.length ? "\n" : ""),
    "utf8"
  );

  // 3) project_ids.txt: `${index}: ${projectId} | ${name} | ${tenantId}`
  const projectIdsLines = projects.map((p, idx) => `${idx}: ${p.id} | ${p.name.replace(/\r?\n/g, " ").trim()} | ${p.tenantId}`);
  fs.writeFileSync(
    path.join(rootDir, "project_ids.txt"),
    projectIdsLines.join("\n") + (projectIdsLines.length ? "\n" : ""),
    "utf8"
  );

  console.log("TXT backups refreshed:");
  console.log("- users_list.txt");
  console.log("- all_projects.txt");
  console.log("- project_ids.txt");
}

main().catch((err) => {
  console.error("refresh-txt-backups failed:", err);
  process.exit(1);
});

