import ProductCard from "@/components/card/ProductCard";
import ShopInformation from "@/components/product/ShopInformation";
import { getGameById, getGames } from "@/lib/firestore-service";
import { notFound } from "next/navigation";

// Generate static params for static export
export async function generateStaticParams() {
  try {
    const games = await getGames();
    return games.map((game) => ({
      id: game.id,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

const ProductDetailPage = async({ params }: { params: { id: string } }) => {
  const { id } = await params;
  
  // ดึงข้อมูลเกมตาม id
  const game = await getGameById(id);
  
  // ถ้าไม่มีเกมนี้ให้แสดงหน้า 404
  if (!game) {
    notFound();
  }
  
  return (
    <div className="min-h-screen bg-[#f2f2f4]">
      <main className="max-w-10/12 mx-auto px-4 py-6">
        <ProductCard 
          game={game}
        />
        <ShopInformation/>
      </main>
    </div>
  );
};

export default ProductDetailPage;
