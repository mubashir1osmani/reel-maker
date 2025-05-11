import Link from "next/link"

export default function Footer() {
    return (
        <>
      <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="md:flex md:justify-between">
          <div className="mb-8 md:mb-0">
            <div className="flex items-center">
              <span role="img" aria-label="movie camera" className="text-2xl mr-2">
                🎬
              </span>
              <span className="font-bold text-xl">AI Reel Maker</span>
            </div>
            <p className="mt-2 text-gray-400 max-w-xs">
              Transforming text descriptions into stunning videos with the power of AI.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase mb-4">
                Product
              </h3>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-gray-300 hover:text-white">Features</Link></li>
                <li><Link href="#" className="text-gray-300 hover:text-white">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase mb-4">
                Company
              </h3>
              <ul className="space-y-2">
                <li><Link href="#about" className="text-gray-300 hover:text-white">About</Link></li>
                <li><Link href="#" className="text-gray-300 hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase mb-4">
                Legal
              </h3>
              <ul className="space-y-2">
                <li><Link href="#" className="text-gray-300 hover:text-white">Privacy</Link></li>
                <li><Link href="#" className="text-gray-300 hover:text-white">Terms</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-800 pt-8">
          <p className="text-center text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} AI Reel Maker. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
    </>
    )
}