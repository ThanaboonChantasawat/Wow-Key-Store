"use client"

import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SellerEditAccount() {
  const bankAccounts = [
    {
      id: 1,
      bank: "กสิกรไทย",
      accountName: "นายธนบูลย์ จันทสวัสดิ์",
      accountNumber: "xxx-x-x1234-x",
    },
    {
      id: 2,
      bank: "ไทยพาณิชย์",
      accountName: "นายธนบูลย์ จันทสวัสดิ์",
      accountNumber: "xxx-x-x1234-x",
    },
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-[#d9d9d9] flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#292d32]">การเงิน</h2>
        <Button className="bg-[#ff9800] hover:bg-[#ff9800]/90 text-white">+ เพิ่มบัญชีธนาคาร</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#ff9800] text-white">
              <th className="px-6 py-4 text-left font-semibold">บัญชีธนาคาร</th>
              <th className="px-6 py-4 text-center font-semibold">ชื่อบัญชี</th>
              <th className="px-6 py-4 text-center font-semibold">เลขบัญชี</th>
              <th className="px-6 py-4 text-center font-semibold">Edit/Delete</th>
            </tr>
          </thead>
          <tbody>
            {bankAccounts.map((account) => (
              <tr key={account.id} className="border-b border-[#d9d9d9] hover:bg-[#f9fafb]">
                <td className="px-6 py-4 font-medium text-[#292d32]">{account.bank}</td>
                <td className="px-6 py-4 text-center text-[#292d32]">{account.accountName}</td>
                <td className="px-6 py-4 text-center text-[#292d32]">{account.accountNumber}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button className="p-2 hover:bg-[#f9fafb] rounded">
                      <Pencil className="h-4 w-4 text-[#999999]" />
                    </button>
                    <button className="p-2 hover:bg-[#f9fafb] rounded">
                      <Trash2 className="h-4 w-4 text-[#999999]" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
