import type { Metadata } from 'next'
import './globals.css'
import { MotionProvider } from '@/lib/motion/provider'

export const metadata: Metadata = {
  title: 'Deflake — Flaky Test Auto-Triager',
  description: 'Parallel Playwright attempts, statistical flake detection, and evidence-based fix suggestions.',
  authors: [{ name: 'KhyFee', url: 'https://github.com/KhyFee' }],
  creator: 'KhyFee',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-motion="on">
      <body>
        <MotionProvider>
          {children}
          <footer className="credit">
            Deflake by <a href="https://github.com/KhyFee">KhyFee</a>
          </footer>
        </MotionProvider>
      </body>
    </html>
  )
}
