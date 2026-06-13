import { useEffect, useState, type FormEvent } from "react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import {
  createProduct,
  updateProduct,
  type Product,
  type ProductInput,
} from "../../api/products";
import type { Category } from "../../api/categories";
import type { Supplier } from "../../api/suppliers";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  product: Product | null;
  categories: Category[];
  suppliers: Supplier[];
}

interface FormState {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  price: string;
  costPrice: string;
  stock: string;
  alertThreshold: string;
  unit: string;
  categoryId: string;
  supplierId: string;
}

function toForm(p: Product | null): FormState {
  return {
    name: p?.name ?? "",
    sku: p?.sku ?? "",
    barcode: p?.barcode ?? "",
    description: p?.description ?? "",
    price: p?.price ?? "",
    costPrice: p?.costPrice ?? "",
    stock: p ? String(p.stock) : "0",
    alertThreshold: p ? String(p.alertThreshold) : "5",
    unit: p?.unit ?? "pièce",
    categoryId: p?.categoryId ?? "",
    supplierId: p?.supplierId ?? "",
  };
}

export default function ProductFormModal({
  open,
  onClose,
  onSaved,
  product,
  categories,
  suppliers,
}: Props) {
  const [form, setForm] = useState<FormState>(toForm(product));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(product);

  // Réinitialise le formulaire à chaque ouverture / changement de produit.
  useEffect(() => {
    if (open) {
      setForm(toForm(product));
      setError(null);
    }
  }, [open, product]);

  const set = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError("Le nom est obligatoire.");
    if (!form.categoryId) return setError("La catégorie est obligatoire.");
    const price = Number(form.price);
    if (Number.isNaN(price) || price < 0)
      return setError("Prix de vente invalide.");

    const payload: ProductInput = {
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
      description: form.description.trim() || undefined,
      price,
      costPrice: form.costPrice ? Number(form.costPrice) : undefined,
      stock: Number(form.stock) || 0,
      alertThreshold: Number(form.alertThreshold) || 0,
      unit: form.unit.trim() || undefined,
      categoryId: form.categoryId,
      supplierId: form.supplierId || undefined,
    };

    setSaving(true);
    try {
      if (product) await updateProduct(product.id, payload);
      else await createProduct(payload);
      onSaved();
      onClose();
    } catch (err: unknown) {
      const message = (
        err as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(", ")
          : (message ?? "Échec de l'enregistrement."),
      );
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={saving}>
        Annuler
      </Button>
      <Button type="submit" form="product-form" loading={saving}>
        {isEdit ? "Enregistrer" : "Ajouter le produit"}
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Modifier le produit" : "Ajouter un produit"}
      size="lg"
      footer={footer}
    >
      <form
        id="product-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
          >
            {error}
          </div>
        )}

        <Input
          label="Nom du produit *"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Ex. Ballon de foot Ligue 1"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="SKU"
            value={form.sku}
            onChange={(e) => set("sku", e.target.value)}
            placeholder="BAL-L1-T5"
          />
          <Input
            label="Code-barres"
            value={form.barcode}
            onChange={(e) => set("barcode", e.target.value)}
            placeholder="3 600 010 000 048"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Catégorie *"
            value={form.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
          >
            <option value="">Sélectionner…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            label="Fournisseur"
            value={form.supplierId}
            onChange={(e) => set("supplierId", e.target.value)}
          >
            <option value="">Aucun</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Prix de vente (€) *"
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            placeholder="29.99"
          />
          <Input
            label="Prix d'achat (€)"
            type="number"
            step="0.01"
            min="0"
            value={form.costPrice}
            onChange={(e) => set("costPrice", e.target.value)}
            placeholder="14.00"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Stock"
            type="number"
            min="0"
            value={form.stock}
            onChange={(e) => set("stock", e.target.value)}
          />
          <Input
            label="Seuil d'alerte"
            type="number"
            min="0"
            value={form.alertThreshold}
            onChange={(e) => set("alertThreshold", e.target.value)}
          />
          <Input
            label="Unité"
            value={form.unit}
            onChange={(e) => set("unit", e.target.value)}
            placeholder="pièce"
          />
        </div>

        <div>
          <label
            htmlFor="p-desc"
            className="mb-1.5 block text-[13px] font-semibold text-ink-soft"
          >
            Description
          </label>
          <textarea
            id="p-desc"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            placeholder="Format, conditionnement, notes internes…"
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-[15px] text-ink outline-none transition placeholder:text-ink-faint hover:border-border-strong focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15"
          />
        </div>
      </form>
    </Modal>
  );
}
