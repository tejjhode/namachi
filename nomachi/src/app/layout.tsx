import { DatabaseInitializer } from "@/components/DatabaseInitializer";
import "./globals.css";

export const metadata = {
  title: 'Nomichi - Explore. Discover. Travel.',
  description: 'Discover amazing places with Nomichi',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <DatabaseInitializer />
        {children}
      </body>
    </html>
  )
}
