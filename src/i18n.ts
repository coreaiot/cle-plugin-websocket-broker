import { generateI18n } from "@lib";

export const i18n = generateI18n({
  'zh-CN': {
    'WebSocket Broker configurations.': 'WebSocket Broker 配置',
    'Post outdated tags': '发送过期信标数据',
    'JSON (Compressed by Deflate)': 'JSON (使用 Deflate 压缩数据)',
    'JSON (Compressed by GZip)': 'JSON (使用 GZip 压缩数据)',
    'Binary': '二进制',
    'Post beacons': '发送信标',
    'Post locators': '发送基站',
    'Post device counters': '发送设备统计',
    'Post outdated beacons': '发送过期信标数据',
    'Post offline locators': '发送离线基站',
    'Subscribers': '订阅者',
    'Data Format': '数据格式',
  },
});