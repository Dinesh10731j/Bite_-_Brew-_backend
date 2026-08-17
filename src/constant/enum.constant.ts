export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MANAGER = 'manager',
  STAFF = 'staff',
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  UPI = 'upi',
}

export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEAWAY = 'TAKEAWAY',
  DELIVERY = 'DELIVERY',
}

export enum OrderPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum NotificationType {
  ORDER = 'ORDER',
  MESSAGE = 'MESSAGE',
  SYSTEM = 'SYSTEM',
}

export enum NotificationPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum MessageSource {
  WEBSITE = 'website',
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
}

export enum GalleryCategory {
  FOOD = 'FOOD',
  INTERIOR = 'INTERIOR',
  EVENTS = 'EVENTS',
}

// ===== Security / Session Enums =====
export enum SessionStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  FORCED_LOGOUT = 'forced_logout',
}

export enum LoginStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  LOCKED = 'locked',
  FORCED_LOGOUT = 'forced_logout',
  EXPIRED = 'expired',
}

export enum SecurityEventType {
  LOGIN = 'LOGIN',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_REVOKED = 'SESSION_REVOKED',
  SESSION_FORCED_LOGOUT = 'SESSION_FORCED_LOGOUT',
  REGISTRATION = 'REGISTRATION',
  REGISTRATION_BLOCKED = 'REGISTRATION_BLOCKED',
  REFRESH_TOKEN_ROTATED = 'REFRESH_TOKEN_ROTATED',
  REFRESH_TOKEN_REUSE = 'REFRESH_TOKEN_REUSE',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  DEVICE_CHANGE = 'DEVICE_CHANGE',
  IP_ANOMALY = 'IP_ANOMALY',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
}

export enum RegistrationStatus {
  ALLOWED = 'allowed',
  BLOCKED_IP = 'blocked_ip',
  BLOCKED_DEVICE = 'blocked_device',
  BLOCKED_VELOCITY = 'blocked_velocity',
}

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  SIGNUP = 'SIGNUP',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  SESSION_REVOKE = 'SESSION_REVOKE',
  SESSION_FORCED_LOGOUT = 'SESSION_FORCED_LOGOUT',
  REFRESH_ROTATION = 'REFRESH_ROTATION',
  REFRESH_REUSE = 'REFRESH_REUSE',
  ACCOUNT_LOCK = 'ACCOUNT_LOCK',
  ACCOUNT_UNLOCK = 'ACCOUNT_UNLOCK',
  ADMIN_ACTION = 'ADMIN_ACTION',
}
