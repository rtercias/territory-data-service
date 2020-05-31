module.exports = function (api) {
  api.cache(true);

  const presets = [
    [
      '@babel/preset-env',
      {
        'targets': {
          'node': 'current'
        }
      }
    ]
  ];
  const plugins = [];

  return {
    "ignore": [
      './node_modules',
      './.babel.config.js',
      './package.json',
      './npm-debug.log'
    ],
    presets,
    plugins
  };
}
