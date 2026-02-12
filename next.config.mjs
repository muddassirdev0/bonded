import withPWA from 'next-pwa';

const pwaConfig = withPWA({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Optimize for native app compatibility
    reactStrictMode: true,
    images: {
        unoptimized: true, // Better for PWA/native
    },
};

export default pwaConfig(nextConfig);
