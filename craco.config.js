module.exports = {
  babel: {
    plugins: [
      [
        'formatjs',
        {
          idInterpolationPattern: '[sha512:contenthash:base64:6]',
          ast: true,
        },
      ],
    ],
  },
  devServer: {
    proxy: {
      '/qc': 'http://localhost:3001',
      '/mask-edit': 'http://localhost:3002',
      '/ffr-validate': 'http://localhost:3003',
      '/report': 'http://localhost:3004',
      '/workers': 'http://localhost:3002',
      '/static/media/dvlogo*': 'http://localhost:3004',
    },
  },
};
