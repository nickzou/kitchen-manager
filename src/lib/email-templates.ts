function layout(content: string) {
	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
	<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
		<tr><td align="center">
			<table width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px">
				<tr><td>${content}</td></tr>
			</table>
			<p style="margin-top:24px;font-size:12px;color:#71717a">Kitchen Manager</p>
		</td></tr>
	</table>
</body>
</html>`.trim();
}

export function resetPasswordEmailHtml(url: string) {
	return layout(`
		<h1 style="margin:0 0 16px;font-size:20px;color:#18181b">Reset your password</h1>
		<p style="margin:0 0 24px;font-size:14px;color:#3f3f46;line-height:1.5">
			Click the button below to reset your password. This link will expire in 1 hour.
		</p>
		<a href="${url}" style="display:inline-block;padding:10px 24px;background:#0d9488;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:9999px">
			Reset password
		</a>
		<p style="margin:24px 0 0;font-size:12px;color:#71717a;line-height:1.5">
			If you didn't request this, you can safely ignore this email.
		</p>
	`);
}

export function verifyEmailHtml(url: string) {
	return layout(`
		<h1 style="margin:0 0 16px;font-size:20px;color:#18181b">Verify your email</h1>
		<p style="margin:0 0 24px;font-size:14px;color:#3f3f46;line-height:1.5">
			Thanks for signing up! Click the button below to verify your email address.
		</p>
		<a href="${url}" style="display:inline-block;padding:10px 24px;background:#0d9488;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:9999px">
			Verify email
		</a>
		<p style="margin:24px 0 0;font-size:12px;color:#71717a;line-height:1.5">
			If you didn't create an account, you can safely ignore this email.
		</p>
	`);
}
