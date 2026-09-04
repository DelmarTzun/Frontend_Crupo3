(() => {
  const charts = {
    lineas: null,
    dona: null,
    comparativa: null,
    barras: null,
  };

  const state = {
    activeTab: "resumen",
    raw: {
      kpis: null,
      evolucion: null,
      marcas: null,
      creditoDebito: null,
      tarjetasPromedioPorTipo: null,
      tarjetasClientesMultiples: null,
      topProductos: null,
      topProductosCantidad: null,
      productosCategorias: null,
      ranking: null,
      clientesSobrePromedio: null,
      clientesSinCompras: null,
    },
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
    return rows.filter((row) => {
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

  function renderKpis(kpis, evolucionFiltrada) {
    // Si hay filtro de fechas, estimamos KPIs a partir de la serie mensual filtrada.
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
    const options = {
      chart: {
        type: "area",
        height: 340,
        toolbar: { show: false },
        animations: { enabled: true, speed: 700 },
        fontFamily: "IBM Plex Sans, sans-serif",
      },
      series: [
        {
          name: "Ingresos (Q)",
          data: rows.map((r) => Number(r.ingresos || 0)),
        },
      ],
      xaxis: {
        categories: rows.map((r) => r.mes),
        labels: { rotate: -45 },
      },
      yaxis: {
        labels: {
          formatter: (v) => `Q${Math.round(v / 1000)}k`,
        },
      },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 3 },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 0.4,
          opacityFrom: 0.45,
          opacityTo: 0.05,
        },
      },
      colors: ["#2563eb"],
      tooltip: {
        y: {
          formatter: (v, opts) => {
            const row = rows[opts.dataPointIndex];
            const variacion =
              row?.variacion_pct == null ? "N/D" : `${row.variacion_pct}%`;
            return `${money(v)} · var. ${variacion}`;
          },
        },
      },
      grid: { borderColor: "#d7e0db" },
    };
    charts.lineas = new ApexCharts(document.querySelector("#chart-lineas"), options);
    charts.lineas.render();

    const foot = document.getElementById("foot-lineas");
    if (rows.length) {
      const promedio = rows[0].promedio_mensual;
      foot.textContent =
        `Fuente: /api/tiempo/evolucion-mensual · Promedio mensual ${money(promedio)} · ${rows.length} meses`;
    }
  }

  function renderDonut(marcas) {
    destroyChart("dona");
    const options = {
      chart: {
        type: "donut",
        height: 300,
        fontFamily: "IBM Plex Sans, sans-serif",
      },
      labels: marcas.map((m) => m.nombre_marca),
      series: marcas.map((m) => Number(m.participacion_pct || 0)),
      colors: ["#2563eb", "#14b8a6", "#f59e0b", "#e11d48"],
      legend: { position: "bottom" },
      dataLabels: {
        formatter: (val) => `${val.toFixed(1)}%`,
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
            size: "62%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Participación",
                formatter: () => "100%",
              },
            },
          },
        },
      },
    };
    charts.dona = new ApexCharts(document.querySelector("#chart-dona"), options);
    charts.dona.render();
  }

  function renderComparativa(rows) {
    destroyChart("comparativa");
    const filters = getFilters();
    let data = rows;
    if (filters.tipo !== "TODOS") {
      data = rows.filter((r) => String(r.tipo_tarjeta).toUpperCase() === filters.tipo);
    }

    const options = {
      chart: {
        type: "bar",
        height: 300,
        toolbar: { show: false },
        fontFamily: "IBM Plex Sans, sans-serif",
      },
      series: [
        {
          name: "Monto total (Q)",
          data: data.map((r) => Number(r.monto_total || 0)),
        },
      ],
      xaxis: {
        categories: data.map((r) => r.tipo_tarjeta),
      },
      colors: ["#8b5cf6"],
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: "42%",
          distributed: true,
        },
      },
      legend: { show: false },
      dataLabels: {
        enabled: true,
        formatter: (v) => money(v),
        style: { fontSize: "11px" },
      },
      yaxis: {
        labels: { formatter: (v) => `Q${Math.round(v / 1000)}k` },
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
    charts.comparativa = new ApexCharts(
      document.querySelector("#chart-comparativa"),
      options
    );
    charts.comparativa.render();
  }

  function renderBarras(productos) {
    destroyChart("barras");
    const options = {
      chart: {
        type: "bar",
        height: 360,
        toolbar: { show: false },
        fontFamily: "IBM Plex Sans, sans-serif",
      },
      series: [
        {
          name: "Ingresos (Q)",
          data: productos.map((p) => Number(p.ingresos_generados || 0)),
        },
      ],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: "70%",
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: productos.map((p) => p.nombre_producto),
        labels: { formatter: (v) => `Q${Math.round(v / 1000)}k` },
      },
      colors: ["#14b8a6"],
      tooltip: {
        y: { formatter: (v) => money(v) },
      },
      grid: { borderColor: "#d7e0db" },
    };
    charts.barras = new ApexCharts(document.querySelector("#chart-barras"), options);
    charts.barras.render();
  }

  function renderRanking(rows) {
    const tbody = document.getElementById("tabla-ranking");
    const top = rows.slice(0, 12);
    tbody.innerHTML = top
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
      `Fuente: /api/clientes/ranking · Mostrando top ${top.length} de ${rows.length}`;
  }

  function renderCategorias(categorias) {
    destroyChart("categorias");
    const options = {
      chart: { type: "donut", height: 300, fontFamily: "IBM Plex Sans, sans-serif" },
      labels: categorias.map((c) => c.nombre_categoria),
      series: categorias.map((c) => Number(c.monto_total || 0)),
      colors: ["#2563eb", "#14b8a6", "#f59e0b", "#e11d48", "#8b5cf6"],
      legend: { position: "bottom" },
      dataLabels: { formatter: (val) => `${val.toFixed(1)}%` },
      tooltip: { y: { formatter: (v) => money(v) } }
    };
    charts.categorias = new ApexCharts(document.querySelector("#chart-categorias"), options);
    charts.categorias.render();
  }

  function renderTopCantidad(productos) {
    destroyChart("topCantidad");
    const options = {
      chart: { type: "bar", height: 360, toolbar: { show: false }, fontFamily: "IBM Plex Sans, sans-serif" },
      series: [{ name: "Cantidad", data: productos.map((p) => Number(p.total_unidades || 0)) }],
      plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: "70%" } },
      dataLabels: { enabled: false },
      xaxis: { categories: productos.map((p) => p.nombre_producto) },
      colors: ["#f59e0b"],
      tooltip: { y: { formatter: (v) => number(v) } },
      grid: { borderColor: "#d7e0db" }
    };
    charts.topCantidad = new ApexCharts(document.querySelector("#chart-top-cantidad"), options);
    charts.topCantidad.render();
  }

  function renderVIP(rows) {
    const tbody = document.getElementById("tabla-vip");
    tbody.innerHTML = (rows || []).map(r => `<tr><td>${r.nombre_cliente}</td><td>${money(r.monto_total)}</td></tr>`).join("");
  }

  function renderInactivos(rows) {
    const tbody = document.getElementById("tabla-inactivos");
    tbody.innerHTML = (rows || []).map(r => `<tr><td>${r.nombre_cliente}</td><td>${r.correo || "Sin correo"}</td></tr>`).join("");
  }

  function renderTarjetasKpis(promedios, multiples) {
    const container = document.getElementById("tarjetas-kpis");
    let html = "";
    (promedios || []).forEach(p => {
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
      lista.push(
        `${marcas[0].nombre_marca} lidera la participación con ${marcas[0].participacion_pct}% del monto.`
      );
    }
    if (tipos[0] && tipos[1]) {
      lista.push(
        `${tipos[0].tipo_tarjeta} supera a ${tipos[1].tipo_tarjeta} en monto (${money(tipos[0].monto_total)} vs ${money(tipos[1].monto_total)}).`
      );
    }
    if (productos[0]) {
      lista.push(
        `Producto top por ingresos: ${productos[0].nombre_producto} (${money(productos[0].ingresos_generados)}).`
      );
    }
    if (k.producto_mas_vendido) {
      lista.push(
        `Producto más vendido en unidades: ${k.producto_mas_vendido.nombre_producto}.`
      );
    }
    if (k.categoria_mayor_venta) {
      lista.push(
        `Categoría con mayor venta: ${k.categoria_mayor_venta.nombre_categoria} (${money(k.categoria_mayor_venta.monto_ventas)}).`
      );
    }
    if (evolucionFiltrada.length) {
      const topMes = [...evolucionFiltrada].sort(
        (a, b) => Number(b.ingresos) - Number(a.ingresos)
      )[0];
      lista.push(`Mes de mayor facturación en la vista: ${topMes.mes} (${money(topMes.ingresos)}).`);
    }

    document.getElementById("lista-hallazgos").innerHTML = lista
      .map((item) => `<li>${item}</li>`)
      .join("");
  }

  function applyView() {
    const filters = getFilters();
    const evolucionRaw = state.raw.evolucion?.data || [];
    const evolucion = filterByMonthRange(evolucionRaw, filters.desde, filters.hasta);

    const isResumen = state.activeTab === "resumen";
    const isTarjetas = state.activeTab === "tarjetas";
    const isProductos = state.activeTab === "productos";
    const isClientes = state.activeTab === "clientes";

    if (isResumen) {
      if (state.raw.kpis) renderKpis(state.raw.kpis.data, evolucion);
      if (state.raw.evolucion) renderLineChart(evolucion);
      if (state.raw.kpis) renderInsights(state.raw, evolucion);
    }
    
    if (isTarjetas) {
      if (state.raw.marcas) renderDonut(state.raw.marcas.data);
      if (state.raw.creditoDebito) renderComparativa(state.raw.creditoDebito.data);
      if (state.raw.tarjetasPromedioPorTipo && state.raw.tarjetasClientesMultiples) {
        renderTarjetasKpis(state.raw.tarjetasPromedioPorTipo.data, state.raw.tarjetasClientesMultiples.data);
      }
    }
    
    if (isProductos) {
      if (state.raw.topProductos) renderBarras(state.raw.topProductos.data);
      if (state.raw.productosCategorias) renderCategorias(state.raw.productosCategorias.data);
      if (state.raw.topProductosCantidad) renderTopCantidad(state.raw.topProductosCantidad.data);
    }

    if (isClientes) {
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
    if (!desde.min) desde.min = meses[0];
    if (!desde.max) desde.max = meses[meses.length - 1];
    if (!hasta.min) hasta.min = meses[0];
    if (!hasta.max) hasta.max = meses[meses.length - 1];
  }

  async function loadTabData(tabId) {
    try {
      document.getElementById("meta-estado").textContent = "API: cargando pestaña...";
      
      const tasks = [];
      if (tabId === "resumen") {
        if (!state.raw.kpis) tasks.push(Api.kpis().then(d => (state.raw.kpis = d)));
        if (!state.raw.evolucion) tasks.push(Api.evolucion().then(d => { state.raw.evolucion = d; initFilterBounds(d); }));
      } else if (tabId === "tarjetas") {
        if (!state.raw.marcas) tasks.push(Api.marcas().then(d => (state.raw.marcas = d)));
        if (!state.raw.creditoDebito) tasks.push(Api.creditoDebito().then(d => (state.raw.creditoDebito = d)));
        if (!state.raw.tarjetasPromedioPorTipo) tasks.push(Api.tarjetasPromedioPorTipo().then(d => (state.raw.tarjetasPromedioPorTipo = d)));
        if (!state.raw.tarjetasClientesMultiples) tasks.push(Api.tarjetasClientesMultiples().then(d => (state.raw.tarjetasClientesMultiples = d)));
      } else if (tabId === "productos") {
        if (!state.raw.topProductos) tasks.push(Api.topProductos().then(d => (state.raw.topProductos = d)));
        if (!state.raw.topProductosCantidad) tasks.push(Api.topProductosCantidad().then(d => (state.raw.topProductosCantidad = d)));
        if (!state.raw.productosCategorias) tasks.push(Api.productosCategorias().then(d => (state.raw.productosCategorias = d)));
      } else if (tabId === "clientes") {
        if (!state.raw.ranking) tasks.push(Api.rankingClientes().then(d => (state.raw.ranking = d)));
        if (!state.raw.clientesSobrePromedio) tasks.push(Api.clientesSobrePromedio().then(d => (state.raw.clientesSobrePromedio = d)));
        if (!state.raw.clientesSinCompras) tasks.push(Api.clientesSinCompras().then(d => (state.raw.clientesSinCompras = d)));
      }

      if (tasks.length > 0) {
        await Promise.all(tasks);
      }
      
      document.getElementById("meta-estado").textContent = "API: activa (lazy loaded)";
      applyView();
    } catch (error) {
      console.error(error);
      document.getElementById("meta-estado").textContent = "API: error";
      showToast("Error al cargar datos de la pestaña.");
    }
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.target === tabId);
    });

    document.querySelectorAll("[data-tab]").forEach(el => {
      if (el.dataset.tab === tabId) {
        el.classList.remove("hidden");
      } else {
        el.classList.add("hidden");
      }
    });

    loadTabData(tabId);
  }

  async function init() {
    try {
      document.getElementById("meta-estado").textContent = "API: conectando…";
      const health = await Api.health();
      document.getElementById("meta-estado").textContent = health.database?.ok ? "API: Oracle OK" : "API: activa";
    } catch (e) {
      document.getElementById("meta-estado").textContent = "API: error";
    }

    const inputDesde = document.getElementById("filtro-desde");
    const inputHasta = document.getElementById("filtro-hasta");

    document.getElementById("btn-aplicar").addEventListener("click", applyView);
    document.getElementById("btn-limpiar").addEventListener("click", () => {
      inputDesde.value = "";
      inputHasta.value = "";
      document.getElementById("filtro-tipo").value = "TODOS";
      // Restaurar los min y max que se establecieron al cargar la data
      if (state.raw.evolucion && state.raw.evolucion.data) {
         initFilterBounds(state.raw.evolucion);
      }
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

    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        switchTab(e.target.dataset.target);
      });
    });

    switchTab("resumen");
  }

  init();
})();
