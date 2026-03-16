const CreditsIndicator = ({ credits, plan, maxCredits = 10 }) => {
  const percentage = (credits / maxCredits) * 100;
  const isLow = credits <= 2;
  const isOut = credits === 0;

  return (
    <div className="glass-sm rounded-lg px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-surface-400">Available Credits</p>
          <p
            className={`text-lg font-bold transition-colors ${
              isOut ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-primary-400'
            }`}
          >
            {credits}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-surface-400 uppercase tracking-wide">{plan || 'free'}</p>
          <p className="text-xs text-surface-500">Plan</p>
        </div>
      </div>

      <div className="w-full h-1.5 bg-surface-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isOut ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-gradient-to-r from-primary-600 to-primary-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-xs text-surface-500">
        {isOut && "You've used all your credits for today. "}
        {credits} of {maxCredits} available
        {!isOut && `. ${maxCredits - credits} remaining`}
      </p>
    </div>
  );
};

export default CreditsIndicator;
