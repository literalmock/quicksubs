const statusConfig = {
  uploading: {
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    icon: '⬆️',
    label: 'Uploading',
  },
  queued: {
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    icon: '⏳',
    label: 'Queued',
  },
  processing: {
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    icon: '⚙️',
    label: 'Processing',
    animated: true,
  },
  completed: {
    color: 'bg-green-500/20 text-green-400 border-green-500/50',
    icon: '✓',
    label: 'Completed',
  },
  failed: {
    color: 'bg-red-500/20 text-red-400 border-red-500/50',
    icon: '✕',
    label: 'Failed',
  },
};

const StatusBadge = ({ status, size = 'md' }) => {
  const config = statusConfig[status] || statusConfig.queued;
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-[11px]',
    md: 'px-3 py-1.5 text-xs',
    lg: 'px-4 py-2 text-sm',
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium transition-all duration-200 ${config.color} ${sizeClasses[size]} ${
        config.animated ? 'animate-glow-pulse' : ''
      }`}
    >
      {config.animated && (
        <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
      )}
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
};

export default StatusBadge;
