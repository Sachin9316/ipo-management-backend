```javascript
import { Resend } from 'resend';
import dotenv from "dotenv";

dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY;

// Only initialize if key is present to prevent startup crash
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const sendEmail = async (to, subject, text, html) => {
    try {
        if (!resend) {
            console.warn("Resend API Key is missing. Email not sent.");
            if (process.env.NODE_ENV === 'development') {
                console.log("Mock Email:", { to, subject, text });
                return { id: 'mock-id' };
            }
            throw new Error("Missing RESEND_API_KEY");
        }

        const sender = process.env.EMAIL_FROM || 'IPO Wizard <onboarding@resend.dev>';

        const { data, error } = await resend.emails.send({
            from: sender,
            to: [to],
            subject: subject,
            html: html || text,
            text: text
        });

        if (error) {
            console.error("Resend Error:", error);
            throw new Error(error.message);
        }

        console.log("Email sent successfully:", data);
        return data;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};
