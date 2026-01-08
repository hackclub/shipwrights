import type { NextConfig } from 'next'

const cfg: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.slack-edge.com' },
      { protocol: 'https', hostname: 'ca.slack-edge.com' },
      { protocol: 'https', hostname: 'secure.gravatar.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
}

export default cfg
