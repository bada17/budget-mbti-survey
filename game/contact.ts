/*
  「이웃 소식 받기」 연락처 — 법적으로 받아야 할 것을 다 갖춘 꼴.
  받는 곳은 게임 서버의 `/contact`(api.ts, 구글 시트면 「연락처」 탭) — 10-14 이웃의 편지 때문에 이었다.
  화면은 아직 이 컴퓨터의 개발판에서만 보인다(main.ts 의 contactReady) — 보유 기간이 정해져야 켠다(README 「연락처」).

  동의는 나눠 받는다(개인정보 보호법 22조): 필수 = 만 14세 이상 확인·수집·이용,
  선택 = 시민행동 활동·후원 안내(광고성 정보, 정보통신망법 50조). 어느 것도 미리 체크해 두지 않는다.
*/
export const CONSENT_VERSION = 'game-contact-draft-2026-10-13';
export const PRIVACY_URL = 'https://action.or.kr/8';

export type Channel = 'email' | 'sms';
export type ContactForm = {
  channel: Channel;
  address: string;
  age14: boolean;
  collect: boolean;
  marketing: boolean;
  /** 사람 눈에 안 보이는 칸 — 채워져 오면 봇. */
  website: string;
  openedAt: number;
};
export type ContactPayload = {
  consentVersion: string;
  channel: Channel;
  address: string;
  consents: { age14: true; collect: true; marketing: boolean };
  at: number;
};

const EMAIL = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/;
const MOBILE = /^01[016789]\d{7,8}$/;
const MIN_FILL_MS = 1500; // 사람은 이보다 빨리 채우지 못한다

export function checkContact(form: ContactForm, now: number): { ok: true; payload: ContactPayload } | { ok: false; error: string } {
  if (form.website || now - form.openedAt < MIN_FILL_MS) return { ok: false, error: '잠시 뒤에 다시 눌러 주세요.' };
  let address = form.address.trim();
  if (form.channel === 'email') {
    address = address.toLowerCase();
    if (address.length > 254 || !EMAIL.test(address)) return { ok: false, error: '이메일 주소를 다시 확인해 주세요.' };
  } else if (form.channel === 'sms') {
    address = address.replace(/[\s-]/g, '');
    if (!MOBILE.test(address)) return { ok: false, error: '휴대전화 번호를 다시 확인해 주세요.' };
  } else return { ok: false, error: '받을 방법을 골라 주세요.' };
  if (!form.age14) return { ok: false, error: '만 14세 이상만 신청할 수 있어요.' };
  if (!form.collect) return { ok: false, error: '개인정보 수집·이용에 동의해야 소식을 보낼 수 있어요.' };
  return { ok: true, payload: { consentVersion: CONSENT_VERSION, channel: form.channel, address, consents: { age14: true, collect: true, marketing: form.marketing }, at: now } };
}

/**
 * 서버 쪽 다시 검사 — 브라우저가 보낸 값은 믿지 않는다. 받는 곳은 게임 서버의 `/contact`(api.ts),
 * 보내는 건 main.ts 가 net.contact 로(10-14). 화면은 여전히 개발판에서만 보인다 — 보유 기간이 정해지기 전이라.
 */
export function validPayload(raw: unknown): ContactPayload | undefined {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Partial<ContactPayload>;
  if (p.consentVersion !== CONSENT_VERSION || typeof p.address !== 'string') return undefined;
  const okAddress = p.channel === 'email' ? p.address.length <= 254 && EMAIL.test(p.address) : p.channel === 'sms' && MOBILE.test(p.address);
  if (!okAddress || p.consents?.age14 !== true || p.consents?.collect !== true || typeof p.consents.marketing !== 'boolean') return undefined;
  return { consentVersion: CONSENT_VERSION, channel: p.channel!, address: p.address, consents: { age14: true, collect: true, marketing: p.consents.marketing }, at: Number(p.at) || 0 };
}
