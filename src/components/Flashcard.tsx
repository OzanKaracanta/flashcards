'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cleanup function for speech synthesis
  const cleanupSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    setIsSpeechSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
    
    // Cleanup on unmount
    return () => {
      cleanupSpeech();
    };
  }, [cleanupSpeech]);

  useEffect(() => {
    if (!isLeaving) {
      setCurrentWord(word);
      setIsFlipped(false);
      setError(null);
      cleanupSpeech();
    }
  }, [word, isLeaving, cleanupSpeech]);

  const handleFlip = useCallback(() => {
    if (!isLeaving && !isProcessing) {
      setIsFlipped(!isFlipped);
    }
  }, [isLeaving, isProcessing, isFlipped]);

  const speak = useCallback((text: string) => {
    if (!isSpeechSupported) return;

    cleanupSpeech();
    
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => {
        setIsSpeaking(false);
        console.error('Speech synthesis error');
      };
      
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Error in speech synthesis:', error);
      setIsSpeaking(false);
    }
  }, [isSpeechSupported, cleanupSpeech]);

  const handleWordAction = useCallback(async (action: 'learned' | 'keep') => {
    if (isLeaving || isAnimating || isProcessing) return;

    try {
      setIsProcessing(true);
      setError(null);
      cleanupSpeech();

      // If card is flipped, flip it back first
      if (isFlipped) {
        setIsFlipped(false);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setIsLeaving(true);
      
      if (action === 'learned' && userId) {
        try {
          const wordRef = doc(db, 'users', userId, 'learnedWords', word.english);
          await setDoc(wordRef, {
            word: word.english,
            translation: word.turkish,
            learnedAt: new Date().toISOString(),
          });
          onLearned();
        } catch (error) {
          console.error('Error saving learned word:', error);
          setError('Kelime kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
          setIsLeaving(false);
          setIsProcessing(false);
          return;
        }
      } else if (action === 'keep') {
        onLearned();
      }

      // Start exit animation
      setTimeout(() => {
        if (onAnimationComplete) {
          onAnimationComplete();
        }
        setIsLeaving(false);
        setIsProcessing(false);
      }, 300);
    } catch (error) {
      console.error('Error in handleWordAction:', error);
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      setIsLeaving(false);
      setIsProcessing(false);
    }
  }, [isLeaving, isAnimating, isProcessing, isFlipped, userId, word, onLearned, onAnimationComplete, cleanupSpeech]);

  return (
    <div className="w-full max-w-md mx-auto">
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
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
          disabled={isLeaving || isAnimating || isProcessing}
          className={`flex-1 py-3 text-white rounded-lg transition-colors font-medium ${
            isLeaving || isAnimating || isProcessing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              İşleniyor...
            </span>
          ) : (
            'Öğrendim'
          )}
        </button>
        <button
          onClick={() => handleWordAction('keep')}
          disabled={isLeaving || isAnimating || isProcessing}
          className={`flex-1 py-3 text-white rounded-lg transition-colors font-medium ${
            isLeaving || isAnimating || isProcessing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              İşleniyor...
            </span>
          ) : (
            'Listede Tut'
          )}
        </button>
      </div>
    </div>
  );
} 