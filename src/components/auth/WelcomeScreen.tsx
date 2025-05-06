'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function WelcomeScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, setIsGuest } = useAuth();
  const router = useRouter();

  const handleGuestContinue = () => {
    setIsGuest(true);
    router.push('/app');
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      await signInWithGoogle();
      router.push('/app');
    } catch (error) {
      console.error('Google sign in failed:', error);
      setError('Google ile giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Password validation
    if (!isLogin && password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        try {
          await signUpWithEmail(email, password);
        } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
            setError('Bu email adresi zaten kayıtlı. Giriş sayfasına yönlendiriliyorsunuz...');
            // Wait a moment before switching to login mode
            setTimeout(() => {
              setIsLogin(true);
              setError('Lütfen şifrenizi girerek giriş yapın.');
            }, 2000);
            return;
          }
          throw error; // Re-throw other errors to be caught by the outer catch
        }
      }
      router.push('/app');
    } catch (error: any) {
      console.error('Email authentication failed:', error);
      switch (error.code) {
        case 'auth/weak-password':
          setError('Şifre en az 6 karakter olmalıdır.');
          break;
        case 'auth/email-already-in-use':
          setError('Bu email adresi zaten kullanımda. Lütfen giriş yapın.');
          setIsLogin(true);
          break;
        case 'auth/invalid-email':
          setError('Geçersiz email adresi.');
          break;
        case 'auth/user-not-found':
          setError('Bu email adresi ile kayıtlı kullanıcı bulunamadı. Lütfen önce kayıt olun.');
          setIsLogin(false);
          break;
        case 'auth/wrong-password':
          setError('Hatalı şifre. Lütfen tekrar deneyin.');
          break;
        case 'auth/too-many-requests':
          setError('Çok fazla başarısız giriş denemesi. Lütfen bir süre bekleyin.');
          break;
        case 'auth/network-request-failed':
          setError('İnternet bağlantınızı kontrol edin.');
          break;
        default:
          setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Flashcards
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? 'Hesabınıza giriş yapın' : 'Yeni hesap oluşturun'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="mt-8 space-y-6">
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Google ile giriş yap
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">veya</span>
            </div>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleEmailAuth}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email adresi"
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Şifre"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isLogin ? 'Giriş yap' : 'Kayıt ol'}
              </button>
            </div>

            <div className="flex flex-col space-y-3">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                {isLogin ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var mı? Giriş yapın'}
              </button>
              <button
                type="button"
                onClick={handleGuestContinue}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Misafir olarak devam et
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 