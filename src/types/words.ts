export interface Word {
  english: string;
  turkish: string;
  type: 'n.' | 'v.' | 'adj.' | 'adv.' | 'interj.' | 'prep.' | 'conj.';
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}

export interface WordsData {
  words: Word[];
} 