import candleDollsBlown from '../assets/images/candle_dolls_blown_1794675050655.jpg';
import candleDollsIntro from '../assets/images/candle_dolls_intro_1794675049468.jpg';
import candleDollsReveal from '../assets/images/candle_dolls_reveal_1794675051226.jpg';
import {
  type Birthday1RawInput,
  type CardConfigPayload,
  DEFAULT_BIRTHDAY1_MUSIC,
  DEFAULT_CARD_CONFIG,
  DEFAULT_DEMO_PHOTOS,
  type MemoryItem,
  type MusicInfo,
  type NoteItem,
} from './cardDefaults';

export type {
  Birthday1RawInput,
  CardConfigPayload,
  MemoryInput,
  MemoryItem,
  MusicInfo,
  NoteItem,
  ReplyEntry,
} from './cardDefaults';

export const CANDLE_DOLLS_MEDIA = {
  intro: candleDollsIntro,
  reveal: candleDollsReveal,
  blown: candleDollsBlown,
};

export interface Birthday1UIDict {
  coverFor: string;
  pull: string;
  orTap: string;
  wishTop: string;
  touchPhoto: string;
  makeWish: string;
  holdBlow: string;
  micBlow: string;
  micLive: string;
  forYou: string;
  happy: string;
  age: string;
  scroll: string;
  notesTitle: string;
  notesSub: string;
  memTitle: string;
  memSub: string;
  togTxt: string;
  letterTitle: string;
  breakSeal: string;
  skip: string;
  owTitle: string;
  giftTitle: string;
  giftSub: string;
  peel: string;
  peelTap: string;
  replyTitle: string;
  replyLabel: string;
  replyPh: string;
  send: string;
  sending: string;
  sent: string;
  writeAgain: string;
  sendFail: string;
  demoNote: string;
  endLine: string;
  endFrom: string;
  restart: string;
  close: string;
  tapGo: string;
}

export interface Birthday1Data {
  occasion: 'birthday' | 'anniversary';
  lang: 'bn' | 'en';
  to: string;
  from: string;
  name: string;
  ui: Birthday1UIDict;
  dedication: string;
  meta: string;
  bnDate: string;
  shortDate: string;
  togetherSince: string | null;
  notes: NoteItem[];
  memories: MemoryItem[];
  letter: {
    greeting: string;
    paragraphs: string[];
    signoff: string;
    signature: string;
  };
  openWhen: NoteItem[];
  coupons: NoteItem[];
  mic: boolean;
  petals: boolean;
  music: MusicInfo;
}

const ASSET_MAP: Record<string, string> = {
  cover: '/assets/birthday_1/cover.jpg',
  'cover-end': '/assets/birthday_1/cover-end.jpg',
  'cover-open': '/assets/birthday_1/cover-open.mp4',
  'candle-intro': '/assets/birthday_1/candle-intro.mp4',
  'candle-intro-poster': '/assets/birthday_1/candle-intro-poster.jpg',
  'candle-reveal': '/assets/birthday_1/candle-reveal.mp4',
  'candle-reveal-poster': '/assets/birthday_1/candle-reveal-poster.jpg',
  'candle-reveal-end': '/assets/birthday_1/candle-reveal-end.jpg',
  'candle-blow': '/assets/birthday_1/candle-blow.mp4',
  'candle-blow-end': '/assets/birthday_1/candle-blow-end.jpg',
  'bg-paper': '/assets/birthday_1/bg-paper.mp4',
  'bg-paper-poster': '/assets/birthday_1/bg-paper-poster.jpg',
  'bg-evening': '/assets/birthday_1/bg-evening.mp4',
  'bg-evening-poster': '/assets/birthday_1/bg-evening-poster.jpg',
  'letter-page': '/assets/birthday_1/letter-page.webp',
  'memory-1': '/assets/birthday_1/memory-1.jpg',
  'memory-2': '/assets/birthday_1/memory-2.jpg',
  'memory-3': '/assets/birthday_1/memory-3.jpg',
  'memory-4': '/assets/birthday_1/memory-4.jpg',
  music: '/assets/birthday_1/music.mp3',
  bouquet: '/assets/birthday_1/bouquet.webp',
  bow: '/assets/birthday_1/bow.webp',
  clip: '/assets/birthday_1/clip.webp',
  clothespin: '/assets/birthday_1/clothespin.webp',
  envelope: '/assets/birthday_1/envelope.webp',
  notecard: '/assets/birthday_1/notecard.webp',
  petal: '/assets/birthday_1/petal.webp',
  polaroid: '/assets/birthday_1/polaroid.webp',
  ribbon: '/assets/birthday_1/ribbon.webp',
  seal: '/assets/birthday_1/seal.webp',
  'seal-l': '/assets/birthday_1/seal-l.webp',
  'seal-r': '/assets/birthday_1/seal-r.webp',
  stamp: '/assets/birthday_1/stamp.webp',
  sticker: '/assets/birthday_1/sticker.webp',
  tag1: '/assets/birthday_1/tag1.webp',
  tag2: '/assets/birthday_1/tag2.webp',
  tag3: '/assets/birthday_1/tag3.webp',
  ticket: '/assets/birthday_1/ticket.webp',
  washi1: '/assets/birthday_1/washi1.webp',
  washi2: '/assets/birthday_1/washi2.webp',
  'pen-nib': '/assets/birthday_1/pen-nib.png',
};

