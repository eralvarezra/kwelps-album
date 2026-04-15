import { getAllUsersWithWallets } from '@/lib/actions/wallet'
import { getAdminUsers } from '@/lib/actions/admin-users'
import { UserList } from './user-list'

export default async function AdminUsersPage() {
  const [users, authUsers] = await Promise.all([
    getAllUsersWithWallets(),
    getAdminUsers(),
  ])

  // Merge email confirmation status
  const authUserMap = new Map(authUsers.map(u => [u.id, u]))
  const usersWithConfirmation = users.map(user => ({
    ...user,
    emailConfirmed: authUserMap.get(user.id)?.emailConfirmed ?? true,
  }))

  return (
    <div className="space-y-4 lg:space-y-6">
      <h1 className="text-xl lg:text-2xl font-bold text-white">Users & Wallets</h1>
      <UserList users={usersWithConfirmation} />
    </div>
  )
}