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
    
    // Tarjetas
    marcas: () => get("/api/tarjetas/marcas"),
    creditoDebito: () => get("/api/tarjetas/credito-vs-debito"),
    tarjetasPromedioPorTipo: () => get("/api/tarjetas/promedio-por-tipo"),
    tarjetasClientesMultiples: () => get("/api/tarjetas/clientes-multiples"),
    
    // Productos
    topProductos: () => get("/api/productos/top-ingresos"),
    topProductosCantidad: () => get("/api/productos/top-cantidad"),
    productosCategorias: () => get("/api/productos/categorias"),
    
    // Clientes
    rankingClientes: () => get("/api/clientes/ranking"),
    clientesSobrePromedio: () => get("/api/clientes/sobre-promedio"),
    clientesSinCompras: () => get("/api/clientes/sin-compras"),
  };
})();
