import { transform } from '@formatjs/ts-transformer';

const tsLoader = {
  test: /\.tsx?$/,
  use: [
    {
      loader: 'ts-loader',
      options: {
        getCustomTransformers() {
          return {
            before: [
              transform({
                overrideIdFn: '[sha512:contenthash:base64:6]',
              }),
            ],
          };
        },
      },
    },
  ],
};

module.exports = {
  webpack: {
    configure: (webpackConfig: any) => {
      webpackConfig.module.rules.push(tsLoader);

      return webpackConfig;
    },
  },
};
