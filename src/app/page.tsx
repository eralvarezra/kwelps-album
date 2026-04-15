import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
          {/* Nav */}
          <nav className="flex justify-between items-center mb-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-white font-bold text-xl">Kwelps Album</span>
            </div>
            <div className="flex gap-3">
              <Link
                href="/login"
                className="px-5 py-2 text-white/80 hover:text-white transition-colors"
              >
                Iniciar Sesion
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/25"
              >
                Registrarse
              </Link>
            </div>
          </nav>

          {/* Hero */}
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Colecciona, Fusiona y{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Gana Premios
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-white/70 mb-8 leading-relaxed">
              Kwelps Album es tu album de fotos coleccionables digital.
              Colecta fotos de diferentes rarezas, fusiona cartas repetidas y
              completa colecciones para ganar premios increibles.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium text-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
              >
                Empezar Ahora
              </Link>
              <Link
                href="#como-funciona"
                className="px-8 py-4 bg-white/10 text-white rounded-xl font-medium text-lg hover:bg-white/20 transition-all border border-white/20"
              >
                Como Funciona
              </Link>
            </div>
          </div>

          {/* Preview Cards */}
          <div className="mt-16 flex justify-center gap-4 flex-wrap">
            {[
              { rarity: 'Comun', color: 'from-gray-500 to-gray-600', border: 'border-gray-500/50' },
              { rarity: 'Raro', color: 'from-blue-500 to-blue-600', border: 'border-blue-500/50' },
              { rarity: 'Epico', color: 'from-purple-500 to-purple-600', border: 'border-purple-500/50' },
              { rarity: 'Legendario', color: 'from-yellow-500 to-amber-600', border: 'border-yellow-500/50' },
            ].map((card) => (
              <div
                key={card.rarity}
                className={`w-32 sm:w-40 h-48 sm:h-56 rounded-2xl bg-gradient-to-br ${card.color} p-4 flex flex-col justify-between shadow-xl transform hover:scale-105 transition-transform cursor-pointer border-2 ${card.border}`}
              >
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white/20 backdrop-blur-sm" />
                </div>
                <div className="text-center">
                  <p className="text-white/80 text-sm">Rareza</p>
                  <p className="text-white font-bold text-lg">{card.rarity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="como-funciona" className="py-20 bg-black/20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">
            Como Funciona
          </h2>
          <p className="text-white/60 text-center mb-12 max-w-2xl mx-auto">
            Un sistema simple y divertido para coleccionar fotos unicas
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '1',
                title: 'Recarga tu Balance',
                desc: 'Agrega Kwelps Coins a tu wallet usando PayPal o Sinpe Movil (Costa Rica)',
              },
              {
                step: '2',
                title: 'Compra Packs',
                desc: 'Compra packs de 4 fotos o fotos individuales en la tienda',
              },
              {
                step: '3',
                title: 'Fusiona Cartas',
                desc: 'Tienes 4 cartas iguales? Fusiona para obtener una de mayor rareza',
              },
              {
                step: '4',
                title: 'Gana Premios',
                desc: 'Completa colecciones y canjea premios especiales',
              },
            ].map((feature) => (
              <div
                key={feature.step}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition-colors"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-xl">{feature.step}</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-white/60 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rarity Section */}
      <div className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">
            Sistema de Rareza
          </h2>
          <p className="text-white/60 text-center mb-12 max-w-2xl mx-auto">
            Cada foto tiene una rareza diferente con probabilidades unicas
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                rarity: 'Comun',
                color: 'from-gray-500 to-gray-600',
                border: 'border-gray-500/30',
                chance: '60%',
                desc: 'La rareza mas comun, perfecta para fusionar',
              },
              {
                rarity: 'Raro',
                color: 'from-blue-500 to-blue-600',
                border: 'border-blue-500/30',
                chance: '25%',
                desc: 'Mas dificil de conseguir, pero muy valiosa',
              },
              {
                rarity: 'Epico',
                color: 'from-purple-500 to-purple-600',
                border: 'border-purple-500/30',
                chance: '10%',
                desc: 'Fotos exclusivas para coleccionistas',
              },
              {
                rarity: 'Legendario',
                color: 'from-yellow-500 to-amber-600',
                border: 'border-yellow-500/30',
                chance: '5%',
                desc: 'La joya mas preciada del album',
              },
            ].map((item) => (
              <div
                key={item.rarity}
                className={`bg-white/5 backdrop-blur-sm rounded-2xl p-6 border ${item.border}`}
              >
                <div className={`w-full h-2 rounded-full bg-gradient-to-r ${item.color} mb-4`} />
                <h3 className="text-white font-bold text-lg mb-1">{item.rarity}</h3>
                <p className={`text-2xl font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent mb-2`}>
                  {item.chance}
                </p>
                <p className="text-white/60 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pity System */}
      <div className="py-20 bg-gradient-to-br from-purple-900/50 to-pink-900/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-block px-4 py-2 bg-yellow-500/20 rounded-full text-yellow-400 text-sm font-medium mb-6">
            Sistema de Pity
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Nunca te quedas sin suerte
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Si no obtienes una carta legendaria en 20 compras, el sistema te garantiza una.
            Ademas, cada pack de 4 fotos siempre incluye al menos una carta rara o superior.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-white/5 rounded-xl px-6 py-4 border border-white/10">
              <p className="text-3xl font-bold text-white">20</p>
              <p className="text-white/60 text-sm">Pulls para legendario</p>
            </div>
            <div className="bg-white/5 rounded-xl px-6 py-4 border border-white/10">
              <p className="text-3xl font-bold text-white">1+</p>
              <p className="text-white/60 text-sm">Rara garantizada por pack</p>
            </div>
            <div className="bg-white/5 rounded-xl px-6 py-4 border border-white/10">
              <p className="text-3xl font-bold text-white">4:1</p>
              <p className="text-white/60 text-sm">Fusion de cartas</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Listo para comenzar tu coleccion?
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Unete a miles de coleccionistas y completa tu album de Kwelps
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium text-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/25"
            >
              Crear Cuenta Gratis
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-white/10 text-white rounded-xl font-medium text-lg hover:bg-white/20 transition-all border border-white/20"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-white/60 font-medium">Kwelps Album</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://t.me/kwelps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
              <a
                href="https://kwelps.app"
                className="text-white/60 hover:text-white transition-colors text-sm"
              >
                kwelps.app
              </a>
            </div>
          </div>
          <p className="text-center text-white/40 text-sm mt-6">
            2024 Kwelps Album. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}