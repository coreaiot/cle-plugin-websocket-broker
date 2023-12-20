import { generateConfig } from '@lib';

export const config = generateConfig({
  description: 'WebSocket Broker configurations.',
  fields: [
    {
      name: 'dataFormat',
      type: 'dropdown',
      description: 'Data Format',
      items: [
        {
          label: 'JSON',
          value: 0,
        },
        {
          label: 'JSON (Compressed by Deflate)',
          value: 1,
        },
        {
          label: 'JSON (Compressed by GZip)',
          value: 2,
        },
        {
          label: 'Binary',
          value: 3,
        },
      ],
      value: 1,
    },
    {
      name: 'postBeacons',
      type: 'switch',
      description: 'Post beacons',
      value: true,
    },
    {
      name: 'postLocators',
      type: 'switch',
      description: 'Post locators',
      value: true,
    },
    {
      name: 'postOutdatedTags',
      type: 'switch',
      description: 'Post outdated tags',
      value: false,
    },
    {
      name: 'postOfflineLocators',
      type: 'switch',
      description: 'Post offline locators',
      value: false,
    },
  ],
});