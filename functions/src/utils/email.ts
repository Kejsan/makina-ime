import { TransactionalEmailsApi, TransactionalEmailsApiApiKeys } from "@getbrevo/brevo/dist/api/transactionalEmailsApi";
import { SendSmtpEmail } from "@getbrevo/brevo/dist/model/sendSmtpEmail";

const apiKey = process.env.BREVO_API_KEY || "";

const apiInstance = new TransactionalEmailsApi();
apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, apiKey);

export async function sendEmail({ to, subject, htmlContent }: { to: string, subject: string, htmlContent: string }) {
    if (!apiKey) {
        console.error("Brevo API Key missing.");
        return;
    }

    const sendSmtpEmail = new SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { "name": "Makina Ime", "email": "infomakinaime@gmail.com" };
    sendSmtpEmail.to = [{ "email": to }];

    try {
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log("Email sent successfully. ID: " + data.body.messageId);
        return data;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
}
