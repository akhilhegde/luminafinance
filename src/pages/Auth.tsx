import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import AmbientBackground from "@/components/AmbientBackground";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        navigate("/");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || email.split("@")[0] },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Check your email to confirm your account!");
      }
    }
    setLoading(false);
  };

  return (
    <div className="bg-deep-sea min-h-screen relative overflow-hidden flex items-center justify-center px-6">
      <AmbientBackground />
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">
            Lum<span className="text-primary">i</span>na
          </h1>
          <p className="text-muted-foreground text-sm mt-2">Your personal finance companion</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 space-y-5">
          <h2 className="text-xl font-bold text-foreground text-center">
            {isLogin ? "Welcome back" : "Create account"}
          </h2>

          {!isLogin && (
            <div>
              <Label className="text-muted-foreground text-sm">Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Morgan"
                className="mt-1 bg-secondary/50 border-border text-foreground"
              />
            </div>
          )}

          <div>
            <Label className="text-muted-foreground text-sm">Email</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 bg-secondary/50 border-border text-foreground"
            />
          </div>

          <div>
            <Label className="text-muted-foreground text-sm">Password</Label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 bg-secondary/50 border-border text-foreground"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 text-base font-bold shadow-neon">
            {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary font-semibold hover:underline">
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Auth;
