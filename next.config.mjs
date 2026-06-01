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

  // Headers de segurança + WebAssembly (necessário para TensorFlow.js)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // WebAssembly / TensorFlow.js
          // credentialless permite CDNs externas (rsms.me, etc.) sem exigir CORP header
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          // Segurança geral
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://rsms.me",
              "img-src 'self' data: blob:",
              "font-src 'self' https://rsms.me",
              // WebSocket Deriv + HMR dev + OAuth
              "connect-src 'self' ws://localhost:* wss://localhost:* wss://ws.derivws.com wss://*.derivws.com wss://ws.binaryws.com wss://*.binaryws.com https://*.binaryws.com https://*.deriv.com wss://*.deriv.com https://oauth.deriv.com",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
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