"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClients } from "@/hooks/use-clients";
import { createClient, updateClient, archiveClient, unarchiveClient } from "@/lib/clients";
import { Client } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyStatePremium } from "@/components/ui/empty-state-premium";
import { ClientForm } from "@/components/ui/client-form";
import { Users, Plus, Search, Archive, Pencil, ArchiveRestore, X, FileSpreadsheet } from "lucide-react";
import { exportClientsCSV } from "@/lib/export";

type Modal =
  | { type: "create" }
  | { type: "edit"; client: Client }
  | { type: "archive"; client: Client }
  | null;

export default function ClientsPage() {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const { clients, loading, refresh } = useClients(showArchived);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Modal>(null);

  const filtered = clients.filter((c) =>
    c.displayName.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.clientCode.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data: Parameters<typeof createClient>[0]) => {
    await createClient(data);
    refresh();
    setModal(null);
  };

  const handleEdit = async (data: Parameters<typeof createClient>[0]) => {
    if (modal?.type !== "edit") return;
    await updateClient(modal.client.id, data);
    refresh();
    setModal(null);
  };

  const handleArchive = async (client: Client) => {
    if (client.archivedAt) {
      await unarchiveClient(client.id);
    } else {
      await archiveClient(client.id);
    }
    refresh();
    setModal(null);
  };

  return (
    <main className="p-4 md:p-8 max-w-2xl mx-auto">
      <PageHeader
        title="Clients"
        subtitle={`${clients.filter((c) => !c.archivedAt).length} client${clients.filter((c) => !c.archivedAt).length !== 1 ? "s" : ""}`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportClientsCSV(filtered)}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 h-10 px-3 rounded-[8px] text-[13px] font-medium border disabled:opacity-40"
              style={{ borderColor: "#E5E1DA", color: "#7A7570", backgroundColor: "transparent" }}
              title="Exporter en Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Exporter</span>
            </button>
            <button
              onClick={() => setModal({ type: "create" })}
              className="flex items-center gap-2 h-10 px-4 rounded-[8px] text-[13px] font-medium text-white"
              style={{ backgroundColor: "#1A1A18" }}
            >
              <Plus className="w-4 h-4" />
              Nouveau
            </button>
          </div>
        }
      />

      {/* Recherche */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#A09890" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client…"
          className="w-full h-12 pl-10 pr-4 rounded-[8px] border text-[14px] outline-none"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E1DA", color: "#1A1A18" }}
          onFocus={(e) => (e.target.style.borderColor = "#1A1A18")}
          onBlur={(e) => (e.target.style.borderColor = "#E5E1DA")}
        />
      </div>

      {/* Toggle archivés */}
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="flex items-center gap-1.5 text-[13px] transition-colors"
          style={{ color: showArchived ? "#1A1A18" : "#A09890" }}
        >
          <Archive className="w-3.5 h-3.5" />
          {showArchived ? "Masquer les archivés" : "Afficher les archivés"}
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-[10px] border animate-pulse" style={{ borderColor: "#E5E1DA", backgroundColor: "#F0EDE8" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyStatePremium
          icon={Users}
          title={search ? "Aucun résultat" : "Aucun client"}
          description={search ? `Aucun client ne correspond à "${search}".` : "Ajoutez votre premier client pour commencer à facturer."}
          action={
            !search ? (
              <button
                onClick={() => setModal({ type: "create" })}
                className="flex items-center gap-2 h-10 px-4 rounded-[8px] text-[14px] font-medium text-white"
                style={{ backgroundColor: "#1A1A18" }}
              >
                <Plus className="w-4 h-4" />
                Nouveau client
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => router.push(`/clients/${client.id}`)}
              onEdit={() => setModal({ type: "edit", client })}
              onArchive={() => handleArchive(client)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ModalWrapper onClose={() => setModal(null)}>
          {modal.type === "create" && (
            <>
              <ModalHeader title="Nouveau client" onClose={() => setModal(null)} />
              <ClientForm onSubmit={handleCreate} onCancel={() => setModal(null)} submitLabel="Créer le client" />
            </>
          )}
          {modal.type === "edit" && (
            <>
              <ModalHeader title="Modifier le client" onClose={() => setModal(null)} />
              <ClientForm initial={modal.client} onSubmit={handleEdit} onCancel={() => setModal(null)} submitLabel="Enregistrer" />
            </>
          )}
        </ModalWrapper>
      )}
    </main>
  );
}

function ClientCard({
  client,
  onClick,
  onEdit,
  onArchive,
}: {
  client: Client;
  onClick: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const isArchived = !!client.archivedAt;

  return (
    <div
      className="rounded-[10px] border flex items-center gap-3 overflow-hidden"
      style={{
        borderColor: "#E5E1DA",
        backgroundColor: isArchived ? "#F9F8F6" : "#FFFFFF",
        opacity: isArchived ? 0.7 : 1,
      }}
    >
      {/* Zone cliquable principale */}
      <button
        onClick={onClick}
        className="flex items-center gap-3 flex-1 min-w-0 p-4 text-left transition-colors"
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F9F8F6")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[13px] font-semibold"
          style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}
        >
          {client.displayName.substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium truncate" style={{ color: "#1A1A18" }}>
              {client.displayName}
            </span>
            {isArchived && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-[4px] font-semibold uppercase tracking-wide shrink-0" style={{ backgroundColor: "#E5E1DA", color: "#7A7570" }}>
                Archivé
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[12px] font-mono" style={{ color: "#A09890" }}>{client.clientCode}</span>
            <span style={{ color: "#E5E1DA" }}>·</span>
            <span className="text-[13px] truncate" style={{ color: "#7A7570" }}>{client.email}</span>
          </div>
        </div>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1 pr-3 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="Modifier le client"
          className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-colors"
          style={{ color: "#7A7570" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F0EDE8")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onArchive(); }}
          title={isArchived ? "Désarchiver le client" : "Archiver le client"}
          className="w-9 h-9 flex items-center justify-center rounded-[8px] transition-colors"
          style={{ color: "#7A7570" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F0EDE8")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function ModalWrapper({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full md:max-w-lg rounded-t-[20px] md:rounded-[16px] p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-[18px] font-semibold" style={{ color: "#1A1A18" }}>{title}</h2>
      <button
        onClick={onClose}
        className="w-8 h-8 flex items-center justify-center rounded-full"
        style={{ backgroundColor: "#F0EDE8", color: "#7A7570" }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
