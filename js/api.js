const Api = (() => {
  const base = () => window.APP_CONFIG?.API_BASE || "http://127.0.0.1:8000";

  async function get(path) {
    const response = await fetch(`${base()}${path}`);
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Error ${response.status} en ${path}: ${detail}`);
    }
    return response.json();
  }

  return {
    health: () => get("/health?check_db=true"),
    kpis: () => get("/api/kpis/resumen"),
    evolucion: () => get("/api/tiempo/evolucion-mensual"),
    marcas: () => get("/api/tarjetas/marcas"),
    creditoDebito: () => get("/api/tarjetas/credito-vs-debito"),
    topProductos: () => get("/api/productos/top-ingresos"),
    rankingClientes: () => get("/api/clientes/ranking"),
  };
})();
