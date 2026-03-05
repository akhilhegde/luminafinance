import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useMemo } from "react";

const COLORS = [
  "hsl(224, 90%, 55%)", "hsl(152, 69%, 53%)", "hsl(0, 72%, 51%)",
  "hsl(38, 92%, 50%)", "hsl(262, 83%, 58%)", "hsl(198, 93%, 60%)",
  "hsl(330, 81%, 60%)", "hsl(45, 93%, 47%)",
];

const Analytics = () => {
  const { user } = useAuth();

  const { data: transactions } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*, categories(name, icon)")
        .eq("user_id", user!.id)
        .order("transaction_date", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: importedTransactions } = useQuery({
    queryKey: ["imported-transactions-analytics", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("imported_transactions")
        .select("*, categories(name, icon)")
        .eq("user_id", user!.id)
        .eq("is_ignored", false);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: mappingRules } = useQuery({
    queryKey: ["mapping-rules", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("mapping_rules").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const totalIncome = transactions?.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0) ?? 0;
  const totalExpenses = transactions?.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0) ?? 0;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : "0";

  // Category breakdown
  const categoryMap = new Map<string, number>();
  transactions?.filter((t) => t.type === "expense").forEach((t) => {
    const name = (t.categories as any)?.name || "Other";
    categoryMap.set(name, (categoryMap.get(name) ?? 0) + t.amount);
  });
  const pieData = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Monthly data
  const monthlyMap = new Map<string, { income: number; expense: number }>();
  transactions?.forEach((t) => {
    const month = t.transaction_date.substring(0, 7);
    const entry = monthlyMap.get(month) ?? { income: 0, expense: 0 };
    if (t.type === "income") entry.income += t.amount;
    else entry.expense += t.amount;
    monthlyMap.set(month, entry);
  });
  const barData = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({ month: month.substring(5), ...data }))
    .reverse()
    .slice(-6);

  // --- ACCURACY METRICS ---
  const accuracyStats = useMemo(() => {
    if (!importedTransactions) return null;
    const total = importedTransactions.length;
    if (total === 0) return null;
    const autoCategorized = importedTransactions.filter((t) => t.category_id !== null).length;
    const reviewed = importedTransactions.filter((t) => t.is_reviewed).length;
    const rulesCount = mappingRules?.length ?? 0;
    const accuracy = total > 0 ? Math.round((autoCategorized / total) * 100) : 0;
    return { total, autoCategorized, reviewed, rulesCount, accuracy };
  }, [importedTransactions, mappingRules]);

  // --- RECURRING DETECTION ---
  const recurringPayments = useMemo(() => {
    const allTx = [
      ...(transactions?.map((t) => ({ payee: t.description || "", amount: t.amount, date: t.transaction_date, type: t.type })) ?? []),
      ...(importedTransactions?.map((t) => ({ payee: t.payee, amount: t.adjusted_amount, date: t.transaction_date, type: t.type })) ?? []),
    ];

    const payeeMap = new Map<string, { count: number; amount: number; dates: string[]; type: string }>();
    allTx.forEach((tx) => {
      const key = tx.payee.toLowerCase().trim();
      if (!key || key.length < 3) return;
      const entry = payeeMap.get(key) ?? { count: 0, amount: 0, dates: [], type: tx.type };
      entry.count++;
      entry.amount = tx.amount;
      entry.dates.push(tx.date);
      entry.type = tx.type;
      payeeMap.set(key, entry);
    });

    // Recurring = appears 2+ times with similar amounts
    return Array.from(payeeMap.entries())
      .filter(([, v]) => v.count >= 2)
      .map(([name, v]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count: v.count,
        amount: v.amount,
        type: v.type,
        lastDate: v.dates.sort().reverse()[0],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [transactions, importedTransactions]);

  return (
    <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col pb-24">
      <header className="pt-12 px-6">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Your spending overview</p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 px-6 mt-6">
        {[
          { label: "Income", value: totalIncome, color: "text-success" },
          { label: "Expenses", value: totalExpenses, color: "text-destructive" },
          { label: "Savings", value: `${savingsRate}%`, color: "text-primary" },
        ].map((item) => (
          <div key={item.label} className="glass-card rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
            <p className={`text-lg font-bold ${item.color} mt-1`}>
              {typeof item.value === "number" ? `₹${item.value.toLocaleString("en-IN")}` : item.value}
            </p>
          </div>
        ))}
      </div>

      {/* OCR Accuracy Metrics */}
      {accuracyStats && (
        <section className="px-6 mt-8">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="material-icons text-primary text-xl">precision_manufacturing</span>
            OCR Accuracy
          </h3>
          <div className="glass-card rounded-xl p-4">
            {/* Accuracy ring */}
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <path
                    d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                    fill="none"
                    stroke="hsl(215, 20%, 18%)"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                    fill="none"
                    stroke={accuracyStats.accuracy >= 90 ? "hsl(152, 69%, 53%)" : accuracyStats.accuracy >= 70 ? "hsl(38, 92%, 50%)" : "hsl(0, 72%, 51%)"}
                    strokeWidth="3"
                    strokeDasharray={`${accuracyStats.accuracy}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-foreground">{accuracyStats.accuracy}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Auto-categorized</span>
                  <span className="text-foreground font-medium">{accuracyStats.autoCategorized}/{accuracyStats.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reviewed</span>
                  <span className="text-foreground font-medium">{accuracyStats.reviewed}/{accuracyStats.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mapping rules</span>
                  <span className="text-primary font-medium">{accuracyStats.rulesCount}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Accuracy improves as you categorize more transactions
            </p>
          </div>
        </section>
      )}

      {/* Recurring Payments */}
      {recurringPayments.length > 0 && (
        <section className="px-6 mt-8">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="material-icons text-primary text-xl">autorenew</span>
            Recurring Payments
          </h3>
          <div className="space-y-2">
            {recurringPayments.map((rp, i) => (
              <div key={i} className="glass-card rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                  <span className="material-icons text-primary text-lg">repeat</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{rp.name}</p>
                  <p className="text-xs text-muted-foreground">{rp.count} times • Last: {new Date(rp.lastDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
                <p className={`text-sm font-bold ${rp.type === "income" ? "text-green-400" : "text-destructive"}`}>
                  {rp.type === "income" ? "+" : "-"}₹{rp.amount.toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Monthly bar chart */}
      <section className="px-6 mt-8">
        <h3 className="text-lg font-bold text-foreground mb-4">Monthly Overview</h3>
        <div className="glass-card rounded-xl p-4 h-52">
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="month" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                <YAxis stroke="hsl(215, 20%, 55%)" fontSize={10} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(224, 50%, 8%)", border: "1px solid hsl(224, 20%, 18%)", borderRadius: "8px", color: "white" }}
                />
                <Bar dataKey="income" fill="hsl(152, 69%, 53%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">No data yet</div>
          )}
        </div>
      </section>

      {/* Category pie */}
      <section className="px-6 mt-8">
        <h3 className="text-lg font-bold text-foreground mb-4">By Category</h3>
        <div className="glass-card rounded-xl p-4">
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" stroke="none">
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {pieData.slice(0, 5).map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground flex-1">{item.name}</span>
                    <span className="text-foreground font-medium">₹{item.value.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No expense data yet</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Analytics;
