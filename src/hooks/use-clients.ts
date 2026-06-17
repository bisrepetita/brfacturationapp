import { useState, useEffect } from "react";
import { Client } from "@/types";
import { getClients } from "@/lib/clients";

export function useClients(includeArchived = false) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    getClients(includeArchived).then((data) => {
      setClients(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeArchived]);

  return { clients, loading, refresh };
}
