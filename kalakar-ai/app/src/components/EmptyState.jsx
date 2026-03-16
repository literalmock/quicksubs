const EmptyState = ({ icon = '📹', title, description, action }) => {
  return (
    <div className="py-24 px-4">
      <div className="max-w-md mx-auto text-center space-y-6 animate-slide-up">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-600/20 to-primary-500/10 flex items-center justify-center text-5xl animate-float">
            {icon}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="text-surface-400 text-sm leading-relaxed">{description}</p>
        </div>

        {/* Action */}
        {action && (
          <div className="pt-4">
            {action}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
