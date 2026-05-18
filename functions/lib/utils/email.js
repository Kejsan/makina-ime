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
        console.error("Brevo API key is not configured.");
        return;
    }
    const sendSmtpEmail = new sendSmtpEmail_1.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { "name": "Makina Ime", "email": "infomakinaime@gmail.com" };
    sendSmtpEmail.to = [{ "email": to }];
    try {
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log("Transactional email sent", { messageId: data.body.messageId });
        return data;
    }
    catch (_a) {
        console.error("Transactional email provider failed");
        throw new Error("Email delivery failed");
    }
}
exports.sendEmail = sendEmail;
//# sourceMappingURL=email.js.map