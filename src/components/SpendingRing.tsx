interface SpendingRingProps {
  spent: number;
  budget: number;
  streak?: number;
}

const SpendingRing = ({ spent, budget, streak = 0 }: SpendingRingProps) => {
  const remaining = Math.max(0, budget - spent);
  const percentage = budget > 0 ? Math.min((remaining / budget) * 100, 100) : 0;
  const circumference = 2 * Math.PI * 100;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <section className="mt-10 flex justify-center items-center relative">
      <div className="w-64 h-64 relative flex items-center justify-center">
        {/* SVG Ring */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 232 232">
          {/* Background ring */}
          <circle
            cx="116" cy="116" r="100"
            fill="none"
            stroke="hsla(224, 90%, 55%, 0.1)"
            strokeWidth="16"
          />
          {/* Progress ring */}
          <circle
            cx="116" cy="116" r="100"
            fill="none"
            stroke="hsl(224, 90%, 55%)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            style={{ filter: "drop-shadow(0 0 8px hsla(224, 90%, 55%, 0.5))" }}
          />
        </svg>

        {/* Inner content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1 mb-1">
            <span className="material-icons text-primary text-3xl drop-shadow-lg animate-flame-pulse">local_fire_department</span>
            {streak > 0 && (
              <span className="text-sm font-bold text-primary">{streak}</span>
            )}
          </div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Daily Budget</p>
          <p className="text-2xl font-bold text-foreground">₹{remaining.toLocaleString("en-IN")}</p>
          <p className="text-xs text-primary/80 font-medium mt-1">Left for today</p>
        </div>
      </div>

      {/* Decorative rings */}
      <div className="absolute w-72 h-72 border border-primary/10 rounded-full animate-pulse opacity-30 pointer-events-none" />
      <div className="absolute w-80 h-80 border border-primary/5 rounded-full opacity-20 pointer-events-none" />
    </section>
  );
};

export default SpendingRing;
