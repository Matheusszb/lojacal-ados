"use client";

import { Plus, Trash2 } from "lucide-react";
import "./variant-editor.css";

export type VariantInput = {
  id?: string;
  sku?: string;
  color: string;
  size: string;
  stock: number | "";
  originalStock?: number;
  minStock?: number;
};

const sizes = Array.from({ length: 35 }, (_, index) => String(index + 16));

export default function VariantEditor({ variants, onChange }: { variants: VariantInput[]; onChange: (next: VariantInput[]) => void }) {
  function change(index: number, patch: Partial<VariantInput>) {
    onChange(variants.map((variant, position) => position === index ? { ...variant, ...patch } : variant));
  }

  function addSize() {
    onChange([...variants, { color: variants.at(-1)?.color ?? "", size: "", stock: 0, minStock: 2 }]);
  }

  return <div className="admin-panel">
    <div className="panel-title-row">
      <div>
        <h3>Numeração, cor e quantidade</h3>
        <p>Escolha o tamanho, informe a cor e quantos pares há em estoque.</p>
      </div>
      <button className="admin-secondary" type="button" onClick={addSize}><Plus size={15} /> Adicionar tamanho</button>
    </div>
    <div className="size-stock-list">
      {variants.map((variant, index) => <div className="size-stock-row" key={variant.id ?? index}>
        <label className="admin-field">Tamanho
          <select required value={variant.size} onChange={(event) => change(index, { size: event.target.value })}>
            <option value="">Escolha</option>
            {variant.size && !sizes.includes(variant.size) && <option value={variant.size}>{variant.size}</option>}
            {sizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <label className="admin-field">Cor
          <input required maxLength={50} placeholder="Ex.: preto" value={variant.color} onChange={(event) => change(index, { color: event.target.value })} />
        </label>
        <label className="admin-field">Quantidade (pares)
          <input required type="number" min="0" step="1" value={variant.stock} onChange={(event) => change(index, { stock: event.target.value === "" ? "" : Number(event.target.value) })} />
        </label>
        {!variant.id && variants.length > 1 && <button className="size-stock-remove" type="button" onClick={() => onChange(variants.filter((_, position) => position !== index))} aria-label="Remover tamanho"><Trash2 size={17} /></button>}
      </div>)}
    </div>
  </div>;
}
