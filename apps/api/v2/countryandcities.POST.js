module.exports = (MARSModules) => {
with (MARSModules) {
let myMail = mail('live.smtp.mailtrap.io', 'api', '281f739a41f64470634fa4023b396c8b', 'TLS', '587');
myMail.from('noreply@gdesapsom.com');

var fromParam = param("from");
var subject = param("subject");
var message = param("message");

myMail.subject(subject);
myMail.to('gdesapsom@gmail.com');

let htmlMessage = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Nova poruka – Gde sa psom</title>
</head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,Helvetica,sans-serif;color:#2C2210;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 10px;background:#F5F0E8;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E0D4C0;">

<!-- Header -->
<tr>
<td style="padding:0;background:#3B6D11;text-align:center;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:28px 30px 22px 30px;text-align:center;">
        <div style="display:inline-block;background:#FFFFFF;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;margin-bottom:12px;">🐾</div>
        <h2 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:0.3px;">
          Nova poruka sa sajta
        </h2>
        <p style="margin:6px 0 0 0;font-size:13px;color:#C0DD97;">
          gdesapsom.com
        </p>
      </td>
    </tr>
    <!-- Orange accent bar -->
    <tr>
      <td style="height:4px;background:#EF9F27;"></td>
    </tr>
  </table>
</td>
</tr>

<!-- Content -->
<tr>
<td style="padding:30px 32px;">

  <!-- From field -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
    <tr>
      <td style="padding:14px 16px;background:#EAF3DE;border-radius:10px;border-left:4px solid #3B6D11;">
        <div style="font-size:11px;font-weight:700;color:#3B6D11;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Pošiljalac</div>
        <div style="font-size:15px;color:#2C2210;font-weight:600;">${fromParam}</div>
      </td>
    </tr>
  </table>

  <!-- Subject field -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
    <tr>
      <td style="padding:14px 16px;background:#FAEEDA;border-radius:10px;border-left:4px solid #EF9F27;">
        <div style="font-size:11px;font-weight:700;color:#BA7517;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Tema</div>
        <div style="font-size:15px;color:#2C2210;font-weight:600;">${subject}</div>
      </td>
    </tr>
  </table>

  <!-- Message box -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:18px;background:#F9F6F0;border-radius:10px;border:1px solid #E0D4C0;">
        <div style="font-size:11px;font-weight:700;color:#888780;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">Poruka</div>
        <div style="font-size:14px;line-height:1.7;color:#2C2210;">${message}</div>
      </td>
    </tr>
  </table>

</td>
</tr>

<!-- Divider paw prints -->
<tr>
  <td style="padding:0 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-top:1px dashed #E0D4C0;padding-top:0;"></td>
      </tr>
    </table>
  </td>
</tr>

<!-- CTA -->
<tr>
<td style="padding:20px 32px;text-align:center;">
  <a href="mailto:${fromParam}" 
     style="display:inline-block;background:#3B6D11;color:#FFFFFF;font-size:14px;font-weight:700;
            padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
    Odgovori pošiljaocu
  </a>
</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:18px 30px;text-align:center;background:#F5F0E8;border-top:1px solid #E0D4C0;">
  <p style="margin:0;font-size:12px;color:#888780;">
    Ova poruka je automatski poslata sa sajta 
    <a href="https://gdesapsom.com" style="color:#3B6D11;text-decoration:none;font-weight:600;">gdesapsom.com</a>
    &nbsp;🐾&nbsp; Pet-friendly mesta u Srbiji
  </p>
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;

myMail.message(htmlMessage);
myMail.send();

write("email", fromParam);
write('message', 'Email sent');
}
}