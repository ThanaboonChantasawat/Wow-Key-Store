"use client"

const navItems = [
  { id: "account", label: "บัญชีของฉัน" },
  { id: "myGame", label: "ไอดีเกมของฉัน" },
  { id: "update-order", label: "อัพเดทคำสั่งซื้อ" },
  { id: "wishlist", label: "รายการที่อยากได้" },
  { id: "help", label: "ช่วยเหลือ" },
]

interface SidebarNavProps {
  activeItem: string
  onItemChange: (itemId: string) => void
}

export function SidebarNav({ activeItem, onItemChange }: SidebarNavProps) {
  return (
    <aside className="w-full">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-[#292d32] mb-4">ถึงคำบัญชีผู้ใช้</h2>
        <nav>
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onItemChange(item.id)}
                  className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                    activeItem === item.id
                      ? "bg-[#fff3e0] text-[#ff9800] font-medium"
                      : "text-[#292d32] hover:bg-[#f2f2f4]"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  )
}
