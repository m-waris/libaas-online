"use client";

import { useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { formatCurrency } from "../../lib/format-currency";

export type OrderStatus =
  "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type OwnerOrder = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  notes: string | null;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  items: {
    name: string;
    size: string | null;
    color: string | null;
    quantity: number;
    price: number;
  }[];
};
const filters: ("all" | OrderStatus)[] = [
  "all",
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];
const labels: Record<"all" | OrderStatus, string> = {
  all: "All",
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const nextStatuses: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
};

function whatsappPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("0092")
    ? digits.slice(2)
    : digits.startsWith("0")
      ? `92${digits.slice(1)}`
      : digits;
  return /^\d{10,15}$/.test(normalized) ? normalized : null;
}

export function OrdersDashboard({
  initialOrders,
  storeName,
}: {
  initialOrders: OwnerOrder[];
  storeName: string;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const pendingCount = orders.filter(
    (order) => order.status === "pending",
  ).length;
  const visibleOrders = useMemo(
    () =>
      orders
        .filter((order) => filter === "all" || order.status === filter)
        .sort(
          (a, b) =>
            Number(b.status === "pending") - Number(a.status === "pending") ||
            Date.parse(b.created_at) - Date.parse(a.created_at),
        ),
    [orders, filter],
  );

  async function updateStatus(order: OwnerOrder, status: OrderStatus) {
    setBusyId(order.id);
    setMessage(null);
    const { data, error } = await createClient()
      .from("orders")
      .update({ status })
      .eq("id", order.id)
      .select("id, status")
      .maybeSingle();
    if (error || !data)
      setMessage("Order update nahi ho saka. Dobara try karein.");
    else
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? { ...item, status: data.status as OrderStatus }
            : item,
        ),
      );
    setBusyId(null);
  }

  return (
    <div className="owner-page">
      <header className="owner-page__intro">
        <p className="owner-page__eyebrow">Store management</p>
        <h1>Orders</h1>
        <p>New orders pehle dekhein aur status update karein.</p>
      </header>
      <section className="owner-stats">
        <div>
          <strong>{pendingCount}</strong>
          <span>New orders</span>
        </div>
        <div>
          <strong>{orders.length}</strong>
          <span>Total recent orders</span>
        </div>
      </section>
      <div
        className="owner-order-filters"
        role="group"
        aria-label="Filter orders"
      >
        {filters.map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={filter === item}
            onClick={() => setFilter(item)}
          >
            {labels[item]}
            {item === "pending" && pendingCount ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>
      {message && (
        <p className="owner-feedback" role="status">
          {message}
        </p>
      )}
      <div className="owner-orders">
        {visibleOrders.map((order) => {
          const phone = whatsappPhone(order.customer_phone);
          const text = `Salam ${order.customer_name}, ${storeName} order #${order.id.slice(0, 8)} ke hawale se rabta kar rahe hain. Aap ki order details: ${formatCurrency(order.total_amount)}. Kya aap confirm karte hain?`;
          return (
            <article className="owner-order" key={order.id}>
              <div className="owner-order__top">
                <div>
                  <p className="owner-page__eyebrow">
                    Order #{order.id.slice(0, 8)}
                  </p>
                  <h2>{order.customer_name}</h2>
                  <p>{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="owner-order__amount">
                  <strong>{formatCurrency(order.total_amount)}</strong>
                  <span
                    className={`owner-status ${order.status === "pending" ? "is-active" : ""}`}
                  >
                    {labels[order.status]}
                  </span>
                </div>
              </div>
              <details className="owner-order__details">
                <summary>Order details · {order.items.length} items</summary>
                <div className="owner-order__body">
                  <p>
                    <strong>Phone:</strong> {order.customer_phone}
                  </p>
                  <p>
                    <strong>Address:</strong> {order.customer_address}
                  </p>
                  {order.notes && (
                    <p>
                      <strong>Notes:</strong> {order.notes}
                    </p>
                  )}
                  <ul>
                    {order.items.map((item, index) => (
                      <li key={`${order.id}-${index}`}>
                        {item.name}
                        {item.size ? ` · ${item.size}` : ""}
                        {item.color ? ` · ${item.color}` : ""} × {item.quantity}{" "}
                        — {formatCurrency(item.price * item.quantity)}
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
              <div className="owner-order__actions">
                {phone ? (
                  <a
                    className="owner-action"
                    href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Message customer on WhatsApp
                  </a>
                ) : (
                  <span className="owner-order__hint">
                    Phone number WhatsApp format mein nahi hai.
                  </span>
                )}
                {(nextStatuses[order.status] ?? []).map((status) => (
                  <button
                    className={
                      status === "cancelled"
                        ? "owner-action is-quiet"
                        : "owner-action is-primary"
                    }
                    type="button"
                    key={status}
                    disabled={busyId === order.id}
                    onClick={() => void updateStatus(order, status)}
                  >
                    {busyId === order.id
                      ? "Saving…"
                      : status === "confirmed"
                        ? "Confirm karein"
                        : status === "shipped"
                          ? "Mark shipped"
                          : status === "delivered"
                            ? "Mark delivered"
                            : "Cancel order"}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
        {visibleOrders.length === 0 && (
          <p className="owner-empty">Is filter mein orders nahi hain.</p>
        )}
      </div>
    </div>
  );
}
