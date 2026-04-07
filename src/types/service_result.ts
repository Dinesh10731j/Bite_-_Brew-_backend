export interface ServiceResult<T = any> {
  status: number;
  data?: T;
  error?: string;
}
