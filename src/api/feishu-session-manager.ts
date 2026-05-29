/**
 * Feishu Session Manager - 飞书通道的薄封装
 *
 * 复用通用的 ChannelSessionManager，仅设置 channel = "feishu"。
 * 其他通道（微信、Telegram 等）同理，只需换 channel 名称。
 */
export { ChannelSessionManager as FeishuSessionManager } from "../core/session/channel-session-manager.js";
export type { ChannelSessionManagerOptions as FeishuSessionManagerOptions } from "../core/session/channel-session-manager.js";