export function getAsset(name: string): string {
  return ASSET_MAP[name] ?? `/assets/birthday_1/${name}.webp`;
}

export const BIRTHDAY1_MUSIC = DEFAULT_BIRTHDAY1_MUSIC;
export const DEMO_PHOTOS = DEFAULT_DEMO_PHOTOS;

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

export function bnNum(val: string | number): string {
  return String(val).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

export function localNum(val: string | number, lang: 'bn' | 'en'): string {
  return lang === 'bn' ? bnNum(val) : String(val);
}

const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const BN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

const BN_CAL_MONTHS_BN = [
  'বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন',
  'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র',
];

const BN_CAL_MONTHS_EN = [
  'Boishakh', 'Joishtho', 'Asharh', 'Shrabon', 'Bhadro', 'Ashwin',
  'Kartik', 'Ogrohayon', 'Poush', 'Magh', 'Falgun', 'Choitro',
];

const BN_DAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseDateParts(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) } : null;
}

export function bengaliDate(y: number, m: number, d: number): { day: number; month: number; year: number } {
  const target = Date.UTC(y, m, d);
  let startYear = y;
  let pohela = Date.UTC(startYear, 3, 14);
  if (target < pohela) {
    startYear -= 1;
    pohela = Date.UTC(startYear, 3, 14);
  }
  let diff = Math.round((target - pohela) / 86400000);
  const nextYear = startYear + 1;
  const leap = (nextYear % 4 === 0 && nextYear % 100 !== 0) || nextYear % 400 === 0;
  const monthLens = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, leap ? 30 : 29, 30];
  let idx = 0;
  while (idx < 11 && diff >= monthLens[idx]) {
    diff -= monthLens[idx];
    idx++;
  }
  return { day: diff + 1, month: idx, year: startYear - 593 };
}

export function formatBirthdayDate(iso: string, lang: 'bn' | 'en', short = false): string {
  const parts = parseDateParts(iso);
  if (!parts) return '';
  const month = lang === 'bn' ? BN_MONTHS[parts.m] : EN_MONTHS[parts.m];
  const label = short && lang === 'en' ? month.slice(0, 3) : month;
  return lang === 'bn'
    ? `${bnNum(parts.d)} ${label} ${bnNum(parts.y)}`
    : `${parts.d} ${label} ${parts.y}`;
}

export function daysSince(iso: string, nowMs = Date.now()): number {
  const parts = parseDateParts(iso);
  if (!parts) return 0;
  return Math.max(0, Math.floor((nowMs - Date.UTC(parts.y, parts.m, parts.d)) / 86400000));
}

function fillNames(text: string, to: string, from: string): string {
  return text.replace(/\{to\}/g, to).replace(/\{from\}/g, from);
}

