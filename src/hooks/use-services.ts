import { useState, useEffect } from "react";
import { Service } from "@/types";
import { getServices } from "@/lib/services";

export function useServices(includeArchived = false) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    getServices(includeArchived).then((data) => {
      setServices(data);
      setLoading(false);
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [includeArchived]);

  return { services, loading, refresh };
}
