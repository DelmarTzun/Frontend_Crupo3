(() => {
  const charts = {};

  const state = {
    activeTab: "resumen",
    activeSubTabs: { productos: "prod-top", clientes: "cli-lideres" },
    raw: {},
    filters: { desde: null, hasta: null, tipo: "TODOS", top: 10, cliente: "" },
  };

  const money = (value) =>
    new Intl.NumberFormat("es-GT", {
      style: "currency",
      currency: "GTQ",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const number = (value) =>
    new Intl.NumberFormat("es-GT").format(Number(value || 0));

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.hidden = false;
    toast.textContent = message;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.hidden = true;
    }, 5000);
  }

  function renderChart(key, selector, options) {
    if (charts[key]) {
      charts[key].updateOptions(options);
    } else {
      charts[key] = new ApexCharts(document.querySelector(selector), options);
      charts[key].render();
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

  function updateFiltersFromDOM() {
    state.filters = {
      desde: document.getElementById("filtro-desde").value || null,
      hasta: document.getElementById("filtro-hasta").value || null,
      tipo: document.getElementById("filtro-tipo").value || "TODOS",
      top: parseInt(document.getElementById("filtro-top").value, 10) || 10,
      cliente: (document.getElementById("filtro-cliente").value || "").toLowerCase().trim(),
    };
  }

  function getFilters() {
    return state.filters;
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
    const options = {
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
    };
    renderChart("lineas", "#chart-lineas", options);

    if (rows.length) {
      document.getElementById("foot-lineas").textContent =
        `Fuente: /api/tiempo/evolucion-mensual · Promedio mensual ${money(rows[0].promedio_mensual)} · ${rows.length} meses`;
    }
  }

  function renderComprasMes(rows) {
    const options = {
      chart: { type: "bar", ...baseChart(280) },
      series: [{ name: "Compras", data: rows.map((r) => Number(r.total_compras || 0)) }],
      xaxis: { categories: rows.map((r) => r.mes), labels: { rotate: -45 } },
      colors: ["#14b8a6"],
      dataLabels: { enabled: false },
      plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
      tooltip: { y: { formatter: (v) => number(v) } },
      grid: { borderColor: "#d7e0db" },
    };
    renderChart("comprasMes", "#chart-compras-mes", options);
  }

  function renderIngresosMes(rows, extra) {
    const options = {
      chart: { type: "bar", ...baseChart(280) },
      series: [{ name: "Ingresos (Q)", data: rows.map((r) => Number(r.ingresos || 0)) }],
      xaxis: { categories: rows.map((r) => r.mes), labels: { rotate: -45 } },
      colors: ["#f59e0b"],
      dataLabels: { enabled: false },
      yaxis: { labels: { formatter: (v) => `Q${Math.round(v / 1000)}k` } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
      tooltip: { y: { formatter: (v) => money(v) } },
      grid: { borderColor: "#d7e0db" },
    };
    renderChart("ingresosMes", "#chart-ingresos-mes", options);

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
    const options = {
      chart: { type: "donut", ...baseChart(380) },
      labels: marcas.map((m) => m.nombre_marca),
      series: marcas.map((m) => Number(m.participacion_pct || 0)),
      colors: ["#2563eb", "#14b8a6", "#f59e0b", "#e11d48"],
      legend: {
        position: "bottom",
        fontSize: "13px",
        itemMargin: { horizontal: 12, vertical: 6 },
      },
      dataLabels: {
        formatter: (val) => `${val.toFixed(1)}%`,
        style: { fontSize: "13px", fontWeight: "600" },
      },
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
            size: "65%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Participación",
                formatter: () => "100%",
                style: { fontSize: "15px", fontWeight: "600" },
              },
              value: {
                fontSize: "20px",
                fontWeight: "700",
              },
            },
          },
        },
      },
    };
    renderChart("dona", "#chart-dona", options);
  }

  function renderComparativa(rows) {
    const data = rows || [];

    const options = {
      chart: { type: "bar", ...baseChart(380) },
      series: [{ name: "Monto total (Q)", data: data.map((r) => Number(r.monto_total || 0)) }],
      xaxis: {
        categories: data.map((r) => r.tipo_tarjeta),
        labels: { style: { fontSize: "13px", fontWeight: "600" } },
      },
      colors: ["#8b5cf6"],
      plotOptions: { bar: { borderRadius: 8, columnWidth: "32%", distributed: true } },
      legend: { show: false },
      dataLabels: { enabled: true, formatter: (v) => money(v), style: { fontSize: "12px", fontWeight: "600" } },
      yaxis: {
        labels: {
          formatter: (v) => `Q${Math.round(v / 1000)}k`,
          style: { fontSize: "12px" },
        },
      },
      tooltip: {
        y: {
          formatter: (val, opts) => {
            const row = data[opts.dataPointIndex];
            return `${money(val)} · ${number(row.total_compras)} compras · avg ${money(row.promedio_gasto)}`;
          },
        },
      },
      grid: { borderColor: "#d7e0db" },
    };
    renderChart("comparativa", "#chart-comparativa", options);
  }

  function renderBarras(productos) {
    const options = {
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
    };
    renderChart("barras", "#chart-barras", options);
  }

  function renderCategorias(categorias) {
    const options = {
      chart: { type: "donut", ...baseChart(420) },
      labels: categorias.map((c) => c.nombre_categoria),
      series: categorias.map((c) => Number(c.monto_total || 0)),
      colors: [
        "#2563eb", "#14b8a6", "#f59e0b", "#e11d48", "#8b5cf6",
        "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1", "#10b981"
      ],
      legend: {
        position: "bottom",
        fontSize: "13px",
        itemMargin: { horizontal: 10, vertical: 6 },
      },
      dataLabels: {
        formatter: (val) => `${val.toFixed(1)}%`,
        style: { fontSize: "12px", fontWeight: "600" },
      },
      tooltip: {
        y: {
          formatter: (val, opts) => {
            const cat = categorias[opts.seriesIndex];
            const units = cat?.total_unidades ? ` · ${number(cat.total_unidades)} unidades` : "";
            return `${money(val)}${units}`;
          },
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: "65%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Total Ventas",
                formatter: (w) => {
                  const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                  return money(total);
                },
                style: { fontSize: "14px", fontWeight: "600" },
              },
              value: {
                fontSize: "19px",
                fontWeight: "700",
                formatter: (v) => money(v),
              },
            },
          },
        },
      },
    };
    renderChart("categorias", "#chart-categorias", options);
  }

  function renderTopCantidad(productos) {
    const options = {
      chart: { type: "bar", ...baseChart(360) },
      series: [{ name: "Cantidad", data: productos.map((p) => Number(p.total_unidades || 0)) }],
      plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: "70%" } },
      dataLabels: { enabled: false },
      xaxis: { categories: productos.map((p) => p.nombre_producto) },
      colors: ["#f59e0b"],
      tooltip: { y: { formatter: (v) => number(v) } },
      grid: { borderColor: "#d7e0db" },
    };
    renderChart("topCantidad", "#chart-top-cantidad", options);
  }

  function renderPrecioPromCat(rows) {
    const options = {
      chart: { type: "bar", ...baseChart(360) },
      series: [{ name: "Precio promedio (Q)", data: rows.map((r) => Number(r.precio_promedio || 0)) }],
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: "45%",
          distributed: false,
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (v) => money(v),
        style: { fontSize: "11px", fontWeight: "600" },
        offsetY: -20,
      },
      xaxis: {
        categories: rows.map((r) => r.nombre_categoria),
        labels: {
          rotate: -20,
          rotateAlways: false,
          style: { fontSize: "12px", fontWeight: "500" },
        },
      },
      colors: ["#0f6b4c"],
      yaxis: { labels: { formatter: (v) => money(v) } },
      tooltip: {
        y: {
          formatter: (v, opts) => {
            const cat = rows[opts.dataPointIndex];
            const num = cat?.num_productos ? ` · ${cat.num_productos} productos en catálogo` : "";
            return `${money(v)}${num}`;
          },
        },
      },
      grid: { borderColor: "#d7e0db" },
    };
    renderChart("precioPromCat", "#chart-precio-prom-cat", options);
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
    const list = rows || [];
    document.getElementById("tabla-sobre-cat").innerHTML = list
      .map(
        (r) => `
      <tr>
        <td><strong>${r.nombre_producto}</strong></td>
        <td>${r.nombre_categoria}</td>
        <td>${money(r.precio_sugerido)}</td>
        <td><span class="badge-diff">+${money(r.diferencia)}</span></td>
      </tr>`
      )
      .join("");
    document.getElementById("foot-sobre-cat").textContent =
      `Fuente: /api/productos/sobre-promedio-categoria · Mostrando ${list.length} producto(s)`;
  }

  function renderProdSinCompras(rows) {
    const list = rows || [];
    document.getElementById("tabla-prod-sin-compras").innerHTML = list
      .map(
        (r) => `
      <tr>
        <td><strong>${r.nombre_producto}</strong></td>
        <td>${r.nombre_categoria}</td>
        <td>${money(r.precio_sugerido)}</td>
      </tr>`
      )
      .join("");
    document.getElementById("foot-prod-sin").textContent =
      `Fuente: /api/productos/sin-compras · Mostrando ${list.length} de ${state.raw.productosSinCompras?.data?.length || list.length} sin rotación`;
  }

  function renderDiffPrecios(rows) {
    const data = rows || [];
    const container = document.getElementById("diff-precios-container");
    if (!container) return;

    if (!data.length) {
      container.innerHTML = `
        <div class="audit-card">
          <div class="audit-card__icon">✓</div>
          <div class="audit-card__content">
            <h3>Precios 100% alineados con el catálogo</h3>
            <p>Auditoría satisfactoria: En todas las compras históricas (<code>TBL_DET_COMPRAS</code>), el precio unitario cobrado coincide exactamente con el precio sugerido en <code>TBL_PRODUCTOS</code> (0 diferencias encontradas).</p>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="table-wrap table-wrap--scroll">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Sugerido</th>
                <th>Unitario prom.</th>
                <th>Diff.</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((r) => `
                <tr>
                  <td><strong>${r.nombre_producto}</strong></td>
                  <td>${money(r.precio_sugerido)}</td>
                  <td>${money(r.precio_unitario_promedio)}</td>
                  <td>${money(r.diferencia_promedio)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }
    document.getElementById("foot-diff-precios").textContent =
      `Fuente: /api/productos/diferencia-precios · ${data.length} discrepancia(s)`;
  }

  function renderTopMonto(rows, filters) {
    destroyChart("topMonto");
    const container = document.querySelector("#chart-top-monto");
    if (!container) return;

    const topN = filters?.top || 10;
    const titleEl = document.getElementById("titulo-top-monto");
    if (titleEl) titleEl.textContent = `Top ${topN} clientes por monto`;

    if (filters?.cliente && (!rows || rows.length === 0)) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-state__icon">🔍</span>
          <p><strong>El cliente "${escapeHtml(filters.cliente)}" no se encuentra dentro del Top ${topN} por monto.</strong></p>
          <p class="empty-state__hint">Puedes buscarlo en la sub-pestaña <strong>Análisis</strong> en el <em>Ranking general de clientes</em>, donde se listan todos los clientes con compras.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = "";
    charts.topMonto = new ApexCharts(container, {
      chart: { type: "bar", ...baseChart(360) },
      series: [{ name: "Monto total (Q)", data: rows.map((r) => Number(r.monto_total || 0)) }],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: "65%",
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (v) => money(v),
        style: { fontSize: "11px", fontWeight: "600" },
      },
      xaxis: {
        categories: rows.map((r) => r.nombre_cliente),
        labels: { formatter: (v) => `Q${Math.round(v / 1000)}k` },
      },
      yaxis: {
        labels: {
          maxWidth: 260,
          style: { fontSize: "12px", fontWeight: "600" },
        },
      },
      colors: ["#2563eb"],
      tooltip: {
        y: {
          formatter: (v, opts) => {
            const row = rows[opts.dataPointIndex];
            const num = row?.num_compras ? ` · ${number(row.num_compras)} compras` : "";
            return `${money(v)}${num}`;
          },
        },
      },
      grid: { borderColor: "#d7e0db" },
    });
    charts.topMonto.render();
  }

  function renderTopComprasClientes(rows, filters) {
    destroyChart("topComprasCli");
    const container = document.querySelector("#chart-top-compras");
    if (!container) return;

    const topN = filters?.top || 10;
    const titleEl = document.getElementById("titulo-top-compras");
    if (titleEl) titleEl.textContent = `Top ${topN} por número de compras`;

    if (filters?.cliente && (!rows || rows.length === 0)) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-state__icon">🔍</span>
          <p><strong>El cliente "${escapeHtml(filters.cliente)}" no se encuentra dentro del Top ${topN} por número de compras.</strong></p>
          <p class="empty-state__hint">Puedes consultar su posición y volumen total en la sub-pestaña <strong>Análisis</strong>.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = "";
    charts.topComprasCli = new ApexCharts(container, {
      chart: { type: "bar", ...baseChart(360) },
      series: [{ name: "Compras", data: rows.map((r) => Number(r.num_compras || 0)) }],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: "65%",
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (v) => `${number(v)} compras`,
        style: { fontSize: "11px", fontWeight: "600" },
      },
      xaxis: {
        categories: rows.map((r) => r.nombre_cliente),
        labels: { formatter: (v) => number(v) },
      },
      yaxis: {
        labels: {
          maxWidth: 260,
          style: { fontSize: "12px", fontWeight: "600" },
        },
      },
      colors: ["#c45c26"],
      tooltip: {
        y: {
          formatter: (v, opts) => {
            const row = rows[opts.dataPointIndex];
            const total = row?.monto_total ? ` · Monto ${money(row.monto_total)}` : "";
            return `${number(v)} compras${total}`;
          },
        },
      },
      grid: { borderColor: "#d7e0db" },
    });
    charts.topComprasCli.render();
  }

  function renderTicket(rows, filters) {
    const list = rows || [];
    const tbody = document.getElementById("tabla-ticket");
    if (!tbody) return;

    if (!list.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="td-empty">
            <div class="table-empty-notice">
              <span>🔍</span>
              <div>
                <strong>No se encontraron registros de ticket promedio con "${escapeHtml(filters?.cliente || "")}".</strong>
              </div>
            </div>
          </td>
        </tr>
      `;
      document.getElementById("foot-ticket").textContent =
        `Fuente: /api/clientes/ticket-promedio · 0 resultados`;
      return;
    }

    tbody.innerHTML = list
      .map(
        (r) => `
      <tr>
        <td><strong>${r.nombre_cliente}</strong></td>
        <td>${number(r.num_compras)} compras</td>
        <td>${money(r.ticket_promedio)}</td>
      </tr>`
      )
      .join("");
    document.getElementById("foot-ticket").textContent =
      `Fuente: /api/clientes/ticket-promedio · Mostrando ${list.length} de ${state.raw.clientesTicketPromedio?.data?.length || list.length}`;
  }

  function renderRanking(rows, filters) {
    const list = rows || [];
    const tbody = document.getElementById("tabla-ranking");
    if (!tbody) return;

    if (!list.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="td-empty">
            <div class="table-empty-notice">
              <span>🔍</span>
              <div>
                <strong>No se encontró ningún cliente en el ranking con "${escapeHtml(filters?.cliente || "")}".</strong>
              </div>
            </div>
          </td>
        </tr>
      `;
      document.getElementById("foot-ranking").textContent =
        `Fuente: /api/clientes/ranking · 0 coincidencias de ${state.raw.ranking?.data?.length || 0} clientes`;
      return;
    }

    tbody.innerHTML = list
      .map(
        (r) => `
      <tr>
        <td><span class="badge-diff">#${r.ranking}</span></td>
        <td><strong>${r.nombre_cliente}</strong></td>
        <td>${number(r.num_compras)}</td>
        <td>${money(r.monto_total)}</td>
      </tr>`
      )
      .join("");
    document.getElementById("foot-ranking").textContent =
      `Fuente: /api/clientes/ranking · Mostrando ${list.length} de ${state.raw.ranking?.data?.length || list.length} clientes en el ranking`;
  }

  function renderVIP(rows, filters) {
    const tbody = document.getElementById("tabla-vip");
    if (!tbody) return;
    const list = rows || [];

    if (!list.length) {
      if (filters?.cliente) {
        tbody.innerHTML = `
          <tr>
            <td colspan="2" class="td-empty">
              <div class="table-empty-notice">
                <span>⚠️</span>
                <div>
                  <strong>El cliente "${escapeHtml(filters.cliente)}" no califica como Cliente VIP.</strong>
                  <p>Su consumo acumulado no supera el promedio general de compras.</p>
                </div>
              </div>
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = `<tr><td colspan="2" class="td-empty">No hay clientes VIP registrados.</td></tr>`;
      }
      return;
    }

    tbody.innerHTML = list
      .map((r) => `<tr><td><strong>${r.nombre_cliente}</strong></td><td>${money(r.monto_total)}</td></tr>`)
      .join("");
    document.getElementById("foot-vip").textContent =
      `Fuente: /api/clientes/sobre-promedio · ${list.length} de ${state.raw.clientesSobrePromedio?.data?.length || list.length} cliente(s) VIP`;
  }

  function renderInactivos(rows, filters) {
    const tbody = document.getElementById("tabla-inactivos");
    if (!tbody) return;
    const list = rows || [];

    if (!list.length) {
      if (filters?.cliente) {
        tbody.innerHTML = `
          <tr>
            <td colspan="2" class="td-empty">
              <div class="table-empty-notice">
                <span>ℹ️</span>
                <div>
                  <strong>El cliente "${escapeHtml(filters.cliente)}" no figura como Cliente Inactivo.</strong>
                  <p>Cuenta con compras registradas en el histórico o no existe en la base de datos.</p>
                </div>
              </div>
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = `<tr><td colspan="2" class="td-empty">No hay clientes inactivos.</td></tr>`;
      }
      return;
    }

    tbody.innerHTML = list
      .map((r) => `<tr><td><strong>${r.nombre_cliente}</strong></td><td>${r.correo || "Sin correo"}</td></tr>`)
      .join("");
    document.getElementById("foot-inactivos").textContent =
      `Fuente: /api/clientes/sin-compras · ${list.length} de ${state.raw.clientesSinCompras?.data?.length || list.length} inactivo(s)`;
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
    const applyLimit = (data, limit) => {
      const arr = data || [];
      return {
        items: limit > 0 ? arr.slice(0, limit) : arr,
        total: arr.length
      };
    };
    const deduplicateByName = (data) => {
      const seen = new Set();
      return (data || []).filter((r) => {
        const key = `${r.nombre_producto || ""}|${r.nombre_categoria || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    const filterClientes = (data) => {
      let res = data || [];
      if (filters.cliente) {
        res = res.filter(r => (r.nombre_cliente || "").toLowerCase().includes(filters.cliente) || (r.correo || "").toLowerCase().includes(filters.cliente));
      }
      return applyLimit(res, filters.top);
    };

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
      if (state.raw.topProductos) renderBarras(applyLimit(state.raw.topProductos.data, filters.top));
      if (state.raw.productosCategorias) renderCategorias(state.raw.productosCategorias.data || []);
      if (state.raw.topProductosCantidad) renderTopCantidad(applyLimit(state.raw.topProductosCantidad.data, filters.top));
      if (state.raw.productosTopPorCategoria) renderTopPorCategoria(applyLimit(state.raw.productosTopPorCategoria.data, filters.top));
      if (state.raw.productosPrecioPromedioCat) renderPrecioPromCat(state.raw.productosPrecioPromedioCat.data || []);
      if (state.raw.productosSobrePromedioCat) {
        renderSobreCat(applyLimit(deduplicateByName(state.raw.productosSobrePromedioCat.data), filters.top));
      }
      if (state.raw.productosSinCompras) {
        renderProdSinCompras(applyLimit(deduplicateByName(state.raw.productosSinCompras.data), filters.top));
      }
      if (state.raw.productosDiferenciaPrecios) renderDiffPrecios(applyLimit(state.raw.productosDiferenciaPrecios.data, filters.top));
    }

    if (tab === "clientes") {
      const topN = filters.top || 10;
      const matchSearch = (r) => {
        if (!filters.cliente) return true;
        const query = filters.cliente;
        return (r.nombre_cliente || "").toLowerCase().includes(query) ||
               (r.correo || "").toLowerCase().includes(query);
      };

      // 1. Líderes: evalúa sobre el Top N y detecta si la búsqueda coincide en el Top
      if (state.raw.clientesTopMonto) {
        const topMonto = (state.raw.clientesTopMonto.data || []).slice(0, topN);
        const filteredMonto = filters.cliente ? topMonto.filter(matchSearch) : topMonto;
        renderTopMonto(filteredMonto, filters);
      }
      if (state.raw.clientesTopCompras) {
        const topCompras = (state.raw.clientesTopCompras.data || []).slice(0, topN);
        const filteredCompras = filters.cliente ? topCompras.filter(matchSearch) : topCompras;
        renderTopComprasClientes(filteredCompras, filters);
      }

      // 2. Análisis: muestra el ranking completo sin recortar y permite buscar por nombre
      if (state.raw.ranking) {
        const rankingFiltered = (state.raw.ranking.data || []).filter(matchSearch);
        renderRanking(rankingFiltered, filters);
      }
      if (state.raw.clientesTicketPromedio) {
        const ticketFiltered = (state.raw.clientesTicketPromedio.data || []).filter(matchSearch);
        renderTicket(ticketFiltered, filters);
      }

      // 3. Segmentación: muestra VIPs e Inactivos completos, o mensaje explicativo al buscar
      if (state.raw.clientesSobrePromedio) {
        const vipFiltered = (state.raw.clientesSobrePromedio.data || []).filter(matchSearch);
        renderVIP(vipFiltered, filters);
      }
      if (state.raw.clientesSinCompras) {
        const inactivosFiltered = (state.raw.clientesSinCompras.data || []).filter(matchSearch);
        renderInactivos(inactivosFiltered, filters);
      }
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
      
      if (state.raw.kpis === null) {
        document.getElementById("meta-estado").textContent = "API: error (offline)";
        showToast("Error al cargar datos. Verifica la URL del backend o que el servidor local/Vercel esté activo.");
      } else {
        document.getElementById("meta-estado").textContent = "API: activa";
      }
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
      const tabs = el.dataset.tab.split(" ");
      const matchTab = tabs.includes(tabId);
      let matchSubTab = true;
      if (el.dataset.subtab && matchTab) {
         matchSubTab = el.dataset.subtab === state.activeSubTabs[tabId];
      }
      el.classList.toggle("hidden", !(matchTab && matchSubTab));
    });
    
    if (state.activeSubTabs[tabId]) {
      document.querySelectorAll(`#subtabs-${tabId} .subtab-btn`).forEach(btn => {
        btn.classList.toggle("active", btn.dataset.target === state.activeSubTabs[tabId]);
      });
    }

    loadTabData(tabId);
  }

  function switchSubTab(subTabId, parentTabId) {
    state.activeSubTabs[parentTabId] = subTabId;
    document.querySelectorAll(`#subtabs-${parentTabId} .subtab-btn`).forEach(btn => {
      btn.classList.toggle("active", btn.dataset.target === subTabId);
    });
    document.querySelectorAll(`article[data-tab~="${parentTabId}"]`).forEach((el) => {
       if (el.dataset.subtab) {
         el.classList.toggle("hidden", el.dataset.subtab !== subTabId);
       }
    });
  }

  async function init() {
    updateFiltersFromDOM();
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
    const inputCliente = document.getElementById("filtro-cliente");

    document.getElementById("btn-aplicar").addEventListener("click", () => {
      updateFiltersFromDOM();
      applyView();
    });
    if (inputCliente) {
      inputCliente.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          updateFiltersFromDOM();
          applyView();
        }
      });
    }
    document.getElementById("btn-limpiar").addEventListener("click", () => {
      inputDesde.value = "";
      inputHasta.value = "";
      document.getElementById("filtro-top").value = "10";
      document.getElementById("filtro-cliente").value = "";
      if (state.raw.evolucion) initFilterBounds(state.raw.evolucion);
      updateFiltersFromDOM();
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

    document.querySelectorAll(".subtab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => switchSubTab(e.target.dataset.target, e.target.dataset.parent));
    });

    switchTab("resumen");
  }

  init();
})();
