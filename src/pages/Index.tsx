import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import SpendingRing from "@/components/SpendingRing";
import TransactionCard from "@/components/TransactionCard";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isEnabled, toggle: togglePush, loading: pushLoading } = usePushNotifications();
  const [bellAnimating, setBellAnimating] = useState(false);

  const handleNotificationClick = async () => {
    setBellAnimating(true);
    setTimeout(() => setBellAnimating(false), 600);
    await togglePush();
  };

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*, categories(name, icon)")
        .eq("user_id", user!.id)
        .order("transaction_date", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: importedTransactions } = useQuery({
    queryKey: ["imported-transactions-home", user?.id],
    queryFn: async () => {
      // Only show imported transactions from non-complete imports to avoid duplicates
      const { data: activeImports } = await supabase
        .from("statement_imports")
        .select("id")
        .eq("user_id", user!.id)
        .neq("status", "complete");

      const activeImportIds = activeImports?.map((i) => i.id) ?? [];
      if (activeImportIds.length === 0) return [];

      const { data } = await supabase
        .from("imported_transactions")
        .select("*, categories(name, icon)")
        .eq("user_id", user!.id)
        .eq("is_ignored", false)
        .in("import_id", activeImportIds)
        .order("transaction_date", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: accounts } = useQuery({
    queryKey: ["accounts", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("accounts").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const totalBalance = accounts?.reduce((sum, a) => sum + (a.balance || 0), 0) ?? 0;

  // Merge transactions + imported transactions into one feed
  const allActivity = [
    ...(transactions?.map((t) => {
      const cat = t.categories as { name: string; icon: string } | null;
      return {
        id: t.id,
        icon: cat?.icon || "receipt",
        title: t.description || cat?.name || "Transaction",
        subtitle: `${cat?.name || "Uncategorized"} • ${new Date(t.transaction_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
        amount: t.amount,
        type: t.type as "income" | "expense",
        note: (t as any).notes,
        date: t.transaction_date,
      };
    }) ?? []),
    ...(importedTransactions?.map((t) => {
      const cat = t.categories as { name: string; icon: string } | null;
      return {
        id: t.id,
        icon: cat?.icon || "image",
        title: t.payee || cat?.name || "Transaction",
        subtitle: `${cat?.name || "Uncategorized"} • ${new Date(t.transaction_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
        amount: t.adjusted_amount,
        type: t.type as "income" | "expense",
        note: t.notes,
        date: t.transaction_date,
      };
    }) ?? []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30);

  // Today's spending (include both manual and imported transactions)
  const today = new Date().toISOString().split("T")[0];
  const todayManualSpent = transactions
    ?.filter((t) => t.transaction_date === today && t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0) ?? 0;
  const todayImportedSpent = importedTransactions
    ?.filter((t) => t.transaction_date === today && t.type === "expense" && !t.is_ignored)
    .reduce((sum, t) => sum + t.adjusted_amount, 0) ?? 0;
  const todaySpent = todayManualSpent + todayImportedSpent;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "User";

  return (
    <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col pb-24">
      {/* Header */}
      <header className="pt-12 px-6 flex justify-between items-center">
        <div>
          <p className="text-muted-foreground text-sm font-medium tracking-wide">{greeting()},</p>
          <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
        </div>
        <button
          onClick={handleNotificationClick}
          disabled={pushLoading}
          className={`p-2 rounded-full glass-card hover:bg-accent/50 transition-all ${bellAnimating ? "animate-[bell-ring_0.6s_ease-in-out]" : ""}`}
        >
          <span className={`material-icons ${isEnabled ? "text-primary" : "text-foreground"}`}>
            {isEnabled ? "notifications_active" : "notifications"}
          </span>
        </button>
      </header>

      {/* Balance */}
      <section className="mt-8 px-6 text-center">
        <p className="text-sm font-medium text-primary/80 uppercase tracking-widest mb-1">Total Balance</p>
        <div className="relative inline-block">
          <div className="absolute inset-0 blur-xl bg-primary/30 rounded-full" />
          <h2 className="relative text-5xl font-extrabold text-foreground" style={{ textShadow: "0 0 15px hsla(224, 90%, 55%, 0.6)" }}>
            <span className="text-3xl align-top opacity-80">₹</span>
            {Math.floor(totalBalance).toLocaleString("en-IN")}
            <span className="text-2xl opacity-60">.{totalBalance.toFixed(2).split(".")[1]}</span>
          </h2>
        </div>
      </section>

      {/* Spending Ring */}
      <SpendingRing spent={todaySpent} budget={profile?.daily_budget ?? 2000} streak={profile?.current_streak ?? 0} />

      {/* Action Banners */}
      <section className="mt-6 px-6 space-y-3">
        <button
          onClick={() => navigate("/receipt-scan")}
          className="w-full glass-card rounded-2xl p-4 flex items-center gap-4 text-left hover:bg-accent/30 transition-colors"
          style={{ boxShadow: "0 0 15px hsla(152, 69%, 53%, 0.3), 0 0 30px hsla(152, 69%, 53%, 0.15)" }}
        >
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <span className="material-icons text-green-400 text-xl">document_scanner</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-foreground">Scan Receipt</p>
            <p className="text-xs text-muted-foreground">Point camera at any receipt</p>
          </div>
          <span className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm font-semibold">
            Scan →
          </span>
        </button>
        <button
          onClick={() => navigate("/statement-upload")}
          className="w-full glass-card rounded-2xl p-4 flex items-center gap-4 text-left hover:bg-accent/30 transition-colors"
          style={{ boxShadow: "0 0 15px hsla(224, 90%, 55%, 0.4), 0 0 30px hsla(224, 90%, 55%, 0.2)" }}
        >
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="material-icons text-primary text-xl">upload_file</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-foreground">Import Statement</p>
            <p className="text-xs text-muted-foreground">Analyze your spending patterns</p>
          </div>
          <span className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            Analyze →
          </span>
        </button>
      </section>

      {/* Recent Imports */}
      {/* Recent Transactions */}
      <section className="mt-6 flex-1 px-6 overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-foreground">Recent Activity</h3>
        </div>
        <div className="overflow-y-auto pb-6 space-y-3 no-scrollbar flex-1 pr-1">
          {allActivity.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <span className="material-icons text-4xl mb-2 block">receipt_long</span>
              <p>No transactions yet</p>
              <p className="text-sm mt-1">Tap + to add your first one</p>
            </div>
          )}
          {allActivity.map((t) => (
            <TransactionCard
              key={t.id}
              icon={t.icon}
              title={t.title}
              subtitle={t.subtitle}
              amount={t.amount}
              type={t.type}
              note={t.note}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Index;
