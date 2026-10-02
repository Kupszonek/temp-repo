import { useState, useEffect } from "react";
import { getProducts, createProduct, updateProduct, deleteProduct } from "./api";
import ProductForm from "./ProductForm";
import ProductTable from "./ProductTable";

export default function App() {
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [apiStatus, setApiStatus] = useState("Loading...");

  const [teamInfo, setTeamInfo] = useState({ teamName: "", members: [] });

  async function loadProducts() {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (e) {
      console.error("Failed to load products:", e);
    }
  }

  useEffect(() => {
    loadProducts();
    fetch("/api/v1/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "ok") setApiStatus("OK");
      })
      .catch(() => setApiStatus("Error"));

    fetch("/api/v1/team")
      .then((res) => res.json())
      .then((data) => setTeamInfo(data))
      .catch((err) => console.error("Failed to load team info:", err));
  }, []);

  async function handleCreate(product) {
    await createProduct(product);
    loadProducts();
  }

  async function handleUpdate(id, product) {
    await updateProduct(id, product);
    setEditingProduct(null);
    loadProducts();
  }

  async function handleDelete(id) {
    await deleteProduct(id);
    loadProducts();
  }

  return (
    <div>
      <h1>Think different Academy</h1>
      <p>Status: {apiStatus}</p>

      <ProductForm
        onSubmit={editingProduct ? (p) => handleUpdate(editingProduct.id, p) : handleCreate}
        initial={editingProduct}
        onCancel={editingProduct ? () => setEditingProduct(null) : null}
      />

      <ProductTable
        products={products}
        onEdit={setEditingProduct}
        onDelete={handleDelete}
      />

      <footer style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #ccc" }}>
        <h3>Zespół: {teamInfo.teamName || "Ładowanie..."}</h3>
        <ul>
          {teamInfo.members.map((member, index) => (
            <li key={index}>
              {member.firstName} {member.lastName}
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}