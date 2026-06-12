import type { Locale } from '@/core/content';
import type { Rng } from '@/core/arena';

/**
 * Word corpora for the touch-typing trainer — common words so fingers train
 * on real letter patterns, not random noise. Generation is seeded (Rng) for
 * reproducible tests and future head-to-head typing races.
 */

const EN_WORDS = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
  'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
  'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so',
  'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
  'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people',
  'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than',
  'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
  'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even',
  'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'is',
  'was', 'are', 'been', 'has', 'had', 'were', 'said', 'each', 'where', 'much',
  'before', 'right', 'too', 'mean', 'old', 'same', 'tell', 'does', 'set', 'three',
  'must', 'state', 'never', 'become', 'between', 'high', 'really', 'something', 'life', 'world',
  'still', 'last', 'might', 'great', 'while', 'own', 'under', 'should', 'home', 'small',
  'found', 'thought', 'went', 'hand', 'part', 'place', 'made', 'live', 'again', 'point',
  'keyboard', 'window', 'screen', 'file', 'open', 'close', 'system', 'press', 'key', 'fast',
] as const;

const AR_WORDS = [
  'في', 'من', 'على', 'إلى', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'التي',
  'الذي', 'كان', 'كانت', 'يكون', 'هو', 'هي', 'هم', 'أنا', 'أنت', 'نحن',
  'ما', 'لا', 'لم', 'لن', 'قد', 'كل', 'بعض', 'غير', 'بين', 'بعد',
  'قبل', 'عند', 'حتى', 'إذا', 'لكن', 'ثم', 'أو', 'بل', 'كما', 'منذ',
  'يوم', 'وقت', 'سنة', 'عمل', 'كلمة', 'كتاب', 'بيت', 'باب', 'يد', 'عين',
  'رأس', 'قلب', 'ماء', 'نار', 'أرض', 'سماء', 'شمس', 'قمر', 'بحر', 'جبل',
  'مدينة', 'بلد', 'طريق', 'سوق', 'مدرسة', 'علم', 'قلم', 'ورقة', 'صورة', 'لغة',
  'جديد', 'قديم', 'كبير', 'صغير', 'طويل', 'قصير', 'جميل', 'سريع', 'بطيء', 'قوي',
  'كتب', 'قرأ', 'قال', 'فعل', 'ذهب', 'جاء', 'رأى', 'سمع', 'عرف', 'فهم',
  'أخذ', 'أعطى', 'وجد', 'طلب', 'بدأ', 'وصل', 'دخل', 'خرج', 'رجع', 'وقف',
  'لوحة', 'مفاتيح', 'شاشة', 'ملف', 'نافذة', 'نظام', 'زر', 'اضغط', 'افتح', 'أغلق',
] as const;

const CORPORA: Record<Locale, readonly string[]> = { en: EN_WORDS, ar: AR_WORDS };

/** `count` seeded-random words joined with single spaces. */
export function generateWords(rng: Rng, locale: Locale, count: number): string {
  const corpus = CORPORA[locale];
  const words: string[] = [];
  let previous = '';
  for (let i = 0; i < count; i++) {
    let word = corpus[Math.floor(rng() * corpus.length)];
    // No immediate repeats — they read as bugs and train nothing.
    if (word === previous) word = corpus[(corpus.indexOf(word) + 1) % corpus.length];
    words.push(word);
    previous = word;
  }
  return words.join(' ');
}
