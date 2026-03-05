interface TransactionCardProps {
  icon: string;
  title: string;
  subtitle: string;
  amount: number;
  type: "income" | "expense";
  iconBg?: string;
  iconColor?: string;
  note?: string | null;
}

const TransactionCard = ({ icon, title, subtitle, amount, type, iconBg, iconColor, note }: TransactionCardProps) => {
  const isIncome = type === "income";

  return (
    <div className="glass-card rounded-lg p-4 flex items-center justify-between group hover:bg-accent/50 transition-all duration-300">
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center border border-border/30 shadow-inner"
          style={{
            backgroundColor: iconBg || "hsla(0, 0%, 0%, 0.4)",
          }}
        >
          <span className="material-icons text-xl" style={{ color: iconColor || "hsl(var(--foreground))" }}>
            {icon}
          </span>
        </div>
        <div>
          <h4 className="font-bold text-foreground text-base">{title}</h4>
          <p className="text-xs text-muted-foreground font-medium">{subtitle}</p>
          {note && (
            <p className="text-xs text-primary/70 mt-0.5 italic truncate max-w-[180px]">📝 {note}</p>
          )}
        </div>
      </div>
      <span className={`font-bold text-base ${isIncome ? "text-success" : "text-destructive"}`}>
        {isIncome ? "+" : "-"} ₹{Math.abs(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
};

export default TransactionCard;
