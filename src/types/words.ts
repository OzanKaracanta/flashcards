export interface Word {
  english: string;
  turkish: string;
  type: 'n.' | 'v.' | 'adj.' | 'adv.' | 'interj.' | 'prep.' | 'conj.';
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  group: number; // 1-10
}

export interface WordsData {
  words: Word[];
}

export interface UserProgress {
  activeGroup: number;
  learnedWords: string[];
  recentlyLearned: Array<{
    english: string;
    turkish: string;
    learnedAt: string;
  }>;
} 