const UI_STRINGS: Record<keyof Birthday1UIDict, [string, string, string]> = {
  coverFor: ['{to}-এর জন্য', '{to}-এর জন্য', 'For {to}'],
  pull: ['ফিতেটা টেনে খোলো', 'ফিতেটা টেনে খুলুন', 'Pull the ribbon to open'],
  orTap: ['অথবা এখানে ট্যাপ করো', 'অথবা এখানে ট্যাপ করুন', 'or just tap here'],
  wishTop: ['তোমার জন্য একটা মোমবাতি', 'আপনার জন্য একটা মোমবাতি', 'A candle, just for you'],
  touchPhoto: ['ছবিটা ছুঁয়ে দেখো', 'ছবিটা ছুঁয়ে দেখুন', 'Touch the photo'],
  makeWish: ['চোখ বন্ধ করে একটা ইচ্ছে করো…\nতারপর ফুঁ দাও', 'চোখ বন্ধ করে একটা ইচ্ছে করুন…\nতারপর ফুঁ দিন', 'Close your eyes, make a wish…\nthen blow'],
  holdBlow: ['চেপে ধরে ফুঁ দাও', 'চেপে ধরে ফুঁ দিন', 'Press and hold to blow'],
  micBlow: ['অথবা মাইকে ফুঁ দাও', 'অথবা মাইকে ফুঁ দিন', 'or blow into the mic'],
  micLive: ['এবার মাইকে ফুঁ দাও…', 'এবার মাইকে ফুঁ দিন…', 'Blow into the mic now…'],
  forYou: ['{from}-এর পক্ষ থেকে', '{from}-এর পক্ষ থেকে', 'from {from}'],
  happy: ['শুভ জন্মদিন', 'শুভ জন্মদিন', 'Happy Birthday'],
  age: ['{age}-এ পা দিলে', '{age}-এ পা দিলেন', 'turning {age}'],
  scroll: ['নিচে স্ক্রল করো', 'নিচে স্ক্রল করুন', 'Scroll down'],
  notesTitle: ['ছোট্ট চিরকুট', 'ছোট্ট চিরকুট', 'Little notes'],
  notesSub: ['এই বছরের জন্য কয়েকটা ইচ্ছে — ছুঁলে দুলে ওঠে', 'এই বছরের জন্য কয়েকটা ইচ্ছে — ছুঁলে দুলে ওঠে', 'A few wishes for this year — touch one'],
  memTitle: ['স্মৃতির পাতা', 'স্মৃতির পাতা', 'Our pages'],
  memSub: ['ছবিতে ট্যাপ করে কাছ থেকে দেখো', 'ছবিতে ট্যাপ করে কাছ থেকে দেখুন', 'Tap a photo to look closer'],
  togTxt: ['দিন একসাথে', 'দিন একসাথে', 'days together'],
  letterTitle: ['তোমার জন্য চিঠি', 'আপনার জন্য চিঠি', 'A letter for you'],
  breakSeal: ['সিলটা ভাঙো', 'সিলটা ভাঙুন', 'Break the seal'],
  skip: ['পুরো চিঠি দেখো', 'পুরো চিঠি দেখুন', 'Show the whole letter'],
  owTitle: ['আরও কয়েকটা খাম…', 'আরও কয়েকটা খাম…', 'A few more envelopes…'],
  giftTitle: ['উপহার', 'উপহার', 'Gifts'],
  giftSub: ['স্টিকারটা টেনে তুলে দেখো', 'স্টিকারটা টেনে তুলে দেখুন', 'Peel the sticker to see'],
  peel: ['টেনে তোলো →', 'টেনে তুলুন →', 'peel →'],
  peelTap: ['টানতে না চাইলে টিকিটে ট্যাপ করো', 'টানতে না চাইলে টিকিটে ট্যাপ করুন', 'Or just tap a ticket'],
  replyTitle: ['এবার তোমার পালা', 'এবার আপনার পালা', 'Your turn'],
  replyLabel: ['{from}-কে কিছু লেখো', '{from}-কে কিছু লিখুন', 'Write something to {from}'],
  replyPh: ['লেখো যা মনে আসে…', 'লিখুন যা মনে আসে…', 'Write whatever comes to mind…'],
  send: ['খামে ভরে পাঠাও', 'খামে ভরে পাঠান', 'Seal & send'],
  sending: ['পাঠানো হচ্ছে…', 'পাঠানো হচ্ছে…', 'Sending…'],
  sent: ['তোমার চিরকুট পৌঁছে গেছে {from}-এর কাছে', 'আপনার চিরকুট পৌঁছে গেছে {from}-এর কাছে', 'Your note reached {from}'],
  writeAgain: ['আরেকটা লেখো', 'আরেকটা লিখুন', 'Write another'],
  sendFail: ['পাঠানো যায়নি, একটু পরে আবার চেষ্টা করো', 'পাঠানো যায়নি, একটু পরে আবার চেষ্টা করুন', "Couldn't send, please try again shortly"],
  demoNote: ['এখানে যা লিখবে তা সরাসরি {from}-এর কাছে পৌঁছে যাবে।', 'এখানে যা লিখবেন তা সরাসরি {from}-এর কাছে পৌঁছে যাবে।', 'Whatever you write here goes straight to {from}.'],
  endLine: ['আবারও শুভ জন্মদিন, {to}', 'আবারও শুভ জন্মদিন, {to}', 'Happy birthday again, {to}'],
  endFrom: ['— ভালোবাসা নিয়ে, {from}', '— শ্রদ্ধা ও ভালোবাসা নিয়ে, {from}', '— with love, {from}'],
  restart: ['আবার শুরু থেকে', 'আবার শুরু থেকে', 'Start again'],
  close: ['বন্ধ করো', 'বন্ধ করুন', 'Close'],
  tapGo: ['এখানে ট্যাপ করে ফুঁ দাও', 'এখানে ট্যাপ করে ফুঁ দিন', 'Tap here to blow'],
};

