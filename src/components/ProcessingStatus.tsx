import { CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react';

export type StatusType = 'idle' | 'processing' | 'success' | 'error' | 'info';

interface ProcessingStatusProps {
  status: StatusType;
  message: string;
  details?: string;
}

export const ProcessingStatus = ({ status, message, details }: ProcessingStatusProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'processing':
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin" />,
          className: 'status-info',
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          className: 'status-success',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          className: 'status-error',
        };
      case 'info':
        return {
          icon: <Info className="w-5 h-5" />,
          className: 'status-info',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();

  if (!config) return null;

  return (
    <div className={`status-badge ${config.className}`}>
      {config.icon}
      <span>{message}</span>
      {details && <span className="text-xs opacity-75">({details})</span>}
    </div>
  );
};
