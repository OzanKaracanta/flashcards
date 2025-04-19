'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Flashcard from '@/components/Flashcard';
import wordsData from '@/data/words.json';
import type { Word, WordsData } from '@/types/words';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import LogoutButton from '@/components/auth/LogoutButton';

// Type assertion for the imported JSON
const typedWordsData = wordsData as WordsData;
const words = typedWordsData?.words || [];

export default function AppPage() {
  const { user, isGuest } = useAuth();
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [learnedWords, setLearnedWords] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allWordsLearned, setAllWordsLearned] = useState(false);

  useEffect(() => {
    const loadLearnedWords = async () => {
      if (isGuest) {
        // Load from localStorage for guest users
        const savedWords = localStorage.getItem('learnedWords');
        if (savedWords) {
          setLearnedWords(new Set(JSON.parse(savedWords)));
        }
        setIsLoading(false);
        return;
      }

      if (user) {
        try {
          const q = query(collection(db, 'users', user.uid, 'learnedWords'));
          const querySnapshot = await getDocs(q);
          const learned = new Set<string>();
          querySnapshot.forEach((doc) => {
            learned.add(doc.id);
          });
          setLearnedWords(learned);
        } catch (err) {
          console.error('Error loading learned words:', err);
          setError('Failed to load learned words');
        }
      }
      setIsLoading(false);
    };

    loadLearnedWords();
  }, [user, isGuest]);

  const getNextWord = () => {
    let nextIndex = (currentWordIndex + 1) % words.length;
    let attempts = 0;
    
    while (learnedWords.has(words[nextIndex].english) && attempts < words.length) {
      nextIndex = (nextIndex + 1) % words.length;
      attempts++;
    }
    
    if (attempts >= words.length) {
      setAllWordsLearned(true);
      return;
    }
    
    setCurrentWordIndex(nextIndex);
  };

  const handleWordLearned = (word: string) => {
    setLearnedWords(prev => {
      const newSet = new Set(prev);
      newSet.add(word);
      
      if (isGuest) {
        // Save to localStorage for guest users
        localStorage.setItem('learnedWords', JSON.stringify(Array.from(newSet)));
      }
      
      if (words.every((w: Word) => newSet.has(w.english))) {
        setAllWordsLearned(true);
      }
      return newSet;
    });
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

  const currentWord = words[currentWordIndex];
  
  return (
    <ProtectedRoute>
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100">
        <div className="w-full max-w-md">
          <div className="text-center mb-4">
            <p className="text-gray-600">
              İlerleme: {learnedWords.size} / {words.length}
            </p>
          </div>

          <Flashcard
            word={currentWord}
            userId={user?.uid || 'guest'}
            showNextWord={getNextWord}
            onLearned={() => handleWordLearned(currentWord.english)}
          />
        </div>
        <LogoutButton />
      </main>
    </ProtectedRoute>
  );
} 