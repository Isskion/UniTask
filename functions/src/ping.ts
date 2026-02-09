import * as functions from "firebase-functions";

export const ping = functions.region("europe-west1").https.onRequest((req, res) => {
    res.status(200).send("pong");
});
