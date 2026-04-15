import { getStoreInfo } from '@/lib/actions/store'
import { StoreClient } from './store-client'

export default async function StorePage() {
  const storeInfo = await getStoreInfo()

  return <StoreClient initialData={storeInfo} />
}