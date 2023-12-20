import { generateStatus } from "@lib";

export const status = generateStatus({
  fields: [
    {
      name: 'subscribers',
      description: 'Subscribers',
      value: [] as {
        value: string;
      }[],
    },
  ],
  getResult(obj) {
    if (obj.subscribers && obj.subscribers.length)
      return obj.subscribers.length.toString();
  },
  getStyle(obj, key) {
    switch (key) {
      case 'result':
        if (obj.subscribers && obj.subscribers.length) return 'success';
        return 'muted';
      case 'subscribers':
        return 'list';
      default:
        return '';
    }
  },
});