export const MUSIC_PLAYER_UI = {
  bn: {
    playMusic: 'গান চালান',
    pauseMusic: 'গান থামান',
    showMusic: 'গানের তথ্য দেখুন',
    hideMusic: 'গানের তথ্য লুকান',
    nowPlaying: 'চলছে',
  },
  en: {
    playMusic: 'Play music',
    pauseMusic: 'Pause music',
    showMusic: 'Show song details',
    hideMusic: 'Hide song details',
    nowPlaying: 'Now playing',
  },
};

const LETTER_DEFAULTS = {
  bn: {
    greeting: 'প্রিয় {to},',
    signoff: { tumi: 'তোমারই,', apni: 'শ্রদ্ধা ও ভালোবাসায়,' },
    signature: '{from}',
  },
  en: {
    greeting: 'Dear {to},',
    signoff: { tumi: 'Forever yours,', apni: 'With love and respect,' },
    signature: '{from}',
  },
};

export function buildBirthday1Data(
  raw: Birthday1RawInput,
  photos: string[],
  music: MusicInfo
): Birthday1Data {
  const lang = raw.lang === 'en' ? 'en' : 'bn';
  const reg = raw.register === 'apni' ? 'apni' : 'tumi';
  const to = raw.to.trim() || (lang === 'bn' ? 'প্রিয়জন' : 'my dear');
  const from = raw.from.trim();
  const ageStr = /^\d{1,3}$/.test(raw.age.trim()) ? raw.age.trim() : '';
  const uiIdx = lang === 'en' ? 2 : reg === 'apni' ? 1 : 0;

  const vars: Record<string, string> = {
    to,
    from,
    age: localNum(ageStr, lang),
    years: localNum(ageStr, lang),
  };

  const ui = Object.fromEntries(
    Object.entries(UI_STRINGS).map(([key, tuple]) => [
      key,
      tuple[uiIdx].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? ''),
    ])
  ) as unknown as Birthday1UIDict;

  const fill = (s: string) => fillNames(s.trim(), to, from);
  const filterNotes = (arr: NoteItem[]) =>
    arr.map((item) => ({ title: fill(item.title), text: fill(item.text) })).filter((item) => item.title || item.text);

  const def = LETTER_DEFAULTS[lang];
  const dateStr = formatBirthdayDate(raw.birthday, lang);

  const bParts = parseDateParts(raw.birthday);
  let bnDate = '';
  if (bParts) {
    const weekday = new Date(Date.UTC(bParts.y, bParts.m, bParts.d)).getUTCDay();
    const bd = bengaliDate(bParts.y, bParts.m, bParts.d);
    bnDate =
      lang === 'bn'
        ? `${BN_DAYS[weekday]} · ${bnNum(bd.day)} ${BN_CAL_MONTHS_BN[bd.month]} ${bnNum(bd.year)} বঙ্গাব্দ`
        : `${EN_DAYS[weekday]} · ${bd.day} ${BN_CAL_MONTHS_EN[bd.month]} ${bd.year} (Bengali calendar)`;
  }

  return {
    occasion: 'birthday',
    lang,
    to,
    from,
    name: to,
    ui,
    dedication: fill(raw.dedication),
    meta: [ageStr ? ui.age : '', dateStr].filter(Boolean).join(' · '),
    bnDate,
    shortDate: formatBirthdayDate(raw.birthday, lang, true),
    togetherSince: parseDateParts(raw.togetherSince) ? raw.togetherSince : null,
    notes: filterNotes(raw.notes),
    memories: raw.memories
      .map((m, idx) => ({
        src: photos[idx] ?? '',
        caption: fill(m.caption),
        date: parseDateParts(m.date) ? formatBirthdayDate(m.date, lang) : '',
      }))
      .filter((m) => m.src),
    letter: {
      greeting: fill(raw.greeting || def.greeting),
      paragraphs: raw.paragraphs.map(fill).filter(Boolean),
      signoff: fill(raw.signoff || def.signoff[reg]),
      signature: fill(raw.signature || def.signature),
    },
    openWhen: filterNotes(raw.openWhen),
    coupons: filterNotes(raw.coupons),
    mic: raw.mic !== false,
    petals: raw.petals !== false,
    music,
  };
}

export function buildBilingualData(cfg: CardConfigPayload): Record<'bn' | 'en', Birthday1Data> {
  return {
    bn: buildBirthday1Data(cfg.bn, cfg.photos, cfg.music),
    en: buildBirthday1Data(cfg.en, cfg.photos, cfg.music),
  };
}

export const DEMO_DATA: Record<'bn' | 'en', Birthday1Data> = buildBilingualData(DEFAULT_CARD_CONFIG);
