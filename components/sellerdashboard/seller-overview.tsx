export function SellerOverview() {
  const stats = [
    { label: "คะแนนผู้ขาย", value: "0" },
    { label: "รายการสินค้าทั้งหมด", value: "0" },
    { label: "รอดำเนินการ", value: "0" },
    { label: "การคลิกสินค้า", value: "0" },
  ]

  return (
    <div className="bg-white rounded-lg p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-[#292d32] mb-6">แดชบอร์ดผู้ขาย</h2>
      <div className="bg-white rounded-lg p-6 border border-[#d9d9d9]">
        <h3 className="text-lg font-semibold text-[#292d32] mb-6">ภาพรวม</h3>
        <div className="grid grid-cols-2 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="border border-[#d9d9d9] rounded-lg p-6">
              <div className="text-4xl font-bold text-[#ff9800] mb-2">{stat.value}</div>
              <div className="text-sm text-[#292d32]">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
