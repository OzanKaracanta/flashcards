'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Flashcard from '@/components/Flashcard';
import Progress from '@/components/Progress';
import LearnedWords from '@/components/LearnedWords';
import wordsData from '@/data/words.json';
import type { Word, WordsData, UserProgress } from '@/types/words';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import LogoutButton from '@/components/auth/LogoutButton';

// Type assertion for the imported JSON
const typedWordsData = wordsData as WordsData;
const words = typedWordsData?.words || [];

// Assign groups to words (300 words per group)
const wordsWithGroups = words.map((word, index) => ({
  ...word,
  group: Math.floor(index / 300) + 1
}));

// Verify group assignments
const groupCounts = wordsWithGroups.reduce((acc, word) => {
  acc[word.group] = (acc[word.group] || 0) + 1;
  return acc;
}, {} as Record<number, number>);

console.log('Group counts:', groupCounts);

export default function AppPage() {
  const { user, isGuest } = useAuth();
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [learnedWords, setLearnedWords] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState(1);
  const [allWordsLearned, setAllWordsLearned] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [recentlyLearned, setRecentlyLearned] = useState<Array<{
    english: string;
    turkish: string;
    learnedAt: string;
  }>>([]);

  // Filter words for current group
  const currentGroupWords = wordsWithGroups.filter(word => word.group === activeGroup);

  useEffect(() => {
    console.log('AppPage - Auth state:', { user, isGuest });
  }, [user, isGuest]);

  useEffect(() => {
    const loadUserProgress = async () => {
      console.log('AppPage - Loading user progress for:', { user, isGuest });
      try {
        if (isGuest) {
          // Load from localStorage for guest users
          const savedProgress = localStorage.getItem('userProgress');
          if (savedProgress) {
            const progress: UserProgress = JSON.parse(savedProgress);
            setActiveGroup(progress.activeGroup);
            setLearnedWords(new Set(progress.learnedWords));
            setRecentlyLearned(progress.recentlyLearned || []);
          }
        } else if (user) {
          const userDoc = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDoc);
          
          if (docSnap.exists()) {
            const progress = docSnap.data() as UserProgress;
            setActiveGroup(progress.activeGroup);
            setLearnedWords(new Set(progress.learnedWords));
            setRecentlyLearned(progress.recentlyLearned || []);
          } else {
            // Initialize new user
            await setDoc(userDoc, {
              activeGroup: 1,
              learnedWords: [],
              recentlyLearned: []
            });
          }
        }
      } catch (err) {
        console.error('Error loading user progress:', err);
        setError('Failed to load user progress');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProgress();
  }, [user, isGuest]);

  const saveUserProgress = async (newLearnedWords: Set<string>, newActiveGroup: number) => {
    const progress: UserProgress = {
      activeGroup: newActiveGroup,
      learnedWords: Array.from(newLearnedWords),
      recentlyLearned: recentlyLearned
    };

    if (isGuest) {
      localStorage.setItem('userProgress', JSON.stringify(progress));
    } else if (user) {
      try {
        // Save to main user document
        await setDoc(doc(db, 'users', user.uid), progress);

        // Save individual learned words
        const batch = writeBatch(db);
        Array.from(newLearnedWords).forEach(word => {
          const wordDoc = doc(db, 'users', user.uid, 'learnedWords', word);
          const wordData = wordsWithGroups.find(w => w.english === word);
          if (wordData) {
            batch.set(wordDoc, {
              word: wordData.english,
              translation: wordData.turkish,
              learnedAt: new Date().toISOString(),
              group: wordData.group
            });
          }
        });
        await batch.commit();
      } catch (error) {
        console.error('Error saving progress:', error);
        setError('Failed to save progress');
      }
    }
  };

  const getNextWord = () => {
    const unlearnedWords = currentGroupWords.filter(
      word => !learnedWords.has(word.english)
    );

    if (unlearnedWords.length === 0) {
      // All words in current group are learned
      if (activeGroup < 10) {
        setActiveGroup(prev => prev + 1);
        setCurrentWordIndex(0);
      } else {
        setAllWordsLearned(true);
      }
      return;
    }

    // Find the next unlearned word in the current group
    const currentIndex = currentGroupWords.findIndex(
      word => word.english === currentGroupWords[currentWordIndex]?.english
    );
    
    // Start searching from the next word
    let nextIndex = (currentIndex + 1) % currentGroupWords.length;
    let attempts = 0;
    
    // Find the next unlearned word
    while (learnedWords.has(currentGroupWords[nextIndex].english) && attempts < currentGroupWords.length) {
      nextIndex = (nextIndex + 1) % currentGroupWords.length;
      attempts++;
    }
    
    setCurrentWordIndex(nextIndex);
  };

  const handleAnimationComplete = () => {
    setIsAnimating(false);
    getNextWord();
  };

  const handleWordLearned = async (word: string) => {
    setLearnedWords(prev => {
      const newSet = new Set(prev);
      newSet.add(word);
      
      // Add to recently learned words
      const currentWord = wordsWithGroups.find(w => w.english === word);
      if (currentWord) {
        const newRecentlyLearned = [
          {
            english: currentWord.english,
            turkish: currentWord.turkish,
            learnedAt: new Date().toISOString()
          },
          ...recentlyLearned.filter(w => w.english !== word).slice(0, 4)
        ];
        
        setRecentlyLearned(newRecentlyLearned);
        
        // Save progress with updated recently learned words
        const progress: UserProgress = {
          activeGroup,
          learnedWords: Array.from(newSet),
          recentlyLearned: newRecentlyLearned
        };

        if (!isGuest && user) {
          saveUserProgress(newSet, activeGroup);
        } else {
          localStorage.setItem('userProgress', JSON.stringify(progress));
        }
      }

      // Check if all words in current group are learned
      const currentGroupWords = wordsWithGroups.filter(w => w.group === activeGroup);
      const allGroupWordsLearned = currentGroupWords.every(
        w => newSet.has(w.english)
      );

      if (allGroupWordsLearned) {
        // Verify next group exists before proceeding
        const nextGroup = activeGroup + 1;
        const nextGroupWords = wordsWithGroups.filter(w => w.group === nextGroup);
        
        if (nextGroupWords.length > 0 && nextGroup <= 10) {
          setActiveGroup(nextGroup);
          // Find first unlearned word in the next group
          const firstUnlearnedIndex = wordsWithGroups.findIndex(
            w => w.group === nextGroup && !newSet.has(w.english)
          );
          setCurrentWordIndex(firstUnlearnedIndex >= 0 ? firstUnlearnedIndex : 0);
        } else {
          setAllWordsLearned(true);
        }
      }

      return newSet;
    });
  };

  const handleUnlearn = async (word: string) => {
    try {
      // Remove from learned words
      const newLearnedWords = new Set(learnedWords);
      newLearnedWords.delete(word);
      setLearnedWords(newLearnedWords);

      // Remove from recently learned
      const newRecentlyLearned = recentlyLearned.filter(w => w.english !== word);
      setRecentlyLearned(newRecentlyLearned);

      // Update Firebase or localStorage
      const progress: UserProgress = {
        activeGroup,
        learnedWords: Array.from(newLearnedWords),
        recentlyLearned: newRecentlyLearned
      };

      if (!isGuest && user) {
        try {
          // Update main user document
          await setDoc(doc(db, 'users', user.uid), progress);
          // Delete from learnedWords collection
          await deleteDoc(doc(db, 'users', user.uid, 'learnedWords', word));
        } catch (error) {
          console.error('Error updating Firebase:', error);
          setError('Failed to unlearn word');
        }
      } else {
        localStorage.setItem('userProgress', JSON.stringify(progress));
      }
    } catch (error) {
      console.error('Error unlearning word:', error);
      setError('Failed to unlearn word');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (allWordsLearned) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Tebrikler! 🎉</h1>
          <p className="text-gray-600">Tüm kelimeleri öğrendiniz!</p>
          <p className="text-gray-500 mt-2">
            Öğrenilen kelime sayısı: {words.length}
          </p>
        </div>
      </div>
    );
  }

  // Safety check for currentWord
  if (!currentGroupWords.length || currentWordIndex >= currentGroupWords.length) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <p className="text-red-500">Bir hata oluştu. Lütfen sayfayı yenileyin.</p>
        </div>
      </div>
    );
  }

  const currentWord = currentGroupWords[currentWordIndex];
  
  return (
    <ProtectedRoute>
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100">
        <div className="w-full max-w-md">
          <Progress
            currentGroup={activeGroup}
            totalGroups={10}
            learnedCount={Array.from(learnedWords).filter(word => 
              wordsWithGroups.find(w => w.english === word)?.group === activeGroup
            ).length}
            totalCount={currentGroupWords.length}
          />

          {currentWord && (
            <Flashcard
              word={currentWord}
              userId={user?.uid || 'guest'}
              showNextWord={getNextWord}
              onLearned={() => {
                setIsAnimating(true);
                handleWordLearned(currentWord.english);
              }}
              onAnimationComplete={handleAnimationComplete}
              isAnimating={isAnimating}
            />
          )}

          <LearnedWords
            words={recentlyLearned}
            onUnlearn={handleUnlearn}
          />
        </div>
        <LogoutButton />
      </main>
    </ProtectedRoute>
  );
} 

