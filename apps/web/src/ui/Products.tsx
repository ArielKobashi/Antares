import { Layers, Plus, Ruler, Tags } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";

type Lookup = { id: string; name: string; code?: string };
type Product = {
  id: string;
  internalCode: string;
  barcode?: string;
  description: string;
  averageCost: string;
  salePrice: string;
  minimumStock: string;
  maximumStock?: string;
  weight?: string;
  dimensions?: string;
  notes?: string;
  imageUrl?: string;
  active: boolean;
  category?: Lookup | null;
  brand?: Lookup | null;
  unit?: Lookup | null;
};

const emptyProduct = {
  internalCode: "",
  barcode: "",
  description: "",
  categoryId: "",
  brandId: "",
  unitId: "",
  averageCost: "0",
  salePrice: "0",
  minimumStock: "0",
  maximumStock: "",
  weight: "",
  dimensions: "",
  imageUrl: "",
  notes: ""
};

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Lookup[]>([]);
  const [brands, setBrands] = useState<Lookup[]>([]);
  const [units, setUnits] = useState<Lookup[]>([]);
  const [form, setForm] = useState(emptyProduct);
  const [categoryName, setCategoryName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [unitForm, setUnitForm] = useState({ code: "", name: "" });

  async function load() {
    const [productRows, categoryRows, brandRows, unitRows] = await Promise.all([
      api<Product[]>("/catalog/products"),
      api<Lookup[]>("/catalog/categories"),
      api<Lookup[]>("/catalog/brands"),
      api<Lookup[]>("/catalog/units")
    ]);
    setProducts(productRows);
    setCategories(categoryRows);
    setBrands(brandRows);
    setUnits(unitRows);
    setForm((current) => ({
      ...current,
      categoryId: current.categoryId || categoryRows[0]?.id || "",
      brandId: current.brandId || brandRows[0]?.id || "",
      unitId: current.unitId || unitRows[0]?.id || ""
    }));
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await api("/catalog/products", {
      method: "POST",
      body: JSON.stringify({
        internalCode: form.internalCode,
        barcode: form.barcode || undefined,
        description: form.description,
        categoryId: form.categoryId || undefined,
        brandId: form.brandId || undefined,
        unitId: form.unitId || undefined,
        averageCost: Number(form.averageCost),
        salePrice: Number(form.salePrice),
        minimumStock: Number(form.minimumStock),
        maximumStock: form.maximumStock ? Number(form.maximumStock) : undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        dimensions: form.dimensions || undefined,
        imageUrl: form.imageUrl || undefined,
        notes: form.notes || undefined
      })
    });
    setForm({ ...emptyProduct, categoryId: categories[0]?.id || "", brandId: brands[0]?.id || "", unitId: units[0]?.id || "" });
    await load();
  }

  async function createCategory(event: FormEvent) {
    event.preventDefault();
    await api("/catalog/categories", { method: "POST", body: JSON.stringify({ name: categoryName }) });
    setCategoryName("");
    await load();
  }

  async function createBrand(event: FormEvent) {
    event.preventDefault();
    await api("/catalog/brands", { method: "POST", body: JSON.stringify({ name: brandName }) });
    setBrandName("");
    await load();
  }

  async function createUnit(event: FormEvent) {
    event.preventDefault();
    await api("/catalog/units", { method: "POST", body: JSON.stringify(unitForm) });
    setUnitForm({ code: "", name: "" });
    await load();
  }

  return (
    <div className="stack">
      <div className="two-column">
        <section className="panel">
          <div className="panel-title">
            <Plus size={18} />
            <h2>Novo produto</h2>
          </div>
          <form className="form-grid compact" onSubmit={submit}>
            <label>Codigo interno<input value={form.internalCode} onChange={(event) => setForm({ ...form, internalCode: event.target.value })} required /></label>
            <label>Codigo de barras<input value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} /></label>
            <label>Descricao<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required /></label>
            <label>Categoria<select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Sem categoria</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Marca<select value={form.brandId} onChange={(event) => setForm({ ...form, brandId: event.target.value })}><option value="">Sem marca</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Unidade<select value={form.unitId} onChange={(event) => setForm({ ...form, unitId: event.target.value })}><option value="">Sem unidade</option>{units.map((item) => <option key={item.id} value={item.id}>{item.code ?? item.name} - {item.name}</option>)}</select></label>
            <label>Custo medio<input type="number" step="0.01" value={form.averageCost} onChange={(event) => setForm({ ...form, averageCost: event.target.value })} /></label>
            <label>Preco venda<input type="number" step="0.01" value={form.salePrice} onChange={(event) => setForm({ ...form, salePrice: event.target.value })} /></label>
            <label>Estoque minimo<input type="number" step="0.01" value={form.minimumStock} onChange={(event) => setForm({ ...form, minimumStock: event.target.value })} /></label>
            <label>Estoque maximo<input type="number" step="0.01" value={form.maximumStock} onChange={(event) => setForm({ ...form, maximumStock: event.target.value })} /></label>
            <label>Peso<input type="number" step="0.001" value={form.weight} onChange={(event) => setForm({ ...form, weight: event.target.value })} /></label>
            <label>Dimensoes<input value={form.dimensions} onChange={(event) => setForm({ ...form, dimensions: event.target.value })} /></label>
            <label>Imagem URL<input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} /></label>
            <label>Observacoes<input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
            <button className="primary">Salvar produto</button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-title">
            <Layers size={18} />
            <h2>Apoio do cadastro</h2>
          </div>
          <form className="inline-form" onSubmit={createCategory}>
            <input placeholder="Categoria" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} required />
            <button className="secondary">Criar</button>
          </form>
          <form className="inline-form" onSubmit={createBrand}>
            <input placeholder="Marca" value={brandName} onChange={(event) => setBrandName(event.target.value)} required />
            <button className="secondary">Criar</button>
          </form>
          <form className="form-grid compact" onSubmit={createUnit}>
            <label>Sigla<input value={unitForm.code} onChange={(event) => setUnitForm({ ...unitForm, code: event.target.value })} required /></label>
            <label>Unidade<input value={unitForm.name} onChange={(event) => setUnitForm({ ...unitForm, name: event.target.value })} required /></label>
            <button className="secondary">Criar unidade</button>
          </form>
        </section>
      </div>
      <section className="panel">
        <div className="panel-title">
          <Tags size={18} />
          <h2>Produtos</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Descricao</th>
              <th>Categoria</th>
              <th>Marca</th>
              <th>Un</th>
              <th>Custo</th>
              <th>Venda</th>
              <th>Min/Max</th>
              <th>Medidas</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.internalCode}</td>
                <td>{product.description}</td>
                <td>{product.category?.name ?? ""}</td>
                <td>{product.brand?.name ?? ""}</td>
                <td>{product.unit?.code ?? product.unit?.name ?? ""}</td>
                <td>{money(product.averageCost)}</td>
                <td>{money(product.salePrice)}</td>
                <td>{Number(product.minimumStock)} / {product.maximumStock ? Number(product.maximumStock) : ""}</td>
                <td><Ruler size={14} /> {product.dimensions ?? ""} {product.weight ? `${Number(product.weight)} kg` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function money(value: string | number) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
