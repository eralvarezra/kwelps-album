import { AdminNav } from '@/components/admin/admin-nav'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-[#0F172A]">
      <AdminNav />
      <main className="flex-1 p-4 lg:p-6 overflow-auto pt-20 lg:pt-6">
        {children}
      </main>
    </div>
  )
}