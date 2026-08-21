import nodemailer, { Transporter } from 'nodemailer';

// Cache test accounts or transporters by sender email
const transporterCache = new Map<string, Transporter>();

export async function getOrCreateTransporter(sender?: {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  email?: string;
}): Promise<{ transporter: Transporter; isEthereal: boolean; senderEmail: string }> {
  // If custom SMTP config is provided
  if (sender?.smtpHost && sender?.smtpUser && sender?.smtpPass) {
    const key = `custom:${sender.smtpHost}:${sender.smtpUser}`;
    if (transporterCache.has(key)) {
      return {
        transporter: transporterCache.get(key)!,
        isEthereal: false,
        senderEmail: sender.email || sender.smtpUser,
      };
    }

    const transporter = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort || 587,
      secure: sender.smtpPort === 465,
      auth: {
        user: sender.smtpUser,
        pass: sender.smtpPass,
      },
    });

    transporterCache.set(key, transporter);
    return {
      transporter,
      isEthereal: false,
      senderEmail: sender.email || sender.smtpUser,
    };
  }

  // Otherwise, use Ethereal Fake SMTP
  const etherealKey = 'ethereal:default';
  if (transporterCache.has(etherealKey)) {
    const cached = transporterCache.get(etherealKey)!;
    return {
      transporter: cached,
      isEthereal: true,
      senderEmail: (cached as any)._etherealUser || 'test@ethereal.email',
    };
  }

  // Create new Ethereal test account
  console.log('📬 Creating new Ethereal Email test account...');
  const testAccount = await nodemailer.createTestAccount();
  console.log(`✅ Ethereal account ready: ${testAccount.user}`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  (transporter as any)._etherealUser = testAccount.user;
  transporterCache.set(etherealKey, transporter);

  return {
    transporter,
    isEthereal: true,
    senderEmail: testAccount.user,
  };
}

export function getEtherealPreviewUrl(info: nodemailer.SentMessageInfo): string | false {
  return nodemailer.getTestMessageUrl(info);
}
