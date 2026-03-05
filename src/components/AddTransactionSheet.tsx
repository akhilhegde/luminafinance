import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddTransactionSheet = ({ open, onOpenChange }: AddTransactionSheetProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string; type: string }[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    const fetchData = async () => {
      const [catRes, accRes] = await Promise.all([
        supabase.from("categories").select("id, name, icon, type"),
        supabase.from("accounts").select("id, name").eq("user_id", user.id),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (accRes.data) {
        setAccounts(accRes.data);
        if (accRes.data.length > 0 && !accountId) setAccountId(accRes.data[0].id);
      }
    };
    fetchData();
  }, [open, user]);

  const handleSubmit = async () => {
    if (!user || !amount || !accountId) return;
    setLoading(true);
    const numAmount = parseFloat(amount);

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      account_id: accountId,
      category_id: categoryId || null,
      amount: numAmount,
      type,
      description: description || null,
      transaction_date: new Date().toISOString().split("T")[0],
    });

    if (error) {
      toast.error("Failed to add transaction");
    } else {
      // Update account balance
      const balanceChange = type === "income" ? numAmount : -numAmount;
      const { data: acc } = await supabase.from("accounts").select("balance").eq("id", accountId).single();
      if (acc) {
        await supabase.from("accounts").update({ balance: acc.balance + balanceChange }).eq("id", accountId);
      }

      toast.success("Transaction added!");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setAmount("");
      setDescription("");
      setCategoryId("");
      onOpenChange(false);
    }
    setLoading(false);
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-deep-sea border-border/30 rounded-t-2xl h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-foreground text-xl">Add Transaction</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Type toggle */}
          <div className="flex gap-2">
            <Button
              variant={type === "expense" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setType("expense")}
            >
              Expense
            </Button>
            <Button
              variant={type === "income" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setType("income")}
            >
              Income
            </Button>
          </div>

          {/* Amount */}
          <div>
            <Label className="text-muted-foreground">Amount (₹)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 bg-secondary/50 border-border text-foreground text-2xl font-bold h-14"
            />
          </div>

          {/* Category */}
          <div>
            <Label className="text-muted-foreground">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="mt-1 bg-secondary/50 border-border text-foreground">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {filteredCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <span className="material-icons text-sm">{cat.icon}</span>
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account */}
          <div>
            <Label className="text-muted-foreground">Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="mt-1 bg-secondary/50 border-border text-foreground">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label className="text-muted-foreground">Description</Label>
            <Input
              placeholder="What was this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 bg-secondary/50 border-border text-foreground"
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading || !amount || !accountId} className="w-full h-12 text-base font-bold shadow-neon">
            {loading ? "Adding..." : "Add Transaction"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddTransactionSheet;
