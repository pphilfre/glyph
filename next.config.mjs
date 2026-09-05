/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Docker needs a standalone server; Vercel's adapter packages its own output.
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,
};

export default config;
