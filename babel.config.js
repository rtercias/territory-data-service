module.exports = function (api) {
  api.cache(true);

  console.log('process.env.ENV', process.env.ENV);
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
