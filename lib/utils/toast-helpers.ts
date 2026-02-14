const opts = { style: { borderRadius: '5px', background: '#333', color: '#fff', padding: '16px' }, duration: 4000, position: 'bottom-center' as const };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function showSuccessToast(message: string, toast: any) {
  return toast.success?.(message, opts);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function showErrorToast(message: string, toast: any) {
  return toast.error?.(message, opts);
}
