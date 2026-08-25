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

  // Create new Ethereal test account with timeout & fallback
  console.log('📬 Creating or connecting to Ethereal Email test account...');
  let transporter: Transporter;
  let etherealUser = 'test@ethereal.email';

  try {
    const testAccount = await Promise.race([
      nodemailer.createTestAccount(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Ethereal test account creation timed out')), 6000))
    ]);
    console.log(`✅ Ethereal account ready: ${testAccount.user}`);
    etherealUser = testAccount.user;

    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 465,
      secure: true,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  } catch (err: any) {
    console.warn(`⚠️ Ethereal dynamic account generation failed (${err.message}). Using fallback test SMTP account.`);
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 465,
      secure: true,
      auth: {
        user: 'kurtis.morar@ethereal.email',
        pass: '65sYQy9Zq4n7fXGjN5',
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    etherealUser = 'kurtis.morar@ethereal.email';
  }

  (transporter as any)._etherealUser = etherealUser;
  transporterCache.set(etherealKey, transporter);

  return {
    transporter,
    isEthereal: true,
    senderEmail: etherealUser,
  };
}

export function getEtherealPreviewUrl(info: nodemailer.SentMessageInfo): string | false {
  return nodemailer.getTestMessageUrl(info);
}
