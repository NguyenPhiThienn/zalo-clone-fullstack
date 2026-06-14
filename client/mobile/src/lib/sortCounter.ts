/**
 * Module-level sort order counter — shared across SocketContext and mutation hooks.
 * Mỗi khi có tin nhắn mới (gửi đi hoặc nhận về), increment counter này để đảm bảo
 * thứ tự sắp xếp cuộc trò chuyện luôn chính xác ở ConversationList.
 */
let _globalSortOrder = 0;

export function nextSortOrder(): number {
  return ++_globalSortOrder;
}

export function currentSortOrder(): number {
  return _globalSortOrder;
}
