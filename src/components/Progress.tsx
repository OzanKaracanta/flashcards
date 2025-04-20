interface ProgressProps {
  currentGroup: number;
  totalGroups: number;
  learnedCount: number;
  totalCount: number;
}

export default function Progress({ 
  currentGroup, 
  totalGroups, 
  learnedCount, 
  totalCount 
}: ProgressProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <span>Grup {currentGroup} / {totalGroups}</span>
        <span>İlerleme: {learnedCount} / {totalCount}</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${(learnedCount / totalCount) * 100}%` }}
        />
      </div>
    </div>
  );
} 