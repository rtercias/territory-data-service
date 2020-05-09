module.exports = function (api) {
  api.cache(true);

  console.log('NODE_ENV', NODE_ENV);
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
    presets,
    plugins
  };
}
