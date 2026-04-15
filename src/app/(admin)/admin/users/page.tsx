import { getAllUsersWithWallets } from '@/lib/actions/wallet'
import { UserList } from './user-list'

export default async function AdminUsersPage() {
  const users = await getAllUsersWithWallets()

  return (
    <div className="space-y-4 lg:space-y-6">
      <h1 className="text-xl lg:text-2xl font-bold text-white">Users & Wallets</h1>
      <UserList users={users} />
    </div>
  )
}