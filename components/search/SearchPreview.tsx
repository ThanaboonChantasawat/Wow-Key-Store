"use client";

import Link from 'next/link';
import GameCard from '@/components/card/GameCard';
import { useSearchGames } from '@/hooks/useFirestore';

interface SearchPreviewProps {
  query: string;
}

export default function SearchPreview({ query }: SearchPreviewProps) {
  const { games, loading, error } = useSearchGames(query);

  if (!query || query.trim() === '') return null;

  return (
    <section className="py-6">
      <div className="max-w-7xl mx-auto px-6">
        <h3 className="text-xl font-semibold mb-4">ผลการค้นหา: “{query}”</h3>
        <div className="bg-white rounded-lg p-4">
          <GameCard games={games} loading={loading} error={error} limit={4} />
          <div className="text-right mt-4">
            <Link
              href={`/products?q=${encodeURIComponent(query)}`}
              className="inline-block bg-[#ff9800] hover:bg-[#e08800] text-white px-4 py-2 rounded"
            >
              ดูสินค้าทั้งหมด
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
