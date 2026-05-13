type ToastProps = {
  title?: string;
  description?: string;
};

export function useToast() {
  function toast({ title, description }: ToastProps) {
    console.log("Toast:", title, description);
  }

  return {
    toast,
  };
}