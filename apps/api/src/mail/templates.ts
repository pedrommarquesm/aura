import type { Locale } from '../i18n/locales';

export type MailTemplateId = 'waitlist_joined' | 'waitlist_referral';

export interface RenderedMail {
  subject: string;
  text: string;
  html: string;
}

export interface WaitlistJoinedPayload {
  referralUrl: string;
  aura: number;
  referralAura: number;
  viaReferral?: boolean;
}

export interface WaitlistReferralPayload {
  aura: number;
  referralCount: number;
  referralUrl: string;
  referralAura: number;
}

const COPY: Record<
  Locale,
  {
    joined: {
      subject: string;
      preview: string;
      heading: string;
      body: string;
      viaBody: string;
      award: string;
      share: string;
      cta: string;
      footer: string;
    };
    referral: {
      subject: string;
      preview: string;
      heading: string;
      body: string;
      award: string;
      share: string;
      cta: string;
      footer: string;
    };
  }
> = {
  en: {
    joined: {
      subject: "You're in. +{aura} Aura for showing up early.",
      preview: 'Early beta is yours. Share your link and farm more Aura before launch.',
      heading: "You're on the list.",
      body: "Aura drops in two weeks. You just locked in +{aura} Aura for joining early. When the app opens, this score lands on your account.",
      viaBody:
        "Aura drops in two weeks. You just locked in +{aura} Aura for joining early. When you open the app, this score lands on your account — and the person who sent you this gets +{referralAura}.",
      award: '+{aura} Aura · early join',
      share: 'Send this link to a friend. You get +{referralAura} Aura when they sign up and open the app.',
      cta: 'Copy your link',
      footer: "You're getting this because you joined the Aura early beta. We'll only write when it matters.",
    },
    referral: {
      subject: 'Someone signed up through you. +{referralAura} Aura.',
      preview: 'Your link worked. They opened the app. You just got paid.',
      heading: 'That one counted.',
      body: 'A friend signed up with your link. You just earned +{referralAura} Aura. {referralCount} people have signed up through you.',
      award: '+{referralAura} Aura · referral',
      share: 'Keep sharing. Same link. Same +{referralAura} every time someone actually signs up.',
      cta: 'Share again',
      footer: "You're getting this because someone signed up for Aura through your link.",
    },
  },
  pt: {
    joined: {
      subject: 'Estás dentro. +{aura} Aura por chegares cedo.',
      preview: 'A beta antecipada é tua. Partilha o link e farma mais Aura antes do lançamento.',
      heading: 'Estás na lista.',
      body: 'A Aura chega daqui a duas semanas. Acabaste de bloquear +{aura} Aura por entrares cedo. Quando a app abrir, esta pontuação vai para a tua conta.',
      viaBody:
        'A Aura chega daqui a duas semanas. Acabaste de bloquear +{aura} Aura por entrares cedo. Quando abrires a app, esta pontuação vai para a tua conta — e quem te mandou isto ganha +{referralAura}.',
      award: '+{aura} Aura · entrada antecipada',
      share: 'Envia este link a um amigo. Ganhas +{referralAura} Aura quando ele criar conta e abrir a app.',
      cta: 'Copia o teu link',
      footer: 'Recebeste isto porque entraste na beta antecipada da Aura. Só escrevemos quando importa.',
    },
    referral: {
      subject: 'Alguém criou conta pelo teu link. +{referralAura} Aura.',
      preview: 'O teu link funcionou. Entraram na app. Acabaste de ser pago.',
      heading: 'Essa contou.',
      body: 'Um amigo criou conta com o teu link. Ganhaste +{referralAura} Aura. Já trouxeste {referralCount} pessoas a sério.',
      award: '+{referralAura} Aura · convite',
      share: 'Continua a partilhar. O mesmo link. Mais +{referralAura} de cada vez que alguém criar conta.',
      cta: 'Partilhar outra vez',
      footer: 'Recebeste isto porque alguém criou conta na Aura pelo teu link.',
    },
  },
};

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

function layout(args: {
  heading: string;
  body: string;
  award: string;
  share: string;
  cta: string;
  url: string;
  footer: string;
  preview: string;
}): string {
  const safeUrl = escapeHtml(args.url);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Aura</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0F;color:#FFFFFF;font-family:Inter,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(args.preview)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0A0A0F;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#14141C;border:1px solid #2A2A38;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="height:4px;background:linear-gradient(135deg,#8B5CF6,#6D28D9);"></td>
          </tr>
          <tr>
            <td style="padding:32px 28px 12px;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#A78BFA;">AURA</td>
          </tr>
          <tr>
            <td style="padding:0 28px 16px;font-size:28px;line-height:34px;font-weight:800;">${escapeHtml(args.heading)}</td>
          </tr>
          <tr>
            <td style="padding:0 28px 20px;font-size:16px;line-height:24px;color:#A1A1AA;">${escapeHtml(args.body)}</td>
          </tr>
          <tr>
            <td style="padding:0 28px 20px;">
              <div style="display:inline-block;padding:10px 14px;border-radius:999px;background:linear-gradient(135deg,#8B5CF6,#6D28D9);font-size:14px;font-weight:700;">${escapeHtml(args.award)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 12px;font-size:16px;line-height:24px;color:#A1A1AA;">${escapeHtml(args.share)}</td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;">
              <a href="${safeUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#8B5CF6;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:16px;">${escapeHtml(args.cta)}</a>
              <p style="margin:16px 0 0;font-size:13px;line-height:20px;color:#71717A;word-break:break-all;">${safeUrl}</p>
            </td>
          </tr>
        </table>
        <p style="max-width:520px;margin:20px 0 0;font-size:12px;line-height:18px;color:#71717A;">${escapeHtml(args.footer)}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderWaitlistJoined(locale: Locale, payload: WaitlistJoinedPayload): RenderedMail {
  const copy = COPY[locale].joined;
  const values = { aura: payload.aura, referralAura: payload.referralAura };
  const subject = fill(copy.subject, values);
  const body = fill(payload.viaReferral ? copy.viaBody : copy.body, values);
  const award = fill(copy.award, values);
  const share = fill(copy.share, values);
  const text = [
    copy.heading,
    '',
    body,
    award,
    '',
    share,
    payload.referralUrl,
  ].join('\n');

  return {
    subject,
    text,
    html: layout({
      heading: copy.heading,
      body,
      award,
      share,
      cta: copy.cta,
      url: payload.referralUrl,
      footer: copy.footer,
      preview: copy.preview,
    }),
  };
}

export function renderWaitlistReferral(
  locale: Locale,
  payload: WaitlistReferralPayload,
): RenderedMail {
  const copy = COPY[locale].referral;
  const values = {
    aura: payload.aura,
    referralCount: payload.referralCount,
    referralAura: payload.referralAura,
  };
  const subject = fill(copy.subject, values);
  const body = fill(copy.body, values);
  const award = fill(copy.award, values);
  const share = fill(copy.share, values);
  const text = [
    copy.heading,
    '',
    body,
    award,
    '',
    share,
    payload.referralUrl,
  ].join('\n');

  return {
    subject,
    text,
    html: layout({
      heading: copy.heading,
      body,
      award,
      share,
      cta: copy.cta,
      url: payload.referralUrl,
      footer: copy.footer,
      preview: copy.preview,
    }),
  };
}
