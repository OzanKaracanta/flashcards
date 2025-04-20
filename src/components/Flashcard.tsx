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
  onAnimationComplete?: () => void;
  isAnimating?: boolean;
}

export default function Flashcard({ 
  word, 
  userId, 
  showNextWord, 
  onLearned,
  onAnimationComplete,
  isAnimating = false
}: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [currentWord, setCurrentWord] = useState(word);

  useEffect(() => {
    if (!isLeaving) {
      setCurrentWord(word);
      setIsFlipped(false);
    }
  }, [word, isLeaving]);

  const handleFlip = () => {
    if (!isLeaving) {
      setIsFlipped(!isFlipped);
    }
  };

  const handleWordAction = async (action: 'learned' | 'keep') => {
    if (isLeaving || isAnimating) return;

    // If card is flipped, flip it back first
    if (isFlipped) {
      setIsFlipped(false);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsLeaving(true);
    
    if (action === 'learned') {
      if (userId) {
        try {
          await setDoc(doc(db, 'users', userId, 'learnedWords', word.english), {
            word: word.english,
            translation: word.turkish,
            learnedAt: new Date().toISOString(),
          });
          onLearned();
        } catch (error) {
          console.error('Error saving learned word:', error);
          setIsLeaving(false);
          return;
        }
      } else {
        onLearned();
      }
    }

    // Start exit animation
    setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
      setIsLeaving(false);
    }, 300);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div 
        className="relative h-64 cursor-pointer [perspective:1000px]"
        onClick={handleFlip}
      >
        <div 
          className={`
            absolute w-full h-full 
            transition-all duration-300 ease-in-out
            [transform-style:preserve-3d]
            ${isFlipped ? '[transform:rotateY(180deg)]' : ''}
            ${isLeaving ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}
          `}
        >
          <div className={`
            absolute w-full h-full 
            [backface-visibility:hidden] 
            bg-white rounded-lg shadow-lg 
            flex items-center justify-center
            ${isLeaving ? 'pointer-events-none' : ''}
          `}>
            <h2 className="text-2xl font-bold">{currentWord.english}</h2>
          </div>
          <div className={`
            absolute w-full h-full 
            [backface-visibility:hidden] 
            [transform:rotateY(180deg)] 
            bg-blue-50 rounded-lg shadow-lg 
            flex items-center justify-center
            ${isLeaving ? 'pointer-events-none' : ''}
          `}>
            <h2 className="text-2xl font-bold">{currentWord.turkish}</h2>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={() => handleWordAction('learned')}
          disabled={isLeaving || isAnimating}
          className={`px-6 py-2 text-white rounded-lg transition-colors ${
            isLeaving || isAnimating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          Learned
        </button>
        <button
          onClick={() => handleWordAction('keep')}
          disabled={isLeaving || isAnimating}
          className={`px-6 py-2 text-white rounded-lg transition-colors ${
            isLeaving || isAnimating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          Keep in List
        </button>
      </div>
    </div>
  );
} 