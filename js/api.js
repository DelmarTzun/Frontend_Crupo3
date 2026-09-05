const Api = (() => {
  const base = () => window.APP_CONFIG?.API_BASE ?? "http://127.0.0.1:8000";

  async function get(path) {
    try {
      const response = await fetch(`${base()}${path}`);
      if (!response.ok) {
        const detail = await response.text();
        console.warn(`[API] HTTP ${response.status} en ${path}: ${detail}`);
        return null; // Graceful fallback
      }
      return await response.json();
    } catch (error) {
      console.warn(`[API] Error de red en ${path}:`, error.message);
      return null; // Evitar que Promise.all falle
    }
  }

  return {
    health: () => get("/health?check_db=true"),
    kpis: () => get("/api/kpis/resumen"),

    // Tiempo
    evolucion: () => get("/api/tiempo/evolucion-mensual"),
    comprasPorMes: () => get("/api/tiempo/compras-por-mes"),
    ingresosPorMes: () => get("/api/tiempo/ingresos-por-mes"),
    rankingMeses: () => get("/api/tiempo/ranking-meses"),

    // Tarjetas
    marcas: () => get("/api/tarjetas/marcas"),
    creditoDebito: () => get("/api/tarjetas/credito-vs-debito"),
    tarjetasPromedioPorTipo: () => get("/api/tarjetas/promedio-por-tipo"),
    tarjetasClientesMultiples: () => get("/api/tarjetas/clientes-multiples"),

    // Productos
    topProductos: () => get("/api/productos/top-ingresos"),
    topProductosCantidad: () => get("/api/productos/top-cantidad"),
    productosCategorias: () => get("/api/productos/categorias"),
    productosTopPorCategoria: () => get("/api/productos/top-por-categoria"),
    productosSinCompras: () => get("/api/productos/sin-compras"),
    productosPrecioPromedioCat: () => get("/api/productos/precio-promedio-categoria"),
    productosSobrePromedioCat: () => get("/api/productos/sobre-promedio-categoria"),
    productosDiferenciaPrecios: () => get("/api/productos/diferencia-precios"),

    // Clientes
    rankingClientes: () => get("/api/clientes/ranking"),
    clientesSobrePromedio: () => get("/api/clientes/sobre-promedio"),
    clientesSinCompras: () => get("/api/clientes/sin-compras"),
    clientesTopMonto: () => get("/api/clientes/top-monto"),
    clientesTopCompras: () => get("/api/clientes/top-compras"),
    clientesTicketPromedio: () => get("/api/clientes/ticket-promedio"),
  };
})();
