module.exports = function (api) {
  api.cache(true);

  console.log('cwd', process.cwd());
  console.log('__dirname', __dirname);

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
