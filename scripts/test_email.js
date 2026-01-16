require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

const SMTP_EMAIL = process.env.SMTP_EMAIL;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;

console.log("📧 Testing SMTP Configuration...");
console.log("   User:", SMTP_EMAIL);
console.log("   Pass:", SMTP_PASSWORD ? "****" + SMTP_PASSWORD.slice(-4) : "MISSING");

if (!SMTP_EMAIL || !SMTP_PASSWORD) {
    console.error("❌ Credentials missing in .env.local");
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD,
    },
});

async function main() {
    try {
        console.log("🔄 Verifying connection...");
        await transporter.verify();
        console.log("✅ Connection Successful! Valid credentials.");

        console.log("🔄 Attempting to send self-test email...");
        const info = await transporter.sendMail({
            from: `"UniTask Diagnostic" <${SMTP_EMAIL}>`,
            to: SMTP_EMAIL, // Send to self
            subject: "Mundo! - Test SMTP",
            text: "Si lees esto, el sistema de correo funciona correctamente.",
        });

        console.log("✅ Email sent successfully!");
        console.log("   Message ID:", info.messageId);

    } catch (error) {
        console.error("\n❌ ERROR DETECTED:");
        console.error(error);

        if (error.code === 'EAUTH') {
            console.log("\n💡 SUGGESTION: Invalid password or Username. Check if 'App Password' is correct/active.");
        }
    }
}

main();
