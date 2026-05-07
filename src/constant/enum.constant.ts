export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MANAGER = 'manager',
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


