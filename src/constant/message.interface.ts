export const MESSAGES = {
  SUCCESS: 'Operation successful',
  CREATED_SUCCESS: 'Resource created successfully',
  UPDATED_SUCCESS: 'Resource updated successfully',
  DELETED_SUCCESS: 'Resource deleted successfully',
  BAD_REQUEST: 'Bad request',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  USER_REGISTERED: 'User registered successfully',
  USER_CREATED_SUCCESS: 'User created successfully',
  USER_ALREADY_EXISTS: 'User already exists',
  USER_NOT_FOUND: 'User not found',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  INVALID_REQUEST: 'Invalid request',
  INVALID_EMAIL_OR_PASSWORD: 'Invalid email or password',
  RESET_EMAIL_SENT: 'Reset email sent',
  RESET_TOKEN_INVALID: 'Reset token invalid',
  PASSWORD_RESET_SUCCESS: 'Password reset successful',
  ORDER_PLACED: 'Order placed successfully',
} as const;

export type IMessages = typeof MESSAGES;
export const Message = MESSAGES;

