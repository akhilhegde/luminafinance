import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import TrophyRoom from "@/components/TrophyRoom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const XP_LEVELS = [
  { level: 1, min: 0, max: 500, name: "Beginner" },
  { level: 2, min: 501, max: 1000, name: "Explorer" },
  { level: 3, min: 1001, max: 2000, name: "Pro Member" },
  { level: 4, min: 2001, max: 5000, name: "Expert" },
  { level: 5, min: 5001, max: Infinity, name: "Legend" },
];

function getLevel(xp: number) {
  return XP_LEVELS.find((l) => xp >= l.min && xp <= l.max) ?? XP_LEVELS[0];
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dailyBudget, setDailyBudget] = useState("");
  const [clearing, setClearing] = useState(false);
  const { isSupported, isEnabled, loading: pushLoading, toggle: togglePush } = usePushNotifications();

  // Settings sheet state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsName, setSettingsName] = useState("");
  const [settingsBio, setSettingsBio] = useState("");
  const [settingsAvatar, setSettingsAvatar] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Detect if app is installed as PWA
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    setIsInstalled(!!isStandalone);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setDailyBudget(String(profile.daily_budget));
    }
  }, [profile]);

  // Populate settings sheet fields when opened
  useEffect(() => {
    if (settingsOpen && profile) {
      setSettingsName(profile.display_name || "");
      setSettingsBio((profile as any).bio || "");
      setSettingsAvatar((profile as any).avatar_url || null);
    }
  }, [settingsOpen, profile]);

  const handleSaveBudget = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          daily_budget: parseFloat(dailyBudget) || 2000,
        },
        { onConflict: "user_id" }
      );
    if (error) toast.error("Failed to save");
    else {
      toast.success("Budget updated!");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      // Try to delete from storage
      const { error } = await supabase.storage
        .from("avatars")
        .remove([`${user.id}/avatar.jpg`, `${user.id}/avatar.png`, `${user.id}/avatar.jpeg`, `${user.id}/avatar.webp`]);

      // Clear avatar_url in profile
      await supabase
        .from("profiles")
        .update({ avatar_url: null } as any)
        .eq("user_id", user.id);

      setSettingsAvatar(null);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile photo removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove avatar");
    }
    setUploadingAvatar(false);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Add cache-busting timestamp
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setSettingsAvatar(publicUrl);
      toast.success("Avatar uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar");
    }
    setUploadingAvatar(false);
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setSavingSettings(true);
    try {
      const updateData: any = {
        user_id: user.id,
        display_name: settingsName,
        bio: settingsBio,
      };
      if (settingsAvatar) {
        updateData.avatar_url = settingsAvatar;
      }

      const { error } = await supabase
        .from("profiles")
        .upsert(updateData, { onConflict: "user_id" });

      if (error) throw error;

      toast.success("Profile updated!");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setSettingsOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    }
    setSavingSettings(false);
  };

  const handleClearData = async () => {
    if (!user) return;
    setClearing(true);
    try {
      await supabase.from("split_items").delete().eq("user_id", user.id);
      await supabase.from("imported_transactions").delete().eq("user_id", user.id);
      await supabase.from("transactions").delete().eq("user_id", user.id);
      await supabase.from("mapping_rules").delete().eq("user_id", user.id);
      await supabase.from("statement_imports").delete().eq("user_id", user.id);
      await supabase.from("accounts").update({ balance: 0 }).eq("user_id", user.id);

      queryClient.invalidateQueries();
      toast.success("All data cleared successfully");
      navigate("/");
    } catch {
      toast.error("Failed to clear data");
    }
    setClearing(false);
  };

  const totalXP = profile?.total_xp ?? 0;
  const currentLevel = getLevel(totalXP);
  const xpInLevel = totalXP - currentLevel.min;
  const levelRange = currentLevel.max === Infinity ? 5000 : currentLevel.max - currentLevel.min;
  const xpProgress = Math.min((xpInLevel / levelRange) * 100, 100);

  const avatarUrl = (profile as any)?.avatar_url;
  const bio = (profile as any)?.bio;

  return (
    <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col pb-24">
      <header className="pt-12 px-6 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-1">
          <span className="material-icons text-foreground">arrow_back</span>
        </button>
        <button onClick={() => setSettingsOpen(true)} className="p-1">
          <span className="material-icons text-muted-foreground">settings</span>
        </button>
      </header>

      {/* Avatar */}
      <div className="flex justify-center mt-6">
        <div className="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center shadow-neon overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="material-icons text-primary text-4xl">person</span>
          )}
        </div>
      </div>
      <p className="text-center text-foreground font-bold text-lg mt-3">
        {profile?.display_name || user?.email?.split("@")[0]}
      </p>

      {/* Bio */}
      {bio && (
        <p className="text-center text-muted-foreground text-sm mt-1 px-8 line-clamp-2">{bio}</p>
      )}

      {/* Level Badge */}
      <p className="text-center text-muted-foreground text-sm mt-1">{currentLevel.name}</p>

      {/* Current Streak */}
      <div className="flex justify-center mt-4">
        <div className="glass-card rounded-full px-5 py-2 flex items-center gap-2" style={{
          border: "1px solid hsla(195, 100%, 50%, 0.2)",
          boxShadow: "0 0 12px hsla(195, 100%, 50%, 0.1)",
        }}>
          <span
            className="material-icons animate-flame-pulse"
            style={{
              fontSize: "22px",
              background: "linear-gradient(180deg, #FF6D00 0%, #FF9100 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 6px hsla(30, 100%, 50%, 0.5))",
            }}
          >
            local_fire_department
          </span>
          <span className="text-foreground font-bold text-lg">{profile?.current_streak ?? 0}</span>
          <span className="text-muted-foreground text-xs">day streak</span>
        </div>
      </div>

      {/* XP Progress */}
      <div className="px-8 mt-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>Level {currentLevel.level}</span>
          <span>{totalXP} XP</span>
        </div>
        <div className="w-full h-2 rounded-full bg-secondary/80 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${xpProgress}%`,
              background: "linear-gradient(90deg, #2979FF 0%, #00E5FF 100%)",
              boxShadow: "0 0 10px hsla(195, 100%, 50%, 0.4)",
            }}
          />
        </div>
      </div>

      {/* Trophy Room */}
      <div className="px-6 mt-8">
        <TrophyRoom
          totalStatementsAnalyzed={profile?.total_statements_analyzed ?? 0}
          totalBillsSplit={profile?.total_bills_split ?? 0}
          currentStreak={profile?.current_streak ?? 0}
          unlockedTrophies={profile?.unlocked_trophies ?? []}
        />
      </div>

      {/* Quick Settings */}
      <div className="px-6 mt-8 space-y-5">
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div>
            <Label className="text-muted-foreground text-sm">Daily Budget (₹)</Label>
            <Input
              type="number"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              className="mt-1 bg-secondary/50 border-border text-foreground"
            />
          </div>
          <Button onClick={handleSaveBudget} className="w-full shadow-neon font-bold">
            Save Budget
          </Button>
        </div>

        {/* Install App Banner - shown only when not installed */}
        {!isInstalled && (
          <div className="glass-card rounded-xl p-5 space-y-2 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="material-icons text-primary text-xl">install_mobile</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">Install Lumina</p>
                <p className="text-xs text-muted-foreground">
                  {isIOS
                    ? "Tap the Share icon ↗ then 'Add to Home Screen'"
                    : "Install from browser menu for the best experience"}
                </p>
              </div>
            </div>
            {isIOS && (
              <div className="flex items-center gap-2 text-xs text-primary pl-[52px]">
                <span className="material-icons text-sm">info</span>
                Required for daily push notifications on iOS
              </div>
            )}
          </div>
        )}

      </div>

      {/* Settings Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="bottom" className="bg-background border-t border-border rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-foreground">Profile Settings</SheetTitle>
            <SheetDescription>Update your profile information</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-1">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="relative w-24 h-24 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center overflow-hidden group transition-all hover:border-primary/60"
              >
                {settingsAvatar ? (
                  <img src={settingsAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-icons text-primary text-4xl">person</span>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-icons text-white text-2xl">
                    {uploadingAvatar ? "hourglass_empty" : "camera_alt"}
                  </span>
                </div>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                }}
              />
              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground">Tap to change avatar</p>
                {settingsAvatar && (
                  <button
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    className="text-xs text-destructive hover:text-destructive/80 transition-colors"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>

            {/* Display Name */}
            <div>
              <Label className="text-muted-foreground text-sm">Display Name</Label>
              <Input
                value={settingsName}
                onChange={(e) => setSettingsName(e.target.value)}
                placeholder="Enter your name"
                className="mt-1 bg-secondary/50 border-border text-foreground"
              />
            </div>

            {/* Bio */}
            <div>
              <Label className="text-muted-foreground text-sm">Bio</Label>
              <Textarea
                value={settingsBio}
                onChange={(e) => setSettingsBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
                maxLength={200}
                className="mt-1 bg-secondary/50 border-border text-foreground resize-none"
              />
              <p className="text-xs text-muted-foreground text-right mt-1">{settingsBio.length}/200</p>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="w-full h-12 font-bold shadow-neon rounded-xl"
            >
              {savingSettings ? "Saving..." : "Save Changes"}
            </Button>

            {/* Divider */}
            <div className="border-t border-border/30 pt-4 mt-2 space-y-3">
              <Button variant="outline" onClick={signOut} className="w-full border-destructive/30 text-destructive hover:bg-destructive/10">
                <span className="material-icons text-sm mr-2">logout</span>
                Sign Out
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full" disabled={clearing}>
                    <span className="material-icons text-sm mr-2">delete_forever</span>
                    {clearing ? "Clearing..." : "Clear My Data"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your uploaded statements, transactions, and categorization rules. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, Clear Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Profile;
