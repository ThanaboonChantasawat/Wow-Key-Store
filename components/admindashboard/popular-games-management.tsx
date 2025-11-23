import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Plus, Trash2, Star, Gamepad2, X, GripVertical } from 'lucide-react'
import Image from 'next/image'
import { useToast } from '@/hooks/use-toast'
import { getAllGames, updateGame, type Game } from '@/lib/game-service'
import { useAuth } from '@/components/auth-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

export function PopularGamesManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [games, setGames] = useState<Game[]>([])
  const [popularGames, setPopularGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    try {
      setIsLoading(true)
      const allGames = await getAllGames()
      setGames(allGames)
      
      // Filter and sort popular games
      const popular = allGames
        .filter(g => g.isPopular)
        .sort((a, b) => (a.popularOrder || 999) - (b.popularOrder || 999))
      
      setPopularGames(popular)
    } catch (error) {
      console.error('Error fetching games:', error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลเกมได้",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTogglePopular = async (game: Game, isPopular: boolean) => {
    try {
      if (isPopular) {
        // Check limit
        if (popularGames.length >= 6) {
          toast({
            title: "ถึงขีดจำกัด",
            description: "สามารถเพิ่มเกมยอดนิยมได้สูงสุด 6 เกมเท่านั้น",
            variant: "destructive",
          })
          return
        }

        // Add to end of list
        const newOrder = popularGames.length + 1
        const updatedGame = { ...game, isPopular, popularOrder: newOrder }
        setPopularGames(prev => [...prev, updatedGame])
        
        // Update in background
        await updateGame(game.id, { isPopular, popularOrder: newOrder })
      } else {
        setPopularGames(prev => prev.filter(g => g.id !== game.id))
        // Update in background
        await updateGame(game.id, { isPopular })
      }
      
      // Refresh full list to ensure consistency
      const allGames = await getAllGames()
      setGames(allGames)
      
      toast({
        title: isPopular ? "เพิ่มเกมยอดนิยมแล้ว" : "ลบเกมยอดนิยมแล้ว",
        description: `เกม ${game.name} ถูก${isPopular ? 'เพิ่มใน' : 'ลบออกจาก'}รายการแนะนำแล้ว`,
      })
    } catch (error) {
      console.error('Error updating game:', error)
      // Revert on error
      fetchGames()
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสถานะเกมได้",
        variant: "destructive",
      })
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newGames = [...popularGames]
    const draggedGame = newGames[draggedIndex]
    newGames.splice(draggedIndex, 1)
    newGames.splice(index, 0, draggedGame)

    setPopularGames(newGames)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return

    try {
      const token = await user?.getIdToken()
      const gameIds = popularGames.map(g => g.id)

      const response = await fetch('/api/games/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gameIds }),
      })

      if (response.ok) {
        toast({
          title: "✅ จัดเรียงสำเร็จ",
          description: "จัดเรียงเกมยอดนิยมเรียบร้อยแล้ว",
        })
      } else {
        const data = await response.json()
        toast({
          title: "เกิดข้อผิดพลาด",
          description: data.error,
          variant: "destructive",
        })
        fetchGames() // Revert on error
      }
    } catch (error) {
      console.error('Error reordering games:', error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถจัดเรียงเกมได้",
        variant: "destructive",
      })
      fetchGames() // Revert on error
    } finally {
      setDraggedIndex(null)
    }
  }

  const filteredGames = games.filter(game => 
    !game.isPopular && 
    game.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            จัดการเกมยอดนิยม
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            จัดการรายการเกมที่จะแสดงในส่วน "เกมยอดนิยม" บนหน้าแรก
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
            <span className="text-sm text-gray-500">จำนวนเกม:</span>
            <Badge variant="secondary" className="font-mono">
              {popularGames.length}/6
            </Badge>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-[#ff9800] to-[#f57c00] hover:from-[#e08800] hover:to-[#d56600] text-white shadow-md transition-all hover:scale-105"
                disabled={popularGames.length >= 6}
              >
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มเกมยอดนิยม
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>เลือกเกมที่ต้องการแนะนำ</DialogTitle>
                <DialogDescription>
                  ค้นหาและเลือกเกมที่ต้องการให้แสดงในส่วนเกมยอดนิยม
                </DialogDescription>
              </DialogHeader>
              
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="ค้นหาชื่อเกม..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-[300px] mt-4 pr-4">
                <div className="space-y-2">
                  {filteredGames.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {searchQuery ? "ไม่พบเกมที่ค้นหา" : "ไม่มีเกมที่สามารถเพิ่มได้"}
                    </div>
                  ) : (
                    filteredGames.map((game) => (
                      <div
                        key={game.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-md overflow-hidden bg-gray-100">
                            {game.imageUrl ? (
                              <Image
                                src={game.imageUrl}
                                alt={game.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <Gamepad2 className="w-5 h-5 m-auto text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-900">{game.name}</p>
                            <Badge variant={game.status === 'active' ? 'default' : 'secondary'} className="text-[10px] h-5">
                              {game.status === 'active' ? 'เปิดขาย' : 'ปิดปรับปรุง'}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleTogglePopular(game, true)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Popular Games List (Draggable) */}
      <div className="space-y-3">
        {isLoading ? (
          // Loading Skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))
        ) : popularGames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            <Star className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-lg font-medium">ยังไม่มีเกมยอดนิยม</p>
            <p className="text-sm">กดปุ่ม "เพิ่มเกมยอดนิยม" เพื่อเริ่มจัดการ</p>
          </div>
        ) : (
          popularGames.map((game, index) => (
            <div
              key={game.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`group relative bg-white rounded-xl border transition-all duration-200 ${
                draggedIndex === index ? 'opacity-50 scale-[0.98]' : 'opacity-100 hover:shadow-md hover:border-orange-200'
              }`}
            >
              <div className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* Drag Handle & Order */}
                <div className="flex items-center gap-3 sm:flex-col sm:gap-1 text-gray-400 cursor-move hover:text-gray-600">
                  <GripVertical className="w-5 h-5" />
                  <span className="text-xs font-mono font-medium">#{index + 1}</span>
                </div>

                {/* Image Preview */}
                <div className="relative w-full sm:w-32 aspect-video rounded-lg overflow-hidden bg-gray-100 border shadow-sm group-hover:shadow-md transition-shadow">
                  {game.imageUrl ? (
                    <Image
                      src={game.imageUrl}
                      alt={game.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                      <Gamepad2 className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 text-lg">{game.name}</h4>
                    <Badge variant={game.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {game.status === 'active' ? 'พร้อมขาย' : 'ไม่พร้อมขาย'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-1">
                    {game.description || "ไม่มีรายละเอียด"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTogglePopular(game, false)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    ลบออกจากรายการ
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Star className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-blue-900 mb-1">คำแนะนำการใช้งาน</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside opacity-80">
            <li>ลากและวางที่แถบด้านซ้ายเพื่อเรียงลำดับเกมที่จะแสดงในหน้าแรก</li>
            <li>เกมจะแสดงตามลำดับที่กำหนดจากบนลงล่าง</li>
            <li>สามารถเพิ่มเกมได้สูงสุด 6 เกม</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

