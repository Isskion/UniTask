import * as admin from "firebase-admin";

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
