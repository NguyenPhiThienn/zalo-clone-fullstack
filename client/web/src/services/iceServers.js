/**
 * ICE server configuration for WebRTC.
 *
 * Sử dụng:
 *   1. Google STUN — free, unlimited
 *   2. ExpressTURN — 1000 GB/month free (không cần credit card)
 *      → Lấy credential tại https://www.expressturn.com
 *      → Set env: VITE_TURN_USERNAME, VITE_TURN_CREDENTIAL
 *   3. Open Relay fallback — 20 GB/month free
 *      → Set env: VITE_OPENRELAY_USERNAME, VITE_OPENRELAY_CREDENTIAL
 *
 * Khi chưa có TURN key thì chỉ dùng STUN.
 * P2P thành công trong ~80% trường hợp với STUN only.
 */
export function getIceServers() {
  const servers = [
    // Google STUN — free forever, no key needed
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // ExpressTURN — 1000 GB/month free
  const turnUser = import.meta.env.VITE_TURN_USERNAME;
  const turnCred = import.meta.env.VITE_TURN_CREDENTIAL;
  if (turnUser && turnCred) {
    servers.push(
      {
        urls: 'turn:relay1.expressturn.com:3478',
        username: turnUser,
        credential: turnCred,
      },
      {
        urls: 'turns:relay1.expressturn.com:443',
        username: turnUser,
        credential: turnCred,
      }
    );
  }

  // Open Relay fallback — 20 GB/month free
  const orUser = import.meta.env.VITE_OPENRELAY_USERNAME;
  const orCred  = import.meta.env.VITE_OPENRELAY_CREDENTIAL;
  if (orUser && orCred) {
    servers.push({
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turns:openrelay.metered.ca:443',
      ],
      username: orUser,
      credential: orCred,
    });
  }

  return servers;
}
