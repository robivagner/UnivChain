import { alertDangerClass } from "@/lib/ui/portalClasses";

type Props = {
  message: string;
};

export function TxErrorAlert({ message }: Props) {
  return (
    <div className={alertDangerClass} role="alert">
      <p className="text-sm font-medium text-red-100">Transaction failed</p>
      <p className="text-sm text-red-50/90 break-words mt-1">{message}</p>
    </div>
  );
}
