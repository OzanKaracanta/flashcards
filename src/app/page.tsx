'use client';

import { useState, useEffect, useRef } from 'react';
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

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle, logout, isGuest, setIsGuest } = useAuth();
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

  // Load reCAPTCHA v3 script
  useEffect(() => {
    const loadRecaptcha = () => {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=6LfWeB4rAAAAALm2zePDQI-0xVFdfo2ctJzRY1iH`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };
    loadRecaptcha();
  }, []);

  const executeRecaptcha = async () => {
    try {
      // @ts-ignore - window.grecaptcha is added by the script
      const token = await window.grecaptcha.execute('6LfWeB4rAAAAALm2zePDQI-0xVFdfo2ctJzRY1iH', {action: 'submit'});
      return token;
    } catch (error) {
      console.error('reCAPTCHA error:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);

    try {
      const recaptchaToken = await executeRecaptcha();
      
      if (!recaptchaToken) {
        setAuthError('Güvenlik doğrulaması başarısız oldu. Lütfen tekrar deneyin.');
        return;
      }

      if (!isLogin) {
        // Registration validation
        if (password.length < 6) {
          setAuthError('Şifre en az 6 karakter olmalıdır.');
          return;
        }
        if (!email.includes('@')) {
          setAuthError('Geçerli bir e-posta adresi giriniz.');
          return;
        }
        await signUpWithEmail(email, password);
      } else {
        // Login validation
        if (!email || !password) {
          setAuthError('Lütfen e-posta ve şifrenizi giriniz.');
          return;
        }
        await signInWithEmail(email, password);
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          setAuthError('Bu e-posta adresi zaten kullanımda.');
          break;
        case 'auth/invalid-email':
          setAuthError('Geçersiz e-posta adresi.');
          break;
        case 'auth/operation-not-allowed':
          setAuthError('Bu işlem şu anda kullanılamıyor.');
          break;
        case 'auth/weak-password':
          setAuthError('Şifre çok zayıf. Lütfen daha güçlü bir şifre seçin.');
          break;
        case 'auth/user-disabled':
          setAuthError('Bu hesap devre dışı bırakılmış.');
          break;
        case 'auth/user-not-found':
          setAuthError('Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.');
          break;
        case 'auth/wrong-password':
          setAuthError('Hatalı şifre.');
          break;
        case 'auth/too-many-requests':
          setAuthError('Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.');
          break;
        default:
          setAuthError('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const loadUserProgress = async () => {
      console.log('Starting loadUserProgress:', { userId: user?.uid, isGuest: !user });
      setIsLoading(true);
      try {
        if (!user) {
          const savedProgress = localStorage.getItem('userProgress');
          console.log('Loading guest progress from localStorage:', savedProgress);
          if (savedProgress) {
            const progress: UserProgress = JSON.parse(savedProgress);
            const loadedLearnedWords = new Set(progress.learnedWords || []);
            
            // Find the first unlearned word in the current group
            const groupWords = wordsWithGroups.filter(w => w.group === (progress.activeGroup || 1));
            const firstUnlearnedIndex = groupWords.findIndex(word => !loadedLearnedWords.has(word.english));
            
            setActiveGroup(progress.activeGroup || 1);
            setLearnedWords(loadedLearnedWords);
            setRecentlyLearned(progress.recentlyLearned || []);
            setCurrentWordIndex(firstUnlearnedIndex >= 0 ? firstUnlearnedIndex : 0);
            
            console.log('Successfully loaded guest progress with word index:', firstUnlearnedIndex);
          }
        } else if (user) {
          const userDoc = doc(db, 'users', user.uid);
          console.log('Fetching user document:', user.uid);
          const docSnap = await getDoc(userDoc);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('Loaded user data:', data);
            
            // Ensure we have valid arrays
            const learnedWords = Array.isArray(data.learnedWords) ? data.learnedWords : [];
            const recentlyLearned = Array.isArray(data.recentlyLearned) ? data.recentlyLearned : [];
            const loadedLearnedWords = new Set(learnedWords.map(word => String(word)));
            
            // Find the first unlearned word in the current group
            const currentGroup = data.activeGroup || 1;
            const groupWords = wordsWithGroups.filter(w => w.group === currentGroup);
            const firstUnlearnedIndex = groupWords.findIndex(word => !loadedLearnedWords.has(word.english));
            
            console.log('Finding first unlearned word:', {
              currentGroup,
              groupWordsCount: groupWords.length,
              learnedWordsCount: loadedLearnedWords.size,
              firstUnlearnedIndex
            });
            
            setActiveGroup(currentGroup);
            setLearnedWords(loadedLearnedWords);
            setRecentlyLearned(recentlyLearned.map(item => ({
              english: String(item.english),
              turkish: String(item.turkish),
              learnedAt: String(item.learnedAt)
            })));
            setCurrentWordIndex(firstUnlearnedIndex >= 0 ? firstUnlearnedIndex : 0);
            
            console.log('State updated with:', {
              activeGroup: currentGroup,
              learnedWordsCount: learnedWords.length,
              recentlyLearnedCount: recentlyLearned.length,
              currentWordIndex: firstUnlearnedIndex >= 0 ? firstUnlearnedIndex : 0
            });
          } else {
            console.log('No existing user document found, creating new one');
            const defaultProgress = {
              activeGroup: 1,
              learnedWords: [],
              recentlyLearned: []
            };
            await setDoc(userDoc, {
              ...defaultProgress,
              email: user.email,
              createdAt: new Date().toISOString()
            });
            setActiveGroup(1);
            setLearnedWords(new Set());
            setRecentlyLearned([]);
            setCurrentWordIndex(0);
          }
        }
      } catch (err) {
        console.error('Error in loadUserProgress:', err);
        setError('Kullanıcı verisi yüklenirken bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    if (user || !user) {
      loadUserProgress();
    }
  }, [user]);

  const saveUserProgress = async (newLearnedWords: Set<string>, newActiveGroup: number, newWord?: string) => {
    if (!user) {
      console.warn('saveUserProgress called without user');
      return;
    }

    // Convert Set to Array and ensure it's a plain array of strings
    const learnedWordsArray = Array.from(newLearnedWords).map(word => String(word));

    const progress: UserProgress = {
      activeGroup: newActiveGroup,
      learnedWords: learnedWordsArray,
      recentlyLearned: recentlyLearned.map(item => ({
        english: String(item.english),
        turkish: String(item.turkish),
        learnedAt: String(item.learnedAt)
      }))
    };

    try {
      // Save to main user document
      const userDoc = doc(db, 'users', user.uid);
      const docData = {
        ...progress,
        email: user.email,
        updatedAt: new Date().toISOString(),
        learnedWords: learnedWordsArray,
        recentlyLearned: progress.recentlyLearned
      };
      await setDoc(userDoc, docData);
      console.log('Successfully saved main user document with data:', docData);

      // Sadece yeni öğrenilen kelimeyi yaz
      if (newWord) {
        const wordData = wordsWithGroups.find(w => w.english === newWord);
        if (wordData) {
          const wordDoc = doc(db, 'users', user.uid, 'learnedWords', newWord);
          await setDoc(wordDoc, {
            word: String(wordData.english),
            translation: String(wordData.turkish),
            learnedAt: new Date().toISOString(),
            group: Number(wordData.group)
          });
          console.log(`Successfully saved individual word: ${newWord}`);
        }
      }
    } catch (error) {
      console.error('Error in saveUserProgress:', error);
      throw error;
    }
  };

  // Filter words for current group
  const currentGroupWords = wordsWithGroups.filter(word => word.group === activeGroup);

  useEffect(() => {
    console.log('AppPage - Auth state:', { user, isGuest: !user });
  }, [user]);

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

        if (!user) {
          localStorage.setItem('userProgress', JSON.stringify(progress));
        } else {
          saveUserProgress(newSet, activeGroup, word); // sadece yeni kelimeyi yaz
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

      if (!user) {
        localStorage.setItem('userProgress', JSON.stringify(progress));
      } else {
        try {
          // Update main user document
          await setDoc(doc(db, 'users', user.uid), progress);
          // Delete from learnedWords collection
          await deleteDoc(doc(db, 'users', user.uid, 'learnedWords', word));
        } catch (error) {
          console.error('Error updating Firebase:', error);
          setError('Failed to unlearn word');
        }
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
  
  if (user || isGuest) {
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
          <div className="absolute bottom-4 left-4">
            <LogoutButton />
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Kelime Kartları</h1>
        <p className="text-gray-600 max-w-2xl mx-auto px-4 mb-1">
          Oxford 5000 listesindeki en önemli İngilizce kelimeleri, kolay anlaşılır kartlarla öğrenin.
        </p>
        <p className="text-gray-600 max-w-2xl mx-auto px-4 mb-1">
          Her kartta önce İngilizce kelimeyle karşılaşır, ardından Türkçe anlamını keşfedersiniz.
        </p>
        <p className="text-gray-600 max-w-2xl mx-auto px-4 mb-8">
          Öğrendiğiniz kelimeleri işaretleyerek bir sonraki aşamaya geçmeye hazırlanırsınız.
        </p>
        <p className="text-gray-600 max-w-2xl mx-auto px-4 font-medium">
          Sade, etkili ve kendi hızınızda bir öğrenme deneyimi sizi bekliyor.
        </p>
      </div>
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isLogin ? 'Giriş Yap' : 'Hesap Oluştur'}
        </h1>
        {authError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {authError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              E-posta
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setAuthError(null);
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Şifre
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setAuthError(null);
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              disabled={isSubmitting}
            />
          </div>
          <button
            type="submit"
            className={`w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isLogin ? 'Giriş Yapılıyor...' : 'Kayıt Yapılıyor...'}
              </span>
            ) : (
              isLogin ? 'Giriş Yap' : 'Kayıt Ol'
            )}
          </button>
        </form>
        <button
          onClick={() => signInWithGoogle()}
          className="w-full mt-4 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition-colors flex items-center justify-center"
          disabled={isSubmitting}
        >
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google"
            className="w-4 h-4 mr-2"
          />
          Google ile Devam Et
        </button>
        <button
          onClick={() => setIsGuest(true)}
          className="w-full mt-4 bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition-colors"
          disabled={isSubmitting}
        >
          Ziyaretçi olarak devam et
        </button>
        <p className="mt-4 text-center text-sm text-gray-600">
          {isLogin ? "Hesabınız yok mu?" : 'Zaten hesabınız var mı?'}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setAuthError(null);
            }}
            className="ml-1 text-blue-500 hover:text-blue-600"
            disabled={isSubmitting}
          >
            {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
          </button>
        </p>
      </div>
    </div>
  );
} 