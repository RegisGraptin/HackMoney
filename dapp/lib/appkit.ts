import { createAppKit } from '@reown/appkit/react'
import { wagmiAdapter } from './wagmi'
import { sepolia } from '@reown/appkit/networks'

// Get projectId from environment
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID

if (!projectId) {
  throw new Error('NEXT_PUBLIC_REOWN_PROJECT_ID is not set')
}

// Set up metadata
const metadata = {
  name: 'Cipher Lend',
  description: 'The confidential lending layer that lets users lend to Aave without exposing their positions on-chain.',
  url: 'https://localhost:3000', // FIXME: Update with your domain
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// Create the modal
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [sepolia],
  defaultNetwork: sepolia,
  metadata,
  features: {
    analytics: true,
    email: true,
    socials: ['google', 'x', 'github'],
  }
})
