"use client";

interface RankingItem {
  rank: number;
  address: string;
  score?: number;
  isEncrypted: boolean;
}

interface RankingListProps {
  rankings: RankingItem[];
  onDecrypt?: (address: string) => void;
}

export function RankingList({ rankings, onDecrypt }: RankingListProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-4 font-semibold">Rank</th>
            <th className="text-left p-4 font-semibold">Address</th>
            <th className="text-right p-4 font-semibold">Score</th>
            <th className="text-center p-4 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((item) => (
            <tr key={item.address} className="border-b hover:bg-neutral-50 dark:hover:bg-neutral-800">
              <td className="p-4 font-medium">#{item.rank}</td>
              <td className="p-4 font-mono text-sm">{item.address}</td>
              <td className="p-4 text-right">
                {item.isEncrypted ? (
                  <span className="text-neutral-400">Encrypted</span>
                ) : (
                  <span className="font-semibold">
                    {item.score?.toFixed(2) || "--"}
                  </span>
                )}
              </td>
              <td className="p-4 text-center">
                {item.isEncrypted && onDecrypt && (
                  <button
                    onClick={() => onDecrypt(item.address)}
                    className="px-3 py-1 text-sm bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
                  >
                    Decrypt
                  </button>
                )}
                {!item.isEncrypted && (
                  <span className="text-green-600 dark:text-green-400 text-sm">
                    ✓ Decrypted
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



