import { useState } from "react";
import { openInvoicePdf, type InvoicePdfFormat } from "../api/invoices";
import Button from "./ui/Button";

/** Boutons « Facture A4 » / « Ticket » (+ « Reçu » si payée) qui ouvrent le PDF correspondant. */
export default function InvoiceActions({
  invoiceId,
  paid = false,
  className = "",
}: {
  invoiceId: string;
  /** Affiche le bouton « Reçu » de paiement (uniquement pour une facture réglée). */
  paid?: boolean;
  className?: string;
}) {
  const [busy, setBusy] = useState<InvoicePdfFormat | null>(null);

  async function open(format: InvoicePdfFormat) {
    setBusy(format);
    try {
      await openInvoicePdf(invoiceId, format);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="secondary"
        size="sm"
        icon={<A4Icon />}
        loading={busy === "a4"}
        disabled={busy !== null}
        onClick={() => open("a4")}
      >
        Facture A4
      </Button>
      <Button
        variant="secondary"
        size="sm"
        icon={<TicketIcon />}
        loading={busy === "receipt"}
        disabled={busy !== null}
        onClick={() => open("receipt")}
      >
        Ticket
      </Button>
      {paid && (
        <Button
          variant="secondary"
          size="sm"
          icon={<PaymentIcon />}
          loading={busy === "payment"}
          disabled={busy !== null}
          onClick={() => open("payment")}
        >
          Reçu
        </Button>
      )}
    </div>
  );
}

const A4Icon = () => (
  <svg
    className="h-[15px] w-[15px]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h4" />
  </svg>
);

const TicketIcon = () => (
  <svg
    className="h-[15px] w-[15px]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 2h12v20l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3L6 22z" />
    <path d="M9 7h6M9 11h6M9 15h4" />
  </svg>
);

const PaymentIcon = () => (
  <svg
    className="h-[15px] w-[15px]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" />
  </svg>
);
