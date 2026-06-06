/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Required for @huggingface/transformers ONNX runtime in Node.js API routes
  serverExternalPackages: ['@huggingface/transformers', 'onnxruntime-node', 'sharp'],
  // Empty turbopack config satisfies Next.js 16 requirement (avoids the
  // "webpack config with no turbopack config" error in Turbopack mode)
  turbopack: {},
}

export default nextConfig

