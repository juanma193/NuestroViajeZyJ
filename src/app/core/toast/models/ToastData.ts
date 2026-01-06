export type ToastData = {
  type: 'success' | 'info' | 'warning' | 'error';
  title?: string;
  message?: string;
  duration?: number;
};
