export interface NoteItem {
  title: string;
  text: string;
}

export interface MemoryInput {
  caption: string;
  date: string;
}

export interface MemoryItem {
  src: string;
  caption: string;
  date: string;
}

export interface Birthday1RawInput {
  occasion: 'birthday' | 'anniversary';
  lang: 'bn' | 'en';
  register: 'tumi' | 'apni';
  to: string;
  from: string;
  birthday: string;
  age: string;
  togetherSince: string;
  dedication: string;
  notes: NoteItem[];
  memories: MemoryInput[];
  greeting: string;
  paragraphs: string[];
  signoff: string;
  signature: string;
  openWhen: NoteItem[];
  coupons: NoteItem[];
  mic: boolean;
  petals: boolean;
  couple: string;
  musicArtist: string;
  musicCredit: string;
}

export interface MusicInfo {
  title: string;
  artist: string;
  credit: string;
  src: string;
}

export interface CardConfigPayload {
  bn: Birthday1RawInput;
  en: Birthday1RawInput;
  photos: string[];
  music: MusicInfo;
}

export interface ReplyEntry {
  id: string;
  message: string;
  lang: 'bn' | 'en';
  createdAt: string;
}

export const DEFAULT_BIRTHDAY1_MUSIC: MusicInfo = {
  title: 'Apna Bana Le',
  artist: 'Arijit Singh · Sachin-Jigar',
  credit: 'Bhediya · lyrics Amitabh Bhattacharya',
  src: '/assets/birthday_1/music.mp3',
};

export const DEFAULT_DEMO_PHOTOS: string[] = [
  '/assets/birthday_1/memory-1.jpg',
  '/assets/birthday_1/memory-2.jpg',
  '/assets/birthday_1/memory-3.jpg',
  '/assets/birthday_1/memory-4.jpg',
];

export function createEmptyRawInput(lang: 'bn' | 'en' = 'bn'): Birthday1RawInput {
  return {
    occasion: 'birthday',
    lang,
    register: 'tumi',
    to: '',
    from: '',
    birthday: '',
    age: '',
    togetherSince: '',
    dedication: '',
    notes: [],
    memories: [],
    greeting: '',
    paragraphs: [''],
    signoff: '',
    signature: '',
    openWhen: [],
    coupons: [],
    mic: true,
    petals: true,
    couple: '',
    musicArtist: DEFAULT_BIRTHDAY1_MUSIC.artist,
    musicCredit: DEFAULT_BIRTHDAY1_MUSIC.credit,
  };
}

export const DEFAULT_CARD_CONFIG: CardConfigPayload = {
  bn: {
    ...createEmptyRawInput('bn'),
    to: 'নুসরাত',
    from: 'রাহাত',
    birthday: '2026-11-02',
    age: '25',
    togetherSince: '2024-07-14',
    dedication: 'আমার প্রিয় মানুষটাকে',
    notes: [
      { title: 'অনেক হাসি', text: 'সারা বছর যেন এমন করেই হাসো, যেমন প্রথম দিন হেসেছিলে।' },
      { title: 'নতুন শহর', text: 'এই বছর একসাথে সিলেট যাবো, চা-বাগানে হাঁটবো।' },
      { title: 'নিশ্চিন্ত ঘুম', text: 'কোনো ডেডলাইন যেন তোমার ঘুম কেড়ে না নেয়।' },
      { title: 'স্বপ্নের কাছে', text: 'যা চাও, প্রতিদিন তার এক ধাপ কাছে যাও।' },
    ],
    memories: [
      { caption: 'কাশবনে প্রথম হাঁটা', date: '2024-10-12' },
      { caption: 'ছাদের সেই সন্ধ্যা', date: '2025-01-20' },
      { caption: 'বৃষ্টির রাত', date: '2025-07-03' },
      { caption: 'তোমার গত জন্মদিন', date: '2025-11-02' },
    ],
    paragraphs: [
      'আজ তোমার জন্মদিন, আর আমি সকাল থেকে ভাবছি কী লিখবো। শেষে বুঝলাম, সব কথা লেখা যায় না, কিছু কথা শুধু অনুভব করা যায়।',
      'তোমার সাথে কাটানো প্রতিটা দিন আমার কাছে ছোট্ট উৎসবের মতো — বৃষ্টির বিকেলে চা, রিকশায় অকারণ ঘোরা, তোমার হঠাৎ হেসে ফেলা।',
      'এই নতুন বছরে আরও সাহসী হও, আরও হাসো। আমি পাশে আছি, সবসময়।',
    ],
    openWhen: [
      { title: 'খুলো যখন মন খারাপ', text: 'মনে রেখো, তুমি একা নও। একটা ফোন দাও — আমি চা নিয়ে চলে আসবো।' },
      { title: 'খুলো যখন আমাকে মিস করো', text: 'চোখ বন্ধ করো। ছাদের সেই সন্ধ্যাটা মনে করো। আমি ওখানেই আছি।' },
      { title: 'খুলো পরের জন্মদিনে', text: 'আরেকটা বছর একসাথে! এবারের ইচ্ছেটা কি পূরণ হয়েছে?' },
    ],
    coupons: [
      { title: 'একটা লম্বা রিকশা রাইড', text: 'যেকোনো সন্ধ্যায়, যতক্ষণ চাও' },
      { title: 'আনলিমিটেড ফুচকা', text: 'এক দিনের জন্য, কোনো প্রশ্ন নয়' },
      { title: 'পুরো একটা দিন তোমার', text: 'সেদিন সব সিদ্ধান্ত তুমি নেবে' },
    ],
  },
  en: {
    ...createEmptyRawInput('en'),
    to: 'Nusrat',
    from: 'Rahat',
    birthday: '2026-11-02',
    age: '25',
    togetherSince: '2024-07-14',
    dedication: 'to my favourite person',
    notes: [
      { title: 'Lots of laughter', text: 'Laugh all year the way you laughed the very first day.' },
      { title: 'A new city', text: 'This year we go to Sylhet and walk through the tea gardens.' },
      { title: 'Peaceful sleep', text: 'May no deadline ever steal your sleep.' },
      { title: 'Closer to dreams', text: 'One step closer to what you want, every day.' },
    ],
    memories: [
      { caption: 'First walk in the kash field', date: '2024-10-12' },
      { caption: 'That evening on the roof', date: '2025-01-20' },
      { caption: 'The rainy night', date: '2025-07-03' },
      { caption: 'Your last birthday', date: '2025-11-02' },
    ],
    paragraphs: [
      "It's your birthday, and I've been wondering all morning what to write. In the end I realised some things can't be written, only felt.",
      'Every day with you feels like a small festival — tea on rainy afternoons, aimless rickshaw rides, the way you suddenly burst out laughing.',
      "In this new year, be braver and laugh more. I'm right here beside you, always.",
    ],
    openWhen: [
      { title: "Open when you're sad", text: "Remember, you're not alone. Call me — I'll come over with tea." },
      { title: 'Open when you miss me', text: "Close your eyes. Remember that evening on the roof. I'm right there." },
      { title: 'Open on your next birthday', text: "Another year together! Did this year's wish come true?" },
    ],
    coupons: [
      { title: 'One long rickshaw ride', text: 'Any evening, as long as you like' },
      { title: 'Unlimited fuchka', text: 'For one day, no questions asked' },
      { title: 'A whole day, yours', text: 'You make every decision that day' },
    ],
  },
  photos: [...DEFAULT_DEMO_PHOTOS],
  music: { ...DEFAULT_BIRTHDAY1_MUSIC },
};
