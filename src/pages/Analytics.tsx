import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
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

  // Combined all expenses from both sources
  const allExpenses = useMemo(() => [
    ...(transactions?.filter((t) => t.type === "expense").map((t) => ({
      amount: t.amount,
      date: t.transaction_date,
      catName: (t.categories as { name: string; icon: string } | null)?.name || "Uncategorized",
      catIcon: (t.categories as { name: string; icon: string } | null)?.icon || "help_outline",
    })) ?? []),
    ...(importedTransactions?.filter((t) => t.type === "expense").map((t) => ({
      amount: t.adjusted_amount,
      date: t.transaction_date,
      catName: (t.categories as { name: string; icon: string } | null)?.name || "Uncategorized",
      catIcon: (t.categories as { name: string; icon: string } | null)?.icon || "help_outline",
    })) ?? []),
  ], [transactions, importedTransactions]);

  const totalIncome = transactions?.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0) ?? 0;
  const totalExpenses = allExpenses.reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0;
  const totalTx = (transactions?.length ?? 0) + (importedTransactions?.length ?? 0);

  // Smart insights
  const insights = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

    const thisMonthExpenses = allExpenses.filter((t) => t.date.startsWith(thisMonth));
    const lastMonthExpenses = allExpenses.filter((t) => t.date.startsWith(lastMonthStr));

    const thisMonthTotal = thisMonthExpenses.reduce((s, t) => s + t.amount, 0);
    const lastMonthTotal = lastMonthExpenses.reduce((s, t) => s + t.amount, 0);

    const dayOfMonth = now.getDate();
    const dailyAvg = dayOfMonth > 0 ? thisMonthTotal / dayOfMonth : 0;

    const monthChange = lastMonthTotal > 0
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100)
      : 0;

    // Top category this month
    const catTotals = new Map<string, number>();
    thisMonthExpenses.forEach((t) => {
      catTotals.set(t.catName, (catTotals.get(t.catName) ?? 0) + t.amount);
    });
    const topCategory = Array.from(catTotals.entries()).sort((a, b) => b[1] - a[1])[0];

    // Biggest single expense this month
    const biggestExpense = thisMonthExpenses.length > 0
      ? thisMonthExpenses.reduce((max, t) => t.amount > max.amount ? t : max, thisMonthExpenses[0])
      : null;

    return {
      thisMonthTotal,
      lastMonthTotal,
      dailyAvg,
      monthChange,
      topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
      biggestExpense,
      thisMonthName: now.toLocaleString("en-IN", { month: "long" }),
      lastMonthName: lastMonth.toLocaleString("en-IN", { month: "long" }),
    };
  }, [allExpenses]);

  // Category breakdown with icons
  const categoryBreakdown = useMemo(() => {
    const catMap = new Map<string, { amount: number; icon: string }>();
    allExpenses.forEach((t) => {
      const entry = catMap.get(t.catName) ?? { amount: 0, icon: t.catIcon };
      entry.amount += t.amount;
      catMap.set(t.catName, entry);
    });
    const total = Array.from(catMap.values()).reduce((s, v) => s + v.amount, 0);
    return Array.from(catMap.entries())
      .map(([name, v]) => ({ name, amount: v.amount, icon: v.icon, percent: total > 0 ? (v.amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [allExpenses]);

  const pieData = categoryBreakdown.map(({ name, amount }) => ({ name, value: amount }));

  // Monthly data (include imported transactions)
  const barData = useMemo(() => {
    const monthlyMap = new Map<string, { income: number; expense: number }>();
    transactions?.forEach((t) => {
      const month = t.transaction_date.substring(0, 7);
      const entry = monthlyMap.get(month) ?? { income: 0, expense: 0 };
      if (t.type === "income") entry.income += t.amount;
      else entry.expense += t.amount;
      monthlyMap.set(month, entry);
    });
    importedTransactions?.forEach((t) => {
      const month = t.transaction_date.substring(0, 7);
      const entry = monthlyMap.get(month) ?? { income: 0, expense: 0 };
      if (t.type === "income") entry.income += t.adjusted_amount;
      else entry.expense += t.adjusted_amount;
      monthlyMap.set(month, entry);
    });
    return Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleString("en-IN", { month: "short" }),
        Income: data.income,
        Expenses: data.expense,
      }))
      .slice(-6);
  }, [transactions, importedTransactions]);

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

  return (
    <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col pb-24">
      <header className="pt-12 px-6">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {totalTx > 0 ? `Insights from ${totalTx} transactions` : "Your spending overview"}
        </p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 px-6 mt-6">
        <div className="glass-card rounded-xl p-3 text-center">
          <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center mx-auto mb-1">
            <span className="material-icons text-green-400 text-base">trending_up</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Income</p>
          <p className="text-base font-bold text-green-400 mt-0.5">₹{totalIncome.toLocaleString("en-IN")}</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center mx-auto mb-1">
            <span className="material-icons text-red-400 text-base">trending_down</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Expenses</p>
          <p className="text-base font-bold text-red-400 mt-0.5">₹{totalExpenses.toLocaleString("en-IN")}</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1 ${savingsRate >= 0 ? "bg-primary/15" : "bg-orange-500/15"}`}>
            <span className={`material-icons text-base ${savingsRate >= 0 ? "text-primary" : "text-orange-400"}`}>
              {savingsRate >= 20 ? "savings" : savingsRate >= 0 ? "account_balance_wallet" : "warning"}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Savings</p>
          <p className={`text-base font-bold mt-0.5 ${savingsRate >= 0 ? "text-primary" : "text-orange-400"}`}>{savingsRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Smart Insights */}
      {(insights.thisMonthTotal > 0 || insights.lastMonthTotal > 0) && (
        <section className="px-6 mt-6">
          <div className="glass-card rounded-xl p-4 space-y-3" style={{ boxShadow: "0 0 20px hsla(224, 90%, 55%, 0.1)" }}>
            {/* This month vs last month */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{insights.thisMonthName} spending</p>
                <p className="text-xl font-bold text-foreground">₹{insights.thisMonthTotal.toLocaleString("en-IN")}</p>
              </div>
              {insights.lastMonthTotal > 0 && (
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${insights.monthChange <= 0
                    ? "bg-green-500/15 text-green-400"
                    : "bg-red-500/15 text-red-400"
                  }`}>
                  <span className="material-icons text-sm">
                    {insights.monthChange <= 0 ? "arrow_downward" : "arrow_upward"}
                  </span>
                  {Math.abs(insights.monthChange).toFixed(0)}% vs {insights.lastMonthName}
                </div>
              )}
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
              <div className="flex items-center gap-2">
                <span className="material-icons text-primary text-lg">speed</span>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Daily Avg</p>
                  <p className="text-sm font-bold text-foreground">₹{Math.round(insights.dailyAvg).toLocaleString("en-IN")}</p>
                </div>
              </div>
              {insights.topCategory && (
                <div className="flex items-center gap-2">
                  <span className="material-icons text-orange-400 text-lg">local_fire_department</span>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Top Spend</p>
                    <p className="text-sm font-bold text-foreground truncate">{insights.topCategory.name}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Biggest expense callout */}
            {insights.biggestExpense && (
              <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-icons text-red-400 text-base">receipt_long</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase">Biggest Expense</p>
                  <p className="text-sm text-foreground truncate">
                    <span className="font-bold">₹{insights.biggestExpense.amount.toLocaleString("en-IN")}</span>
                    <span className="text-muted-foreground"> • {insights.biggestExpense.catName}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* OCR Accuracy Metrics */}
      {accuracyStats && (
        <section className="px-6 mt-6">
          <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <span className="material-icons text-primary text-xl">precision_manufacturing</span>
            AI Accuracy
          </h3>
          <div className="glass-card rounded-xl p-4">
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

      {/* Monthly bar chart */}
      <section className="px-6 mt-6">
        <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
          <span className="material-icons text-primary text-xl">bar_chart</span>
          Monthly Overview
        </h3>
        <p className="text-xs text-muted-foreground mb-3">Income vs expenses over the last few months</p>
        <div className="glass-card rounded-xl p-4 h-56">
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barGap={2}>
                <XAxis dataKey="month" stroke="hsl(215, 20%, 55%)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(215, 20%, 55%)" fontSize={10} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(224, 50%, 8%)", border: "1px solid hsl(224, 20%, 18%)", borderRadius: "10px", color: "white", fontSize: "12px" }}
                  formatter={(value: number, name: string) => [`₹${value.toLocaleString("en-IN")}`, name]}
                  cursor={{ fill: "hsla(224, 90%, 55%, 0.08)" }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px", color: "hsl(215, 20%, 55%)" }}
                />
                <Bar dataKey="Income" fill="hsl(152, 69%, 53%)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Expenses" fill="hsl(0, 72%, 51%)" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <span className="material-icons text-3xl mb-2">insert_chart_outlined</span>
              <p>No monthly data yet</p>
              <p className="text-xs mt-1">Add transactions to see trends</p>
            </div>
          )}
        </div>
      </section>

      {/* Category Breakdown */}
      <section className="px-6 mt-6">
        <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
          <span className="material-icons text-primary text-xl">donut_large</span>
          Where Your Money Goes
        </h3>
        <p className="text-xs text-muted-foreground mb-3">Breakdown of your spending by category</p>
        <div className="glass-card rounded-xl p-4">
          {categoryBreakdown.length > 0 ? (
            <>
              {/* Pie chart */}
              <div className="flex justify-center mb-5">
                <div className="w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none" paddingAngle={2}>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(224, 50%, 8%)", border: "1px solid hsl(224, 20%, 18%)", borderRadius: "8px", color: "white", fontSize: "12px" }}
                        formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Spent"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Category list with progress bars */}
              <div className="space-y-3">
                {categoryBreakdown.map((cat, i) => (
                  <div key={cat.name} className="relative">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${COLORS[i % COLORS.length]}20` }}>
                        <span className="material-icons text-base" style={{ color: COLORS[i % COLORS.length] }}>{cat.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">{cat.name}</span>
                          <span className="text-sm font-bold text-foreground">₹{cat.amount.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${cat.percent}%`, backgroundColor: COLORS[i % COLORS.length] }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">{cat.percent.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <span className="material-icons text-3xl mb-2 block">pie_chart</span>
              <p>No expense data yet</p>
              <p className="text-xs mt-1">Start adding transactions to see your breakdown</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Analytics;
