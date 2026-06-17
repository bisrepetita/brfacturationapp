import { useState, useEffect } from "react";
import { BillingSettings, EmailSettings } from "@/types";
import { getBillingSettings, getEmailSettings } from "@/lib/settings";

export function useBillingSettings() {
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBillingSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  return { settings, setSettings, loading };
}

export function useEmailSettings() {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEmailSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  return { settings, setSettings, loading };
}
