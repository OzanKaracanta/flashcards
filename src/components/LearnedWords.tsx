interface LearnedWordsProps {
  words: Array<{
    english: string;
    turkish: string;
    learnedAt: string;
  }>;
  onUnlearn: (word: string) => void;
}

export default function LearnedWords({ words, onUnlearn }: LearnedWordsProps) {
  if (words.length === 0) return null;

  // Only show the last 5 words
  const recentWords = words.slice(0, 5);

  return (
    <div className="w-full mt-8">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Son Öğrendiklerim:</h3>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {recentWords.map((word, index) => (
          <div 
            key={word.english}
            className={`
              flex items-center justify-between p-4
              ${index !== recentWords.length - 1 ? 'border-b border-gray-100' : ''}
            `}
          >
            <div className="flex gap-8">
              <span className="font-medium">{word.english}</span>
              <span className="text-gray-500">{word.turkish}</span>
            </div>
            <button
              onClick={() => onUnlearn(word.english)}
              className="text-red-500 hover:text-red-600 text-sm font-medium transition-colors"
            >
              Geri Al
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 