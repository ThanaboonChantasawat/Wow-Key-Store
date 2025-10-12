import { Button } from "@/components/ui/button"
import Image from "next/image"

const myGame = [
  {
    id: 1,
    game: "Genshin Impact",
    image: "/fantasy-open-world-game.png",
    date: "22/01/2025",
    time: "20:00",
    server: "",
    orderId: "#0110125489",
  },
  {
    id: 2,
    game: "Final Fantasy VII",
    image: "/final-fantasy-7-game.jpg",
    date: "22/01/2025",
    time: "20:00",
    server: "",
    orderId: "#0110125489",
  },
]

export function MyGameContent() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h2 className="text-2xl font-semibold text-[#292d32] mb-6">ไอดีเกมของฉัน</h2>

        <div className="space-y-4">
          {myGame.map((myGame) => (
            <div key={myGame.id} className="bg-white border border-[#d9d9d9] rounded-lg p-6 flex items-center gap-6">
              <Image
                src={myGame.image || "/placeholder.svg"}
                alt={myGame.game}
                width={180}
                height={120}
                className="rounded-lg object-cover"
              />
              <div className="flex-1 space-y-2">
                <h3 className="text-xl font-semibold text-[#292d32]">{myGame.game}</h3>
                <p className="text-[#292d32]">
                  วันที่สั่งสินค้า : {myGame.date} {myGame.time}
                </p>
                <p className="text-[#292d32]">ช่าระเงิน : {myGame.server}</p>
                <p className="text-[#292d32]">
                  เลขที่คำสั่งซื้อ : <span className="font-medium">{myGame.orderId}</span>
                </p>
              </div>
              <Button
                variant="outline"
                className="border-[#ff9800] text-[#ff9800] hover:bg-[#fff3e0] px-6 py-2 rounded-full bg-transparent"
              >
                แสดงรหัส +
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
