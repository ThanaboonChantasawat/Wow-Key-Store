import ProductCard from "@/components/card/ProductCard";
// import ShopInformation from "@/components/product/ShopInformation";
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

const ProductDetailPage = async({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  
  // ดึงข้อมูลเกมตาม id
  const game = await getGameById(id);
  
  // ถ้าไม่มีเกมนี้ให้แสดงหน้า 404
  if (!game) {
    notFound();
  }
  
  return (
    <div className="bg-[#f2f2f4]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <ProductCard 
          game={game}
        />
        {/* TODO: Add ShopInformation when products have shop relationships */}
        {/* <ShopInformation shopId={game.shopId} /> */}
      </main>
    </div>
  );
};

export default ProductDetailPage;
