import { useState, useEffect } from "react";
import { Invoice } from "@/types";
import { getInvoices } from "@/lib/invoices";

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    getInvoices().then((data) => {
      setInvoices(data);
      setLoading(false);
    });
  };

  useEffect(() => { refresh(); }, []);

  return { invoices, loading, refresh };
}
