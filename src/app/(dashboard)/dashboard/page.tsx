import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { WelcomeBonusModal } from '@/components/ui/welcome-bonus-modal'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Ensure user exists in our database
  await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email! },
    update: { email: user.email! },
  })

  // Ensure wallet exists
  await prisma.wallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, balance: 0, adminBalance: 0, bonusClaimed: false },
    update: {},
  })

  // Ensure pity counter exists
  await prisma.pityCounter.upsert({
    where: { userId: user.id },
    create: { userId: user.id, legendaryCounter: 0 },
    update: {},
  })

  // Get real data
  const [wallet, photoCount, activeCollections] = await Promise.all([
    prisma.wallet.findUnique({
      where: { userId: user.id },
    }),
    prisma.userPhoto.count({
      where: { userId: user.id },
    }),
    prisma.collection.findMany({
      where: { active: true },
      include: {
        photos: {
          where: { rarity: 'COMMON' },
          select: { id: true, url: true, thumbnailUrl: true },
        },
      },
    }),
  ])

  const balance = wallet?.balance ? Number(wallet.balance) : 0
  const uniquePhotos = photoCount

  // Get one random common photo per collection
  const collectionsWithPhotos = activeCollections
    .filter(collection => collection.photos.length > 0)
    .map(collection => {
      const randomIndex = Math.floor(Math.random() * collection.photos.length)
      const randomPhoto = collection.photos[randomIndex]
      return {
        id: collection.id,
        name: collection.name,
        prize: collection.prize,
        photo: randomPhoto,
      }
    })

  return (
    <>
      <WelcomeBonusModal show={wallet?.bonusClaimed === false} />
      <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/wallet" className="block">
          <div className="glass p-6 rounded-xl hover:bg-white/10 transition-colors border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Tu Balance</h2>
            </div>
            <p className="text-4xl font-bold text-yellow-400">${balance.toFixed(2)}</p>
            <p className="text-sm text-gray-400 mt-1">Moneda virtual</p>
          </div>
        </Link>

        <Link href="/album" className="block">
          <div className="glass p-6 rounded-xl hover:bg-white/10 transition-colors border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Fotos Recolectadas</h2>
            </div>
            <p className="text-4xl font-bold text-purple-400">{uniquePhotos}</p>
            <p className="text-sm text-gray-400 mt-1">Fotos únicas</p>
          </div>
        </Link>

        <div className="glass p-6 rounded-xl border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">Premios</h2>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">
            Completa las colecciones y recibe premios!
          </p>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            Si completas una colección, ponte en contacto con Kwelps por Telegram enviando una captura de pantalla con la colección completa.
          </p>
          <a
            href="https://t.me/kwelps"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl text-white font-medium hover:from-blue-600 hover:to-cyan-600 transition-colors"
          >
            {/* Telegram Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            <span>Ir a Telegram</span>
            <svg className="w-4 h-4 ml-auto opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* Active Collections Section */}
      {collectionsWithPhotos.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-white mb-4">Colecciones Disponibles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collectionsWithPhotos.map(collection => (
              <Link
                key={collection.id}
                href={`/store?collection=${collection.id}`}
                className="block"
              >
                <div className="relative h-48 rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition-colors">
                  {/* Background photo */}
                  <img
                    src={collection.photo?.thumbnailUrl || collection.photo?.url || ''}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  {/* Content */}
                  <div className="absolute inset-0 p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">{collection.name}</h3>
                      <p className="text-sm text-yellow-400 mt-1">Premio: {collection.prize}</p>
                    </div>
                    <div className="flex justify-end">
                      <span className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
                        Ir a Tienda
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="glass rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-bold text-white mb-4">¿Qué es Kwelps Album?</h2>
          <div className="space-y-4 text-gray-300">
            <p>
              Kwelps Album es un álbum de fotos coleccionables donde puedes coleccionar imágenes de diferentes rarezas: <span className="text-gray-400">Común</span>, <span className="text-blue-400">Raro</span>, <span className="text-purple-400">Épico</span> y <span className="text-yellow-400">Legendario</span>.
            </p>
            <p>
              <strong className="text-white">¿Cómo funciona?</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Recarga tu balance con Kwelps Coins en tu Wallet</li>
              <li>Compra packs de fotos o fotos individuales en la Tienda</li>
              <li>Colecciona todas las fotos de cada colección</li>
              <li>Fusiona 4 cartas iguales para obtener una de mayor rareza</li>
              <li>Completa colecciones y gana premios especiales</li>
              <li><span className="text-emerald-400 font-medium">Descarga tus fotos</span> y úsalas como fondos de pantalla para tu celular</li>
            </ul>

            {/* Costa Rica FYI */}
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <span className="text-xl">🇨🇷</span>
                <div>
                  <p className="text-sm text-blue-300 font-medium">Usuarios de Costa Rica</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Pueden recargar su balance con <span className="text-white font-medium">Sinpe Móvil</span> contactándonos por{' '}
                    <a
                      href="https://t.me/kwelps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline font-medium"
                    >
                      Telegram
                    </a>
                  </p>
                </div>
              </div>
            </div>
            <div className="pt-4 flex flex-wrap gap-3">
              <Link
                href="/store"
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-colors font-medium text-sm"
              >
                Ir a la Tienda
              </Link>
              <Link
                href="/album"
                className="px-5 py-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors font-medium text-sm border border-white/10"
              >
                Ver mi Álbum
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}