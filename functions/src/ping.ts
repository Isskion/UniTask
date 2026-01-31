import * as functions from "firebase-functions";

export const ping = functions.https.onRequest((req, res) => {
    res.status(200).send("pong");
});
