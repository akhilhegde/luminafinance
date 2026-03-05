import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsSupported("serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
  }, []);

  // Check current subscription status from DB
  useEffect(() => {
    if (!user) return;

    const checkSubscription = async () => {
      const { data } = await supabase
        .from("user_subscriptions" as any)
        .select("enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      setIsEnabled(!!(data as any)?.enabled);
      setLoading(false);
    };

    checkSubscription();
  }, [user]);

  const subscribe = useCallback(async () => {
    if (!user || !isSupported) return false;
    setLoading(true);

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notification permission denied");
        setLoading(false);
        return false;
      }

      // Get VAPID key from edge function
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke("get-vapid-key");
      if (vapidError || !vapidData?.publicKey) {
        toast.error("Failed to get push configuration");
        setLoading(false);
        return false;
      }

      // Convert VAPID key
      const vapidKey = urlBase64ToUint8Array(vapidData.publicKey);

      // Subscribe to push
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      const subJson = subscription.toJSON();

      // Store in database
      const { error } = await supabase
        .from("user_subscriptions" as any)
        .upsert(
          {
            user_id: user.id,
            subscription: subJson,
            enabled: true,
          } as any,
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("Failed to save subscription:", error);
        toast.error("Failed to save notification settings");
        setLoading(false);
        return false;
      }

      setIsEnabled(true);
      toast.success("Daily reminders enabled!");
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Push subscription error:", err);
      toast.error("Failed to enable notifications");
      setLoading(false);
      return false;
    }
  }, [user, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await (registration as any).pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      await supabase
        .from("user_subscriptions" as any)
        .update({ enabled: false } as any)
        .eq("user_id", user.id);

      setIsEnabled(false);
      toast.success("Daily reminders disabled");
    } catch (err) {
      console.error("Unsubscribe error:", err);
      toast.error("Failed to disable notifications");
    }

    setLoading(false);
  }, [user]);

  const toggle = useCallback(async () => {
    if (isEnabled) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  }, [isEnabled, subscribe, unsubscribe]);

  return { isSupported, isEnabled, loading, toggle };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
