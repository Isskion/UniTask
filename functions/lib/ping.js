"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ping = void 0;
const functions = require("firebase-functions");
exports.ping = functions.region("europe-west1").https.onRequest((req, res) => {
    res.status(200).send("pong");
});
//# sourceMappingURL=ping.js.map