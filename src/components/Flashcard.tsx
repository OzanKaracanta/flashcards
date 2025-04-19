'use client';

import { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FlashcardProps {
  word: {
    english: string;
    turkish: string;
  };
  userId: string;
  showNextWord: () => void;
  onLearned: () => void;
}

export default function Flashcard({ word, userId, showNextWord, onLearned }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    // Reset to front side whenever word changes
    setIsFlipped(false);
  }, [word]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleLearned = async () => {
    if (userId) {
      try {
        // Save to Firestore
        await setDoc(doc(db, 'users', userId, 'learnedWords', word.english), {
          word: word.english,
          translation: word.turkish,
          learnedAt: new Date().toISOString(),
        });
        
        // Update local state via parent component
        onLearned();
        
        // Move to next word
        showNextWord();
      } catch (error) {
        console.error('Error saving learned word:', error);
      }
    }
  };

  const handleKeepInList = () => {
    // Simply show the next word without affecting learned state
    showNextWord();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div 
        className="relative h-64 cursor-pointer [perspective:1000px]"
        onClick={handleFlip}
      >
        <div 
          className={`absolute w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${
            isFlipped ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          <div className="absolute w-full h-full [backface-visibility:hidden] bg-white rounded-lg shadow-lg flex items-center justify-center">
            <h2 className="text-2xl font-bold">{word.english}</h2>
          </div>
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-blue-50 rounded-lg shadow-lg flex items-center justify-center">
            <h2 className="text-2xl font-bold">{word.turkish}</h2>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={handleLearned}
          className="px-6 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
        >
          Learned
        </button>
        <button
          onClick={handleKeepInList}
          className="px-6 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Keep in List
        </button>
      </div>
    </div>
  );
} 