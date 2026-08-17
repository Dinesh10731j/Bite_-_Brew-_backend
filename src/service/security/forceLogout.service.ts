import { getIo } from '../../configs/socket.config';

/**
 * ForceLogoutService
 *
 * Centralizes live forced-logout over Socket.IO. When a session is invalidated
 * (single-active-session replacement, session revocation, password change,
 * token reuse), the backend locates the affected sockets and:
 *   1. Emits a `FORCE_LOGOUT` event to the user room.
 *   2. Disconnects sockets belonging to the specific session room.
 *
 * This is used by the auth flow, session dashboard, and anywhere a session is
 * revoked so the frontend can clear cookies and redirect to login.
 */
export class ForceLogoutService {
  /**
   * Force-logout a specific session (disconnect only that session's sockets).
   */
  async forceLogoutSession(
    userId: string,
    sessionId: string,
    reason = 'session_revoked',
  ): Promise<void> {
    const io = getIo();
    if (!io) return;

    // Notify any socket in the user room.
    io.to(`user:${userId}`).emit('FORCE_LOGOUT', { reason, sessionId });

    // Disconnect sockets bound to the specific session room.
    const sessionRoom = `session:${sessionId}`;
    try {
      const sockets = await io.in(sessionRoom).fetchSockets();
      sockets.forEach((s: { disconnect: (close: boolean) => void }) => s.disconnect(true));
    } catch {
      // Non-fatal.
    }
  }

  /**
   * Force-logout the previous session when a new login replaces it
   * (Netflix-style single active session).
   */
  async forceLogoutAllForUser(userId: string, reason = 'signed_in_elsewhere'): Promise<void> {
    const io = getIo();
    if (!io) return;
    io.to(`user:${userId}`).emit('FORCE_LOGOUT', { reason });
  }
}
