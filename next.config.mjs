/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desativar Turbopack temporariamente para debugging
  turbopack: {},
  
  // Configurações para TensorFlow.js
  webpack: (config, { isServer, dev }) => {
    // Adicionar polyfills para TensorFlow.js
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Configurações específicas para o servidor
    if (isServer) {
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      });
    }

    // Configurações para TensorFlow.js
    config.module = {
      ...config.module,
      noParse: /node_modules\/@tensorflow\/tfjs\/(dist\/)?tf\.js$/,
    };

    return config;
  },

  // Headers para WebAssembly (necessário para TensorFlow.js)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },

  // Transpile TensorFlow.js
  transpilePackages: ['@tensorflow/tfjs', '@tensorflow/tfjs-core', '@tensorflow/tfjs-converter', '@tensorflow/tfjs-backend-webgl'],

  // Desativar warnings de otimização
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
};

export default nextConfig;