import { RegisterForm } from '@/components/auth/register-form'
import Link from 'next/link'
import { LoginBackground } from '../login/login-background'
import { prisma } from '@/lib/prisma'

async function getRandomPhotos() {
  try {
    // Get random photos from active collections (only COMMON or RARE)
    const photos = await prisma.photo.findMany({
      where: {
        collection: {
          active: true,
        },
        rarity: {
          in: ['COMMON', 'RARE'],
        },
      },
      select: {
        id: true,
        url: true,
        thumbnailUrl: true,
      },
    })

    // Shuffle and take up to 20 photos
    const shuffled = photos.sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 20)
  } catch (error) {
    console.error('Error fetching photos for carousel:', error)
    return []
  }
}

export default async function RegisterPage() {
  const carouselImages = await getRandomPhotos()

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Carousel */}
      <LoginBackground images={carouselImages} />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md p-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <span className="text-white font-bold text-2xl">K</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-4">Kwelps Album</h1>
          <p className="text-gray-300 mt-1">Crea tu cuenta</p>
        </div>

        {/* Form Container */}
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl">
          <RegisterForm />

          <div className="mt-6 text-center">
            <p className="text-gray-300 text-sm">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}