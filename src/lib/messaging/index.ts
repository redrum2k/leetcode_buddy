import type { AppMessage, MessageOfType, MessageType } from './types';

export type { AppMessage, MessageOfType, MessageType };
export * from './types';

export async function sendMessage<T extends MessageType>(
  message: MessageOfType<T>,
): Promise<void> {
  await chrome.runtime.sendMessage(message);
}

export async function sendMessageWithResponse<T extends MessageType, R>(
  message: MessageOfType<T>,
): Promise<R> {
  return chrome.runtime.sendMessage<MessageOfType<T>, R>(message);
}

export function addMessageListener<T extends MessageType>(
  type: T,
  handler: (
    message: MessageOfType<T>,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => void | boolean,
): () => void {
  const listener = (
    message: AppMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ): void | boolean => {
    if (message.type === type) {
      return handler(message as MessageOfType<T>, sender, sendResponse);
    }
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}
