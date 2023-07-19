module.exports = {
  description: 'WebSocket Broker configurations.',
  fields: [
    {
      name: 'compress',
      type: 'switch',
      description: 'Compress data using deflate',
      value: true,
    },
    {
      name: 'postOutdatedTags',
      type: 'switch',
      description: 'Post outdated tags',
      value: false,
    },
  ],
};