(() => {
  const charts = {};

  const state = {
    activeTab: "resumen",
    raw: {},
  };

  const money = (value) =>
    new Intl.NumberFormat("es-GT", {
      style: "currency",
      currency: "GTQ",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const number = (value) =>
    new Intl.NumberFormat("es-GT").format(Number(value || 0));

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.hidden = false;
    toast.textContent = message;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.hidden = true;
    }, 5000);
  }

  function destroyChart(key) {
    if (charts[key]) {
      charts[key].destroy();
      charts[key] = null;
    }
  }

  function filterByMonthRange(rows, desde, hasta) {
    return (rows || []).filter((row) => {
      const mes = row.mes;
      if (desde && mes < desde) return false;
      if (hasta && mes > hasta) return false;
      return true;
    });
  }

  function getFilters() {
    return {
      desde: document.getElementById("filtro-desde").value || null,
      hasta: document.getElementById("filtro-hasta").value || null,
      tipo: document.getElementById("filtro-tipo").value || "TODOS",
    };
  }

  function baseChart(height = 300) {
    return {
      height,
      toolbar: { show: false },
      animations: { enabled: true, speed: 700 },
      fontFamily: "IBM Plex Sans, sans-serif",
    };
  }

  function renderKpis(kpis, evolucionFiltrada) {
    const filters = getFilters();
    if ((filters.desde || filters.hasta) && evolucionFiltrada.length) {
      const monto = evolucionFiltrada.reduce((acc, r) => acc + Number(r.ingresos || 0), 0);
      const compras = evolucionFiltrada.reduce((acc, r) => acc + Number(r.total_compras || 0), 0);
      document.getElementById("kpi-monto").textContent = money(monto);
      document.getElementById("kpi-compras").textContent = number(compras);
      document.getElementById("kpi-ticket").textContent = money(compras ? monto / compras : 0);
      document.getElementById("kpi-clientes").textContent = number(kpis.clientes_activos);
      document.getElementById("meta-fechas").textContent =
        `Intervalo filtrado: ${filters.desde || "…"} → ${filters.hasta || "…"}`;
      return;
    }

    document.getElementById("kpi-monto").textContent = money(kpis.monto_total);
    document.getElementById("kpi-compras").textContent = number(kpis.total_compras);
    document.getElementById("kpi-ticket").textContent = money(kpis.ticket_promedio);
    document.getElementById("kpi-clientes").textContent = number(kpis.clientes_activos);

    const min = kpis.intervalo?.fecha_min?.slice(0, 10) || "N/D";
    const max = kpis.intervalo?.fecha_max?.slice(0, 10) || "N/D";
    document.getElementById("meta-fechas").textContent = `Intervalo: ${min} → ${max}`;
  }

  function renderLineChart(rows) {
    destroyChart("lineas");
    charts.lineas = new ApexCharts(document.querySelector("#chart-lineas"), {
      chart: { type: "area", ...baseChart(340) },
      series: [{ name: "Ingresos (Q)", data: rows.map((r) => Number(r.ingresos || 0)) }],
      xaxis: { categories: rows.map((r) => r.mes), labels: { rotate: -45 } },
      yaxis: { labels: { formatter: (v) => `Q${Math.round(v / 1000)}k` } },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 3 },
      fill: {
        type: "gradient",
        gradient: { shadeIntensity: 0.4, opacityFrom: 0.45, opacityTo: 0.05 },
      },
      colors: ["#2563eb"],
      tooltip: {
        y: {
          formatter: (v, opts) => {
            const row = rows[opts.dataPointIndex];
            const variacion = row?.variacion_pct == null ? "N/D" : `${row.variacion_pct}%`;
            return `${money(v)} · var. ${variacion}`;
          },
        },
      },
      grid: { borderColor: "#d7e0db" },
    });
    charts.lineas.render();

    if (rows.length) {
      document.getElementById("foot-lineas").textContent =
        `Fuente: /api/tiempo/evolucion-mensual · Promedio mensual ${money(rows[0].promedio_mensual)} · ${rows.length} meses`;
    }
  }

  function renderComprasMes(rows) {
    destroyChart("comprasMes");
    charts.comprasMes = new ApexCharts(document.querySelector("#chart-compras-mes"), {
      chart: { type: "bar", ...baseChart(280) },
      series: [{ name: "Compras", data: rows.map((r) => Number(r.total_compras || 0)) }],
      xaxis: { categories: rows.map((r) => r.mes), labels: { rotate: -45 } },
      colors: ["#14b8a6"],
      dataLabels: { enabled: false },
      plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
      tooltip: { y: { formatter: (v) => number(v) } },
      grid: { borderColor: "#d7e0db" },
    });
    charts.comprasMes.render();
  }

  function renderIngresosMes(rows, extra) {
    destroyChart("ingresosMes");
    charts.ingresosMes = new ApexCharts(document.querySelector("#chart-ingresos-mes"), {
      chart: { type: "bar", ...baseChart(280) },
      series: [{ name: "Ingresos (Q)", data: rows.map((r) => Number(r.ingresos || 0)) }],
      xaxis: { categories: rows.map((r) => r.mes), labels: { rotate: -45 } },
      colors: ["#f59e0b"],
      dataLabels: { enabled: false },
      yaxis: { labels: { formatter: (v) => `Q${Math.round(v / 1000)}k` } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
      tooltip: { y: { formatter: (v) => money(v) } },
      grid: { borderColor: "#d7e0db" },
    });
    charts.ingresosMes.render();

    const mayor = extra?.mes_mayor_facturacion;
    document.getElementById("foot-ingresos-mes").textContent = mayor
      ? `Fuente: /api/tiempo/ingresos-por-mes · Mayor: ${mayor.mes} (${money(mayor.ingresos)})`
      : "Fuente: /api/tiempo/ingresos-por-mes";
  }

  function renderRankingMeses(rows) {
    const tbody = document.getElementById("tabla-ranking-meses");
    tbody.innerHTML = (rows || [])
      .map(
        (r) => `
      <tr>
        <td>${r.ranking_facturacion}</td>
        <td>${r.mes}</td>
        <td>${number(r.total_compras)}</td>
        <td>${money(r.ingresos)}</td>
        <td>${r.variacion_pct == null ? "—" : `${r.variacion_pct}%`}</td>
      </tr>`
      )
      .join("");
  }

  function renderDonut(marcas) {
    destroyChart("dona");
    charts.dona = new ApexCharts(document.querySelector("#chart-dona"), {
      chart: { type: "donut", ...baseChart(300) },
      labels: marcas.map((m) => m.nombre_marca),
      series: marcas.map((m) => Number(m.participacion_pct || 0)),
      colors: ["#2563eb", "#14b8a6", "#f59e0b", "#e11d48"],
      legend: { position: "bottom" },
      dataLabels: { formatter: (val) => `${val.toFixed(1)}%` },
      tooltip: {
        y: {
          formatter: (val, opts) => {
            const row = marcas[opts.seriesIndex];
            return `${val}% · ${money(row.monto_total)}`;
          },
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: "62%",
            labels: {
              show: true,
              total: { show: true, label: "Participación", formatter: () => "100%" },
            },
          },
        },
      },
    });
    charts.dona.render();
  }

  function renderComparativa(rows) {
    destroyChart("comparativa");
    const filters = getFilters();
    let data = rows || [];
    if (filters.tipo !== "TODOS") {
      data = data.filter((r) => String(r.tipo_tarjeta).toUpperCase() === filters.tipo);
    }

    charts.comparativa = new ApexCharts(document.querySelector("#chart-comparativa"), {
      chart: { type: "bar", ...baseChart(300) },
      series: [{ name: "Monto total (Q)", data: data.map((r) => Number(r.monto_total || 0)) }],
      xaxis: { categories: data.map((r) => r.tipo_tarjeta) },
      colors: ["#8b5cf6"],
      plotOptions: { bar: { borderRadius: 8, columnWidth: "42%", distributed: true } },
      legend: { show: false },
      dataLabels: { enabled: true, formatter: (v) => money(v), style: { fontSize: "11px" } },
      yaxis: { labels: { formatter: (v) => `Q${Math.round(v / 1000)}k` } },
      tooltip: {
        y: {
          formatter: (val, opts) => {
            const row = data[opts.dataPointIndex];
            return `${money(val)} · ${number(row.total_compras)} compras · avg ${money(row.promedio_gasto)}`;
          },
        },
      },
      grid: { borderColor: "#d7e0db" },
    });
    charts.comparativa.render();
  }

  function renderBarras(productos) {
    destroyChart("barras");
    charts.barras = new ApexCharts(document.querySelector("#chart-barras"), {
      chart: { type: "bar", ...baseChart(360) },
      series: [{ name: "Ingresos (Q)", data: productos.map((p) => Number(p.ingresos_generados || 0)) }],
      plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: "70%" } },
      dataLabels: { enabled: false },
      xaxis: {
        categories: productos.map((p) => p.nombre_producto),
        labels: { formatter: (v) => `Q${Math.round(v / 1000)}k` },
      },
      colors: ["#14b8a6"],
      tooltip: { y: { formatter: (v) => money(v) } },
      grid: { borderColor: "#d7e0db" },
    });
    charts.barras.render();
  }

  function renderCategorias(categorias) {
    destroyChart("categorias");
    charts.categorias = new ApexCharts(document.querySelector("#chart-categorias"), {
      chart: { type: "donut", ...baseChart(300) },
      labels: categorias.map((c) => c.nombre_categoria),
      series: categorias.map((c) => Number(c.monto_total || 0)),
      colors: ["#2563eb", "#14b8a6", "#f59e0b", "#e11d48", "#8b5cf6"],
      legend: { position: "bottom" },
      dataLabels: { formatter: (val) => `${val.toFixed(1)}%` },
      tooltip: { y: { formatter: (v) => money(v) } },
    });
    charts.categorias.render();
  }

  function renderTopCantidad(productos) {
    destroyChart("topCantidad");
    charts.topCantidad = new ApexCharts(document.querySelector("#chart-top-cantidad"), {
      chart: { type: "bar", ...baseChart(360) },
      series: [{ name: "Cantidad", data: productos.map((p) => Number(p.total_unidades || 0)) }],
      plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: "70%" } },
      dataLabels: { enabled: false },
      xaxis: { categories: productos.map((p) => p.nombre_producto) },
      colors: ["#f59e0b"],
      tooltip: { y: { formatter: (v) => number(v) } },
      grid: { borderColor: "#d7e0db" },
    });
    charts.topCantidad.render();
  }

  function renderPrecioPromCat(rows) {
    destroyChart("precioPromCat");
    charts.precioPromCat = new ApexCharts(document.querySelector("#chart-precio-prom-cat"), {
      chart: { type: "bar", ...baseChart(280) },
      series: [{ name: "Precio promedio", data: rows.map((r) => Number(r.precio_promedio || 0)) }],
      xaxis: { categories: rows.map((r) => r.nombre_categoria), labels: { rotate: -30 } },
      colors: ["#0f6b4c"],
      dataLabels: { enabled: false },
      yaxis: { labels: { formatter: (v) => money(v) } },
      tooltip: { y: { formatter: (v) => money(v) } },
      grid: { borderColor: "#d7e0db" },
    });
    charts.precioPromCat.render();
  }

  function renderTopPorCategoria(rows) {
    document.getElementById("tabla-top-categoria").innerHTML = (rows || [])
      .map(
        (r) => `
      <tr>
        <td>${r.nombre_categoria}</td>
        <td>${r.nombre_producto}</td>
        <td>${number(r.total_vendido)}</td>
        <td>${money(r.total_ingreso)}</td>
      </tr>`
      )
      .join("");
  }

  function renderSobreCat(rows) {
    const top = (rows || []).slice(0, 15);
    document.getElementById("tabla-sobre-cat").innerHTML = top
      .map(
        (r) => `
      <tr>
        <td>${r.nombre_producto}</td>
        <td>${r.nombre_categoria}</td>
        <td>${money(r.precio_sugerido)}</td>
        <td>${money(r.diferencia)}</td>
      </tr>`
      )
      .join("");
    document.getElementById("foot-sobre-cat").textContent =
      `Fuente: /api/productos/sobre-promedio-categoria · Mostrando ${top.length} de ${(rows || []).length}`;
  }

  function renderProdSinCompras(rows) {
    const top = (rows || []).slice(0, 20);
    document.getElementById("tabla-prod-sin-compras").innerHTML = top
      .map(
        (r) => `
      <tr>
        <td>${r.nombre_producto}</td>
        <td>${r.nombre_categoria}</td>
        <td>${money(r.precio_sugerido)}</td>
      </tr>`
      )
      .join("");
    document.getElementById("foot-prod-sin").textContent =
      `Fuente: /api/productos/sin-compras · Mostrando ${top.length} de ${(rows || []).length}`;
  }

  function renderDiffPrecios(rows) {
    const data = rows || [];
    const tbody = document.getElementById("tabla-diff-precios");
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="4">Sin diferencias: el precio unitario coincide con el sugerido.</td></tr>`;
    } else {
      tbody.innerHTML = data
        .map(
          (r) => `
        <tr>
          <td>${r.nombre_producto}</td>
          <td>${money(r.precio_sugerido)}</td>
          <td>${money(r.precio_unitario_promedio)}</td>
          <td>${money(r.diferencia_promedio)}</td>
        </tr>`
        )
        .join("");
    }
    document.getElementById("foot-diff-precios").textContent =
      `Fuente: /api/productos/diferencia-precios · ${data.length} diferencia(s)`;
  }

  function renderTopMonto(rows) {
    destroyChart("topMonto");
    charts.topMonto = new ApexCharts(document.querySelector("#chart-top-monto"), {
      chart: { type: "bar", ...baseChart(340) },
      series: [{ name: "Monto (Q)", data: rows.map((r) => Number(r.monto_total || 0)) }],
      plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: "70%" } },
      dataLabels: { enabled: false },
      xaxis: {
        categories: rows.map((r) => r.nombre_cliente),
        labels: { formatter: (v) => `Q${Math.round(v / 1000)}k` },
      },
      colors: ["#2563eb"],
      tooltip: { y: { formatter: (v) => money(v) } },
      grid: { borderColor: "#d7e0db" },
    });
    charts.topMonto.render();
  }

  function renderTopComprasClientes(rows) {
    destroyChart("topComprasCli");
    charts.topComprasCli = new ApexCharts(document.querySelector("#chart-top-compras"), {
      chart: { type: "bar", ...baseChart(280) },
      series: [{ name: "Compras", data: rows.map((r) => Number(r.num_compras || 0)) }],
      plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: "70%" } },
      dataLabels: { enabled: false },
      xaxis: { categories: rows.map((r) => r.nombre_cliente) },
      colors: ["#c45c26"],
      tooltip: { y: { formatter: (v) => number(v) } },
      grid: { borderColor: "#d7e0db" },
    });
    charts.topComprasCli.render();
  }

  function renderTicket(rows) {
    const top = (rows || []).slice(0, 12);
    document.getElementById("tabla-ticket").innerHTML = top
      .map(
        (r) => `
      <tr>
        <td>${r.nombre_cliente}</td>
        <td>${number(r.num_compras)}</td>
        <td>${money(r.ticket_promedio)}</td>
      </tr>`
      )
      .join("");
    document.getElementById("foot-ticket").textContent =
      `Fuente: /api/clientes/ticket-promedio · Top ${top.length} de ${(rows || []).length}`;
  }

  function renderRanking(rows) {
    const top = (rows || []).slice(0, 12);
    document.getElementById("tabla-ranking").innerHTML = top
      .map(
        (r) => `
      <tr>
        <td>${r.ranking}</td>
        <td>${r.nombre_cliente}</td>
        <td>${number(r.num_compras)}</td>
        <td>${money(r.monto_total)}</td>
      </tr>`
      )
      .join("");
    document.getElementById("foot-ranking").textContent =
      `Fuente: /api/clientes/ranking · Mostrando top ${top.length} de ${(rows || []).length}`;
  }

  function renderVIP(rows) {
    document.getElementById("tabla-vip").innerHTML = (rows || [])
      .map((r) => `<tr><td>${r.nombre_cliente}</td><td>${money(r.monto_total)}</td></tr>`)
      .join("");
  }

  function renderInactivos(rows) {
    document.getElementById("tabla-inactivos").innerHTML = (rows || [])
      .map((r) => `<tr><td>${r.nombre_cliente}</td><td>${r.correo || "Sin correo"}</td></tr>`)
      .join("");
  }

  function renderTarjetasKpis(promedios, multiples) {
    const container = document.getElementById("tarjetas-kpis");
    let html = "";
    (promedios || []).forEach((p) => {
      html += `<article class="kpi"><p class="kpi__label">Promedio ${p.tipo_tarjeta}</p><p class="kpi__value" style="font-size: 1.5rem">${money(p.gasto_promedio)}</p><p class="kpi__unit">Q</p></article>`;
    });
    if ((multiples || []).length > 0) {
      html += `<article class="kpi"><p class="kpi__label">Clientes con Múltiples Tarjetas</p><p class="kpi__value" style="font-size: 1.5rem">${multiples.length}</p><p class="kpi__unit">Clientes</p></article>`;
    }
    container.innerHTML = html;
  }

  function renderInsights(payload, evolucionFiltrada) {
    if (!payload.kpis) return;
    const k = payload.kpis.data;
    const marcas = payload.marcas?.data || [];
    const tipos = payload.creditoDebito?.data || [];
    const productos = payload.topProductos?.data || [];
    const lista = [];

    if (marcas[0]) {
      lista.push(`${marcas[0].nombre_marca} lidera la participación con ${marcas[0].participacion_pct}% del monto.`);
    }
    if (tipos[0] && tipos[1]) {
      lista.push(
        `${tipos[0].tipo_tarjeta} supera a ${tipos[1].tipo_tarjeta} en monto (${money(tipos[0].monto_total)} vs ${money(tipos[1].monto_total)}).`
      );
    }
    if (productos[0]) {
      lista.push(`Producto top por ingresos: ${productos[0].nombre_producto} (${money(productos[0].ingresos_generados)}).`);
    }
    if (k.producto_mas_vendido) {
      lista.push(`Producto más vendido en unidades: ${k.producto_mas_vendido.nombre_producto}.`);
    }
    if (k.categoria_mayor_venta) {
      lista.push(
        `Categoría con mayor venta: ${k.categoria_mayor_venta.nombre_categoria} (${money(k.categoria_mayor_venta.monto_ventas)}).`
      );
    }
    if (evolucionFiltrada.length) {
      const topMes = [...evolucionFiltrada].sort((a, b) => Number(b.ingresos) - Number(a.ingresos))[0];
      lista.push(`Mes de mayor facturación en la vista: ${topMes.mes} (${money(topMes.ingresos)}).`);
    }

    document.getElementById("lista-hallazgos").innerHTML = lista.map((item) => `<li>${item}</li>`).join("");
  }

  function applyView() {
    const filters = getFilters();
    const evolucion = filterByMonthRange(state.raw.evolucion?.data || [], filters.desde, filters.hasta);
    const comprasMes = filterByMonthRange(state.raw.comprasPorMes?.data || [], filters.desde, filters.hasta);
    const ingresosMes = filterByMonthRange(state.raw.ingresosPorMes?.data || [], filters.desde, filters.hasta);
    const rankingMeses = filterByMonthRange(state.raw.rankingMeses?.data || [], filters.desde, filters.hasta)
      .slice()
      .sort((a, b) => Number(a.ranking_facturacion) - Number(b.ranking_facturacion));

    const tab = state.activeTab;

    if (tab === "resumen") {
      if (state.raw.kpis) renderKpis(state.raw.kpis.data, evolucion);
      if (state.raw.evolucion) renderLineChart(evolucion);
      if (state.raw.comprasPorMes) renderComprasMes(comprasMes);
      if (state.raw.ingresosPorMes) renderIngresosMes(ingresosMes, state.raw.ingresosPorMes.extra);
      if (state.raw.rankingMeses) renderRankingMeses(rankingMeses);
      if (state.raw.kpis) renderInsights(state.raw, evolucion);
    }

    if (tab === "tarjetas") {
      if (state.raw.marcas) renderDonut(state.raw.marcas.data || []);
      if (state.raw.creditoDebito) renderComparativa(state.raw.creditoDebito.data || []);
      if (state.raw.tarjetasPromedioPorTipo && state.raw.tarjetasClientesMultiples) {
        renderTarjetasKpis(state.raw.tarjetasPromedioPorTipo.data, state.raw.tarjetasClientesMultiples.data);
      }
    }

    if (tab === "productos") {
      if (state.raw.topProductos) renderBarras(state.raw.topProductos.data || []);
      if (state.raw.productosCategorias) renderCategorias(state.raw.productosCategorias.data || []);
      if (state.raw.topProductosCantidad) renderTopCantidad(state.raw.topProductosCantidad.data || []);
      if (state.raw.productosTopPorCategoria) renderTopPorCategoria(state.raw.productosTopPorCategoria.data);
      if (state.raw.productosPrecioPromedioCat) renderPrecioPromCat(state.raw.productosPrecioPromedioCat.data || []);
      if (state.raw.productosSobrePromedioCat) renderSobreCat(state.raw.productosSobrePromedioCat.data);
      if (state.raw.productosSinCompras) renderProdSinCompras(state.raw.productosSinCompras.data);
      if (state.raw.productosDiferenciaPrecios) renderDiffPrecios(state.raw.productosDiferenciaPrecios.data);
    }

    if (tab === "clientes") {
      if (state.raw.clientesTopMonto) renderTopMonto(state.raw.clientesTopMonto.data || []);
      if (state.raw.clientesTopCompras) renderTopComprasClientes(state.raw.clientesTopCompras.data || []);
      if (state.raw.clientesTicketPromedio) renderTicket(state.raw.clientesTicketPromedio.data);
      if (state.raw.ranking) renderRanking(state.raw.ranking.data);
      if (state.raw.clientesSobrePromedio) renderVIP(state.raw.clientesSobrePromedio.data);
      if (state.raw.clientesSinCompras) renderInactivos(state.raw.clientesSinCompras.data);
    }
  }

  function initFilterBounds(evolucion) {
    if (!evolucion) return;
    const meses = (evolucion.data || []).map((r) => r.mes).sort();
    if (!meses.length) return;
    const desde = document.getElementById("filtro-desde");
    const hasta = document.getElementById("filtro-hasta");
    desde.min = meses[0];
    desde.max = meses[meses.length - 1];
    hasta.min = meses[0];
    hasta.max = meses[meses.length - 1];
  }

  function pushIfMissing(tasks, key, loader) {
    if (!state.raw[key]) {
      tasks.push(loader().then((d) => (state.raw[key] = d)));
    }
  }

  async function loadTabData(tabId) {
    try {
      document.getElementById("meta-estado").textContent = "API: cargando pestaña…";
      const tasks = [];

      if (tabId === "resumen") {
        pushIfMissing(tasks, "kpis", Api.kpis);
        pushIfMissing(tasks, "evolucion", () =>
          Api.evolucion().then((d) => {
            initFilterBounds(d);
            return d;
          })
        );
        pushIfMissing(tasks, "comprasPorMes", Api.comprasPorMes);
        pushIfMissing(tasks, "ingresosPorMes", Api.ingresosPorMes);
        pushIfMissing(tasks, "rankingMeses", Api.rankingMeses);
      } else if (tabId === "tarjetas") {
        pushIfMissing(tasks, "marcas", Api.marcas);
        pushIfMissing(tasks, "creditoDebito", Api.creditoDebito);
        pushIfMissing(tasks, "tarjetasPromedioPorTipo", Api.tarjetasPromedioPorTipo);
        pushIfMissing(tasks, "tarjetasClientesMultiples", Api.tarjetasClientesMultiples);
      } else if (tabId === "productos") {
        pushIfMissing(tasks, "topProductos", Api.topProductos);
        pushIfMissing(tasks, "topProductosCantidad", Api.topProductosCantidad);
        pushIfMissing(tasks, "productosCategorias", Api.productosCategorias);
        pushIfMissing(tasks, "productosTopPorCategoria", Api.productosTopPorCategoria);
        pushIfMissing(tasks, "productosSinCompras", Api.productosSinCompras);
        pushIfMissing(tasks, "productosPrecioPromedioCat", Api.productosPrecioPromedioCat);
        pushIfMissing(tasks, "productosSobrePromedioCat", Api.productosSobrePromedioCat);
        pushIfMissing(tasks, "productosDiferenciaPrecios", Api.productosDiferenciaPrecios);
      } else if (tabId === "clientes") {
        pushIfMissing(tasks, "ranking", Api.rankingClientes);
        pushIfMissing(tasks, "clientesSobrePromedio", Api.clientesSobrePromedio);
        pushIfMissing(tasks, "clientesSinCompras", Api.clientesSinCompras);
        pushIfMissing(tasks, "clientesTopMonto", Api.clientesTopMonto);
        pushIfMissing(tasks, "clientesTopCompras", Api.clientesTopCompras);
        pushIfMissing(tasks, "clientesTicketPromedio", Api.clientesTicketPromedio);
      }

      if (tasks.length) await Promise.all(tasks);
      document.getElementById("meta-estado").textContent = "API: activa";
      applyView();
    } catch (error) {
      console.error(error);
      document.getElementById("meta-estado").textContent = "API: error";
      showToast("Error al cargar datos. Revisa CORS y la URL del backend.");
    }
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.target === tabId);
    });
    document.querySelectorAll("[data-tab]").forEach((el) => {
      el.classList.toggle("hidden", el.dataset.tab !== tabId);
    });
    loadTabData(tabId);
  }

  async function init() {
    try {
      document.getElementById("meta-estado").textContent = "API: conectando…";
      const health = await Api.health();
      document.getElementById("meta-estado").textContent = health.database?.ok
        ? "API: Oracle OK"
        : "API: activa";
    } catch (e) {
      document.getElementById("meta-estado").textContent = "API: error";
      showToast("No se pudo conectar al backend en Azure.");
    }

    const inputDesde = document.getElementById("filtro-desde");
    const inputHasta = document.getElementById("filtro-hasta");

    document.getElementById("btn-aplicar").addEventListener("click", applyView);
    document.getElementById("btn-limpiar").addEventListener("click", () => {
      inputDesde.value = "";
      inputHasta.value = "";
      document.getElementById("filtro-tipo").value = "TODOS";
      if (state.raw.evolucion) initFilterBounds(state.raw.evolucion);
      applyView();
    });

    inputDesde.addEventListener("change", (e) => {
      if (e.target.value) {
        inputHasta.min = e.target.value;
        if (inputHasta.value && inputHasta.value < e.target.value) {
          inputHasta.value = e.target.value;
          showToast("Fecha corregida automáticamente.");
        }
      }
    });

    inputHasta.addEventListener("change", (e) => {
      if (e.target.value) {
        inputDesde.max = e.target.value;
        if (inputDesde.value && inputDesde.value > e.target.value) {
          inputDesde.value = e.target.value;
          showToast("Fecha corregida automáticamente.");
        }
      }
    });

    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => switchTab(e.target.dataset.target));
    });

    switchTab("resumen");
  }

  init();
})();
