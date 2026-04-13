import * as admin from "firebase-admin";
import * as dotenv from "dotenv";

dotenv.config();

if (!admin.apps.length) {
    admin.initializeApp();
}

export * from "./analyze";
export * from "./chat";
export * from "./invites";
export * from "./auth";
export * from "./processUserClaims";
export * from "./support";
export * from "./pdf";
export * from "./ping";
export * from "./tasks";
export * from "./registration";
export * from "./uniflux";
export * from "./syncUserClaims";
export * from "./unigis";
export * from "./outlook";
