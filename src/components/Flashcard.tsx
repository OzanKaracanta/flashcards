'use client';

import { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import SpeakerButton from './SpeakerButton';

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);

  useEffect(() => {
    setIsSpeechSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

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

  const speak = (text: string) => {
    if (!isSpeechSupported) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
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
      <div className="relative w-full h-64 perspective-1000">
        <div 
          className={`relative w-full h-full transition-transform duration-500 transform-gpu preserve-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          onClick={handleFlip}
        >
          {/* Front of card (English) */}
          <div className="absolute inset-0 w-full h-full backface-hidden">
            <div className="w-full h-full bg-white rounded-xl shadow-lg p-8 flex flex-col items-center justify-center">
              <div className="absolute top-4 right-4">
                <SpeakerButton word={currentWord.english} />
              </div>
              <h2 className="text-3xl font-bold mb-6 text-gray-800">{currentWord.english}</h2>
            </div>
          </div>

          {/* Back of card (Turkish) */}
          <div 
            className="absolute inset-0 w-full h-full backface-hidden"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <div className="w-full h-full bg-slate-100 rounded-xl shadow-lg p-8 flex flex-col items-center justify-center">
              <h2 className="text-3xl font-bold mb-6 text-slate-800">{currentWord.turkish}</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full gap-2 mt-4">
        <button
          onClick={() => handleWordAction('learned')}
          disabled={isLeaving || isAnimating}
          className={`flex-1 py-3 text-white rounded-lg transition-colors font-medium ${
            isLeaving || isAnimating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          Öğrendim
        </button>
        <button
          onClick={() => handleWordAction('keep')}
          disabled={isLeaving || isAnimating}
          className={`flex-1 py-3 text-white rounded-lg transition-colors font-medium ${
            isLeaving || isAnimating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          Listede Tut
        </button>
      </div>
    </div>
  );
} 