import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import GroupWindow from '../components/group/GroupWindow';
import SessionReplacedModal from '../components/common/SessionReplacedModal';
import BannedModal from '../components/common/BannedModal';
import UserProfileModal from '../components/user/UserProfileModal';
import IncomingCallModal from '../components/call/IncomingCallModal';
import ActiveCallBar from '../components/call/ActiveCallBar';
import VideoCallWindow from '../components/call/VideoCallWindow';
import useChatStore from '../store/chatStore';
import useAuthStore from '../store/authStore';
import useCallStore from '../store/callStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { useCallManager } from '../hooks/useCallManager';

export default function ChatPage() {
  const { activeTab, activeChatId, activeGroupId } = useChatStore();
  const { auth } = useAuthStore();
  const navigate = useNavigate();
  const activeCall   = useCallStore((s) => s.activeCall);
  const incomingCall = useCallStore((s) => s.incomingCall);
  const [callWindowOpen, setCallWindowOpen] = useState(false);

  useEffect(() => {
    if (auth?.role === 'ADMIN') navigate('/admin', { replace: true });
  }, [auth?.role, navigate]);

  useWebSocket();
  const { startCall, acceptCall, rejectCall, endCall } = useCallManager();

  // Auto-open VideoCallWindow for any VIDEO call (ringing, connecting, active)
  useEffect(() => {
    if (activeCall?.callType === 'VIDEO') {
      setCallWindowOpen(true);
    }
  }, [activeCall?.callType, activeCall?.status]);

  // Close window when call ends
  useEffect(() => {
    if (!activeCall) setCallWindowOpen(false);
  }, [activeCall]);

  const showChatWindow  = activeTab === 'chats'  && activeChatId;
  const showGroupWindow = activeTab === 'groups' && activeGroupId;
  const showEmpty = !showChatWindow && !showGroupWindow
    && !['ai', 'contacts', 'search'].includes(activeTab);

  return (
    <div className="h-screen flex bg-gray-100 overflow-hidden">
      <SessionReplacedModal />
      <BannedModal />
      <UserProfileModal />

      {incomingCall && (
        <IncomingCallModal onAccept={acceptCall} onReject={rejectCall} />
      )}
      {activeCall && !callWindowOpen && (
        <ActiveCallBar
          onEndCall={endCall}
          onExpand={() => setCallWindowOpen(true)}
        />
      )}
      {callWindowOpen && activeCall && (
        <VideoCallWindow
          onEndCall={endCall}
          onMinimize={() => setCallWindowOpen(false)}
        />
      )}

      <div className={`w-80 flex-shrink-0 h-full border-r border-gray-200 shadow-sm${activeCall && !callWindowOpen ? ' pt-10' : ''}`}>
        <Sidebar />
      </div>

      <div className={`flex-1 flex flex-col h-full overflow-hidden${activeCall && !callWindowOpen ? ' pt-10' : ''}`}>
        {showChatWindow && (
          <ChatWindow
            key={activeChatId}
            onStartCall={(p) => startCall(p)}
          />
        )}
        {showGroupWindow && <GroupWindow key={activeGroupId} onStartCall={(p) => startCall(p)} />}
        {showEmpty && (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-7xl mb-6">💬</div>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">Zalo Clone</h2>
              <p className="text-gray-400 text-sm">
                Chọn một cuộc trò chuyện hoặc nhóm để bắt đầu nhắn tin
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
