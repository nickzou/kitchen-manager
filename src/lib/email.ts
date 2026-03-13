import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: Number(process.env.SMTP_PORT ?? 587),
	secure: process.env.SMTP_SECURE === "true",
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

export async function sendEmail(to: string, subject: string, html: string) {
	await transport.sendMail({
		from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
		to,
		subject,
		html,
	});
}
