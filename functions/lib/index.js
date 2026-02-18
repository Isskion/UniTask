"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
const dotenv = require("dotenv");
dotenv.config();
if (!admin.apps.length) {
    admin.initializeApp();
}
__exportStar(require("./analyze"), exports);
__exportStar(require("./chat"), exports);
__exportStar(require("./invites"), exports);
__exportStar(require("./auth"), exports);
__exportStar(require("./processUserClaims"), exports);
__exportStar(require("./support"), exports);
__exportStar(require("./pdf"), exports);
__exportStar(require("./ping"), exports);
__exportStar(require("./tasks"), exports);
__exportStar(require("./registration"), exports);
__exportStar(require("./uniflux"), exports);
__exportStar(require("./sam_sync"), exports);
__exportStar(require("./sam_audit"), exports);
//# sourceMappingURL=index.js.map