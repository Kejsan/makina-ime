"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const transactionalEmailsApi_1 = require("@getbrevo/brevo/dist/api/transactionalEmailsApi");
const sendSmtpEmail_1 = require("@getbrevo/brevo/dist/model/sendSmtpEmail");
const apiKey = process.env.BREVO_API_KEY || "";
const apiInstance = new transactionalEmailsApi_1.TransactionalEmailsApi();
apiInstance.setApiKey(transactionalEmailsApi_1.TransactionalEmailsApiApiKeys.apiKey, apiKey);
async function sendEmail({ to, subject, htmlContent }) {
    if (!apiKey) {
        console.error("Brevo API Key missing.");
        return;
    }
    const sendSmtpEmail = new sendSmtpEmail_1.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { "name": "Makina Ime", "email": "infomakinaime@gmail.com" };
    sendSmtpEmail.to = [{ "email": to }];
    try {
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log("Email sent successfully. ID: " + data.body.messageId);
        return data;
    }
    catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
}
exports.sendEmail = sendEmail;
//# sourceMappingURL=email.js.map