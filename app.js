const DEFAULT_CONFIG = {
  fpLighting: 1,
  fpTug: 0.8,
  fpTue: 1,
  limitMono: 12000,
  limitBi: 25000,
};

const ROOM_TYPES = {
  geral: 'Geral: sala/quarto/corredor',
  cozinha: 'Cozinha/copa/área de serviço',
  banheiro: 'Banheiro',
};

const sampleRooms = [
  { nome: 'Área de serviço', tipo: 'cozinha', comprimento: 1.75, largura: 3.40, areaManual: 5.95, perimetroManual: 10.30, tugsPlanejadas: 3, tues: [ { desc: 'Máquina de lavar', potenciaW: 1000, qtd: 1 }, { desc: 'Tanque elétrico', potenciaW: 600, qtd: 1 } ] },
  { nome: 'Cozinha', tipo: 'cozinha', comprimento: 3.05, largura: 3.75, areaManual: 11.43, perimetroManual: 13.60, tugsPlanejadas: 4, tues: [ { desc: 'Geladeira', potenciaW: 300, qtd: 1 }, { desc: 'Micro-ondas', potenciaW: 1200, qtd: 1 }, { desc: 'Forno elétrico', potenciaW: 1500, qtd: 1 }, { desc: 'Purificador', potenciaW: 100, qtd: 1 } ] },
  { nome: 'Dormitório 2', tipo: 'geral', comprimento: 3.05, largura: 4.10, areaManual: 12.71, perimetroManual: 13.10, tugsPlanejadas: 3, tues: [ { desc: 'Ar-condicionado', potenciaW: 1200, qtd: 1 } ] },
  { nome: 'Banheiro', tipo: 'banheiro', comprimento: 1.80, largura: 2.30, areaManual: 4.14, perimetroManual: 8.20, tugsPlanejadas: 1, tues: [ { desc: 'Chuveiro elétrico', potenciaW: 5500, qtd: 1 } ] },
  { nome: 'Copa', tipo: 'cozinha', comprimento: 3.10, largura: 3.05, areaManual: 9.45, perimetroManual: 12.30, tugsPlanejadas: 4, tues: [] },
  { nome: 'Dormitório 1', tipo: 'geral', comprimento: 3.05, largura: 3.40, areaManual: 11.05, perimetroManual: 13.30, tugsPlanejadas: 3, tues: [ { desc: 'Ar-condicionado', potenciaW: 1200, qtd: 1 } ] },
  { nome: 'Sala', tipo: 'geral', comprimento: 3.05, largura: 3.25, areaManual: 9.91, perimetroManual: 12.60, tugsPlanejadas: 3, tues: [ { desc: 'TV', potenciaW: 150, qtd: 1 }, { desc: 'Ventilador', potenciaW: 150, qtd: 1 } ] },
  { nome: 'Corredor', tipo: 'geral', comprimento: 1.90, largura: 2.50, areaManual: 4.76, perimetroManual: 5.50, tugsPlanejadas: 1, tues: [] },
];

let state = loadState() || {
  project: {
    name: '',
    className: '',
    date: new Date().toISOString().slice(0, 10),
    voltage: '127/220 V',
  },
  config: { ...DEFAULT_CONFIG },
  rooms: [],
};

function uid() {
  return crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function withIds(room) {
  return {
    id: room.id || uid(),
    nome: room.nome || '',
    tipo: room.tipo || 'geral',
    comprimento: Number(room.comprimento) || 0,
    largura: Number(room.largura) || 0,
    areaManual: Number(room.areaManual) || 0,
    perimetroManual: Number(room.perimetroManual) || 0,
    tugsPlanejadas: Number(room.tugsPlanejadas) || 0,
    tues: (room.tues || []).map(t => ({ id: t.id || uid(), desc: t.desc || '', potenciaW: Number(t.potenciaW) || 0, qtd: Number(t.qtd) || 1 })),
  };
}

function normalizeState() {
  state.config = { ...DEFAULT_CONFIG, ...(state.config || {}) };
  state.project = { name: '', className: '', date: '', voltage: '127/220 V', ...(state.project || {}) };
  state.rooms = (state.rooms || []).map(withIds);
}
normalizeState();

function loadState() {
  try {
    const raw = localStorage.getItem('ibt-prototipo-v1');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(silent = false) {
  localStorage.setItem('ibt-prototipo-v1', JSON.stringify(state));
  if (!silent) alert('Projeto salvo no navegador.');
}

function n(value, decimals = 2) {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function ni(value) {
  return Math.round(Number(value) || 0).toLocaleString('pt-BR');
}

function parseNum(value) {
  if (typeof value === 'number') return value;
  return Number(String(value).replace(',', '.')) || 0;
}

function getArea(room) {
  return room.areaManual > 0 ? room.areaManual : room.comprimento * room.largura;
}

function getPerimeter(room) {
  return room.perimetroManual > 0 ? room.perimetroManual : 2 * (room.comprimento + room.largura);
}

function calcLightingVA(area) {
  if (area <= 0) return 0;
  if (area <= 6) return 100;
  return 100 + Math.ceil((area - 6) / 4) * 60;
}

function calcMinTugs(room) {
  const area = getArea(room);
  const perimeter = getPerimeter(room);
  if (area <= 0 && perimeter <= 0) return 0;
  if (room.tipo === 'banheiro') return 1;
  if (room.tipo === 'cozinha') return Math.max(1, Math.ceil(perimeter / 3.5));
  if (area <= 6) return 1;
  return Math.max(1, Math.ceil(perimeter / 5));
}

function getPlannedTugs(room) {
  const min = calcMinTugs(room);
  return Math.max(Number(room.tugsPlanejadas) || 0, min);
}

function calcTugVA(room) {
  const q = getPlannedTugs(room);
  if (q <= 0) return 0;
  if (room.tipo === 'cozinha' || room.tipo === 'banheiro') {
    return Math.min(q, 3) * 600 + Math.max(q - 3, 0) * 100;
  }
  return q * 100;
}

function calcTueCount(room) {
  return (room.tues || []).reduce((sum, item) => sum + (Number(item.qtd) || 0), 0);
}

function calcTuePowerW(room) {
  return (room.tues || []).reduce((sum, item) => sum + (Number(item.qtd) || 0) * (Number(item.potenciaW) || 0), 0);
}

function calcTueDescription(room) {
  if (!room.tues || room.tues.length === 0) return '—';
  return room.tues
    .filter(t => t.desc || t.potenciaW)
    .map(t => `${t.qtd || 1}x ${t.desc || 'TUE'} (${ni(t.potenciaW)} W)`)
    .join('; ');
}

function totals() {
  const lightingVA = state.rooms.reduce((s, r) => s + calcLightingVA(getArea(r)), 0);
  const tugVA = state.rooms.reduce((s, r) => s + calcTugVA(r), 0);
  const tueW = state.rooms.reduce((s, r) => s + calcTuePowerW(r), 0);
  const fpL = Math.max(parseNum(state.config.fpLighting), 0.01);
  const fpTug = Math.max(parseNum(state.config.fpTug), 0.01);
  const fpTue = Math.max(parseNum(state.config.fpTue), 0.01);
  const activeLighting = lightingVA * fpL;
  const activeTug = tugVA * fpTug;
  const activeTue = tueW;
  const apparentTue = tueW / fpTue;
  return {
    lightingVA,
    tugVA,
    tueW,
    apparentTue,
    totalApparent: lightingVA + tugVA + apparentTue,
    activeLighting,
    activeTug,
    activeTue,
    totalActive: activeLighting + activeTug + activeTue,
  };
}

function suggestMeter(activeW) {
  const mono = Number(state.config.limitMono) || DEFAULT_CONFIG.limitMono;
  const bi = Number(state.config.limitBi) || DEFAULT_CONFIG.limitBi;
  if (activeW <= mono) return { tipo: 'Monofásico', fornecimento: '2 fios', tensao: state.project.voltage || '127/220 V' };
  if (activeW <= bi) return { tipo: 'Bifásico', fornecimento: '3 fios', tensao: state.project.voltage || '127/220 V' };
  return { tipo: 'Trifásico', fornecimento: '4 fios', tensao: state.project.voltage || '127/220 V' };
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value);
  });
  [].concat(children).filter(Boolean).forEach(child => node.append(child.nodeType ? child : document.createTextNode(child)));
  return node;
}

function bindProjectAndConfig() {
  const ids = {
    projectName: ['project', 'name'],
    projectClass: ['project', 'className'],
    projectDate: ['project', 'date'],
    projectVoltage: ['project', 'voltage'],
    fpLighting: ['config', 'fpLighting'],
    fpTug: ['config', 'fpTug'],
    fpTue: ['config', 'fpTue'],
    limitMono: ['config', 'limitMono'],
    limitBi: ['config', 'limitBi'],
  };
  Object.entries(ids).forEach(([id, path]) => {
    const input = document.getElementById(id);
    input.value = state[path[0]][path[1]] ?? '';
    input.onchange = () => {
      const value = input.type === 'number' ? parseNum(input.value) : input.value;
      state[path[0]][path[1]] = value;
      saveState(true);
      renderAll(false);
    };
  });
}

function renderRooms() {
  const tbody = document.getElementById('roomsBody');
  tbody.innerHTML = '';
  if (state.rooms.length === 0) {
    tbody.append(document.getElementById('roomEmptyTemplate').content.cloneNode(true));
    return;
  }
  state.rooms.forEach((room, index) => {
    const tr = el('tr');
    tr.append(
      tdInput(room, 'nome', 'text', 'Ex.: Sala'),
      tdSelect(room, 'tipo', ROOM_TYPES),
      tdInput(room, 'comprimento', 'number', '', '0.01'),
      tdInput(room, 'largura', 'number', '', '0.01'),
      tdInput(room, 'areaManual', 'number', '', '0.01'),
      tdInput(room, 'perimetroManual', 'number', '', '0.01'),
      el('td', { class: 'number', text: n(getArea(room)) }),
      el('td', { class: 'number', text: n(getPerimeter(room)) }),
      el('td', { class: 'number', text: String(calcMinTugs(room)) }),
      tdInput(room, 'tugsPlanejadas', 'number', '', '1'),
      el('td', {}, [
        el('div', { class: 'hero-actions' }, [
          el('button', { class: 'ghost', onclick: () => moveRoom(index, -1), title: 'Subir' }, ['↑']),
          el('button', { class: 'ghost', onclick: () => moveRoom(index, 1), title: 'Descer' }, ['↓']),
          el('button', { class: 'danger', onclick: () => removeRoom(room.id) }, ['Excluir']),
        ])
      ])
    );
    tbody.append(tr);
  });
}

function tdInput(room, field, type, placeholder = '', step = '') {
  const input = el('input', { type, value: room[field] ?? '', placeholder, class: 'small-input' });
  if (step) input.step = step;
  if (type === 'number') input.min = '0';
  input.addEventListener('change', () => {
    room[field] = type === 'number' ? parseNum(input.value) : input.value;
    if (field === 'tipo' || field === 'areaManual' || field === 'perimetroManual' || field === 'comprimento' || field === 'largura') {
      room.tugsPlanejadas = Math.max(Number(room.tugsPlanejadas) || 0, calcMinTugs(room));
    }
    saveState(true);
    renderAll(false);
  });
  return el('td', {}, [input]);
}

function tdSelect(room, field, options) {
  const select = el('select');
  Object.entries(options).forEach(([value, label]) => {
    const option = el('option', { value, text: label });
    if (room[field] === value) option.selected = true;
    select.append(option);
  });
  select.addEventListener('change', () => {
    room[field] = select.value;
    room.tugsPlanejadas = Math.max(Number(room.tugsPlanejadas) || 0, calcMinTugs(room));
    saveState(true);
    renderAll(false);
  });
  return el('td', {}, [select]);
}

function renderTueEditors() {
  const container = document.getElementById('tueEditors');
  container.innerHTML = '';
  if (state.rooms.length === 0) {
    container.append(el('p', { class: 'empty', text: 'Cadastre dependências para adicionar TUEs.' }));
    return;
  }
  state.rooms.forEach(room => {
    const details = el('details', { class: 'tue-card' });
    const count = calcTueCount(room);
    details.append(el('summary', { text: `${room.nome || 'Sem nome'} — ${count} TUE(s), ${ni(calcTuePowerW(room))} W` }));
    const toolbar = el('div', { class: 'tue-toolbar' }, [
      el('span', { class: 'badge', text: calcTueDescription(room) }),
      el('button', { class: 'secondary', onclick: () => addTue(room.id) }, ['+ Adicionar TUE'])
    ]);
    const table = el('table', { class: 'data-table tue-table' });
    table.innerHTML = '<thead><tr><th>Equipamento / discriminação</th><th>Potência (W)</th><th>Quantidade</th><th>Total (W)</th><th>Ações</th></tr></thead>';
    const tbody = el('tbody');
    if (!room.tues || room.tues.length === 0) {
      tbody.append(el('tr', {}, [el('td', { colspan: '5', class: 'empty', text: 'Nenhum TUE cadastrado para esta dependência.' })]));
    } else {
      room.tues.forEach(item => {
        const tr = el('tr');
        const desc = el('input', { type: 'text', value: item.desc || '', placeholder: 'Ex.: Chuveiro elétrico' });
        desc.addEventListener('change', () => { item.desc = desc.value; saveState(true); renderAll(false); });
        const p = el('input', { type: 'number', value: item.potenciaW || 0, min: '0', step: '10' });
        p.addEventListener('change', () => { item.potenciaW = parseNum(p.value); saveState(true); renderAll(false); });
        const q = el('input', { type: 'number', value: item.qtd || 1, min: '0', step: '1' });
        q.addEventListener('change', () => { item.qtd = parseNum(q.value); saveState(true); renderAll(false); });
        tr.append(
          el('td', {}, [desc]),
          el('td', {}, [p]),
          el('td', {}, [q]),
          el('td', { class: 'number', text: ni((item.potenciaW || 0) * (item.qtd || 0)) }),
          el('td', {}, [el('button', { class: 'danger', onclick: () => removeTue(room.id, item.id) }, ['Excluir'])])
        );
        tbody.append(tr);
      });
    }
    table.append(tbody);
    details.append(toolbar, el('div', { class: 'table-wrap' }, [table]));
    container.append(details);
  });
}

function moveRoom(index, direction) {
  const next = index + direction;
  if (next < 0 || next >= state.rooms.length) return;
  const [item] = state.rooms.splice(index, 1);
  state.rooms.splice(next, 0, item);
  saveState(true);
  renderAll(false);
}

function addRoom() {
  const room = withIds({ nome: `Dependência ${state.rooms.length + 1}`, tipo: 'geral', comprimento: 0, largura: 0, tugsPlanejadas: 1, tues: [] });
  state.rooms.push(room);
  saveState(true);
  renderAll(false);
}

function removeRoom(id) {
  if (!confirm('Excluir esta dependência?')) return;
  state.rooms = state.rooms.filter(r => r.id !== id);
  saveState(true);
  renderAll(false);
}

function addTue(roomId) {
  const room = state.rooms.find(r => r.id === roomId);
  if (!room) return;
  room.tues.push({ id: uid(), desc: 'Novo TUE', potenciaW: 0, qtd: 1 });
  saveState(true);
  renderAll(false);
}

function removeTue(roomId, tueId) {
  const room = state.rooms.find(r => r.id === roomId);
  if (!room) return;
  room.tues = room.tues.filter(t => t.id !== tueId);
  saveState(true);
  renderAll(false);
}

function renderTable(tableId, headers, rows, footerRows = []) {
  const table = document.getElementById(tableId);
  table.innerHTML = '';
  const thead = el('thead');
  thead.append(el('tr', {}, headers.map(h => el('th', { text: h }))));
  const tbody = el('tbody');
  if (rows.length === 0) {
    tbody.append(el('tr', {}, [el('td', { colspan: String(headers.length), class: 'empty', text: 'Sem dados.' })]));
  } else {
    rows.forEach(row => tbody.append(el('tr', {}, row.map(cell => el('td', { class: typeof cell === 'number' ? 'number' : '', text: String(cell) })))));
  }
  table.append(thead, tbody);
  if (footerRows.length) {
    const tfoot = el('tfoot');
    footerRows.forEach(row => tfoot.append(el('tr', {}, row.map(cell => el('td', { class: typeof cell === 'number' ? 'number' : '', text: String(cell) })))));
    table.append(tfoot);
  }
}

function renderResultTables() {
  renderTable('tableLighting',
    ['Dependência', 'Área (m²)', 'Perímetro (m)', 'Potência de iluminação (VA)'],
    state.rooms.map(r => [r.nome || '—', n(getArea(r)), n(getPerimeter(r)), ni(calcLightingVA(getArea(r)))]),
    [['TOTAL', '', '', ni(totals().lightingVA)]]
  );

  renderTable('tableMin',
    ['Dependência', 'Área (m²)', 'Perímetro (m)', 'Quantidade mínima TUGs', 'Quantidade TUEs'],
    state.rooms.map(r => [r.nome || '—', n(getArea(r)), n(getPerimeter(r)), calcMinTugs(r), calcTueCount(r)]),
    [['TOTAL', '', '', state.rooms.reduce((s, r) => s + calcMinTugs(r), 0), state.rooms.reduce((s, r) => s + calcTueCount(r), 0)]]
  );

  renderTable('tablePrediction',
    ['Dependência', 'TUGs previstas', 'Carga TUGs (VA)', 'TUEs previstas', 'Potência TUEs (W)'],
    state.rooms.map(r => [r.nome || '—', getPlannedTugs(r), ni(calcTugVA(r)), calcTueCount(r), ni(calcTuePowerW(r))]),
    [['TOTAL', state.rooms.reduce((s, r) => s + getPlannedTugs(r), 0), ni(totals().tugVA), state.rooms.reduce((s, r) => s + calcTueCount(r), 0), ni(totals().tueW)]]
  );

  renderTable('tableObtained',
    ['Dependência', 'Área (m²)', 'Perímetro (m)', 'Iluminação (VA)', 'Quant. TUGs', 'Potência TUGs (VA)', 'Discriminação TUEs', 'Potência TUEs (W)'],
    state.rooms.map(r => [r.nome || '—', n(getArea(r)), n(getPerimeter(r)), ni(calcLightingVA(getArea(r))), getPlannedTugs(r), ni(calcTugVA(r)), calcTueDescription(r), ni(calcTuePowerW(r))]),
    [['TOTAL', '', '', ni(totals().lightingVA), state.rooms.reduce((s, r) => s + getPlannedTugs(r), 0), ni(totals().tugVA), '', ni(totals().tueW)]]
  );

  const total = totals();
  const meter = suggestMeter(total.totalActive);
  renderTable('tableActive',
    ['Cargas', 'Potência aparente (VA)', 'Fator de potência', 'Potência ativa (W)'],
    [
      ['Iluminação', ni(total.lightingVA), n(state.config.fpLighting), ni(total.activeLighting)],
      ['TUGs', ni(total.tugVA), n(state.config.fpTug), ni(total.activeTug)],
      ['TUEs', ni(total.apparentTue), n(state.config.fpTue), ni(total.activeTue)],
      ['TOTAL', ni(total.totalApparent), '—', ni(total.totalActive)],
      ['Tipo de medidor', meter.tipo, 'Fornecimento', meter.fornecimento],
      ['Tensão', meter.tensao, 'Potência ativa total medidor', `${ni(total.totalActive)} W`],
    ]
  );
}

function renderAll(syncInputs = true) {
  if (syncInputs) bindProjectAndConfig();
  renderRooms();
  renderTueEditors();
  renderResultTables();
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function download(name, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildCsv() {
  const sections = [];
  const addSection = (title, headers, rows) => {
    sections.push([title]);
    sections.push(headers);
    rows.forEach(r => sections.push(r));
    sections.push([]);
  };
  addSection('Tabela 01 - Iluminacao', ['Dependencia', 'Area m2', 'Perimetro m', 'Iluminacao VA'], state.rooms.map(r => [r.nome, n(getArea(r)), n(getPerimeter(r)), ni(calcLightingVA(getArea(r)))]));
  addSection('Tabela 02 - TUGs e TUEs minimas', ['Dependencia', 'Area m2', 'Perimetro m', 'TUG min', 'TUEs'], state.rooms.map(r => [r.nome, n(getArea(r)), n(getPerimeter(r)), calcMinTugs(r), calcTueCount(r)]));
  addSection('Tabela 03 - Previsao', ['Dependencia', 'TUGs', 'TUGs VA', 'TUEs', 'TUEs W'], state.rooms.map(r => [r.nome, getPlannedTugs(r), ni(calcTugVA(r)), calcTueCount(r), ni(calcTuePowerW(r))]));
  addSection('Tabela 04 - Cargas obtidas', ['Dependencia', 'Area m2', 'Perimetro m', 'Iluminacao VA', 'TUGs', 'TUGs VA', 'TUEs', 'TUEs W'], state.rooms.map(r => [r.nome, n(getArea(r)), n(getPerimeter(r)), ni(calcLightingVA(getArea(r))), getPlannedTugs(r), ni(calcTugVA(r)), calcTueDescription(r), ni(calcTuePowerW(r))]));
  const t = totals();
  addSection('Tabela 05 - Potencia ativa', ['Carga', 'Pot aparente VA', 'FP', 'Pot ativa W'], [['Iluminacao', ni(t.lightingVA), n(state.config.fpLighting), ni(t.activeLighting)], ['TUGs', ni(t.tugVA), n(state.config.fpTug), ni(t.activeTug)], ['TUEs', ni(t.apparentTue), n(state.config.fpTue), ni(t.activeTue)], ['TOTAL', ni(t.totalApparent), '', ni(t.totalActive)]]);
  return sections.map(row => row.map(csvEscape).join(';')).join('\n');
}

function buildMarkdown() {
  const total = totals();
  const meter = suggestMeter(total.totalActive);
  return `# Instalações Elétricas de Baixa Tensão\n\n` +
    `**Nome:** ${state.project.name || '-'}  \n**Turma:** ${state.project.className || '-'}  \n**Data:** ${state.project.date || '-'}  \n\n` +
    `## Resumo\n\n` +
    `- Iluminação: ${ni(total.lightingVA)} VA / ${ni(total.activeLighting)} W\n` +
    `- TUGs: ${ni(total.tugVA)} VA / ${ni(total.activeTug)} W\n` +
    `- TUEs: ${ni(total.apparentTue)} VA / ${ni(total.activeTue)} W\n` +
    `- Potência ativa total: ${ni(total.totalActive)} W\n` +
    `- Medidor sugerido: ${meter.tipo} (${meter.fornecimento}) — ${meter.tensao}\n\n` +
    `> Protótipo didático; revisar regras, fatores e limites conforme orientação do professor/concessionária.\n`;
}

function initButtons() {
  document.getElementById('btnAddRoom').onclick = addRoom;
  document.getElementById('btnSave').onclick = () => saveState(false);
  document.getElementById('btnPrint').onclick = () => window.print();
  document.getElementById('btnResetConfig').onclick = () => {
    state.config = { ...DEFAULT_CONFIG };
    saveState(true);
    renderAll(true);
  };
  document.getElementById('btnSample').onclick = () => {
    if (state.rooms.length && !confirm('Substituir as dependências atuais pelo exemplo das fotos?')) return;
    state.rooms = sampleRooms.map(withIds);
    saveState(true);
    renderAll(true);
  };
  document.getElementById('btnCsv').onclick = () => download('tabelas-instalacoes-baixa-tensao.csv', buildCsv(), 'text/csv;charset=utf-8');
  document.getElementById('btnJson').onclick = () => download('projeto-instalacoes-baixa-tensao.json', JSON.stringify(state, null, 2), 'application/json');
  document.getElementById('btnMarkdown').onclick = async () => {
    const md = buildMarkdown();
    try {
      await navigator.clipboard.writeText(md);
      alert('Resumo copiado em Markdown.');
    } catch {
      download('resumo-instalacoes-baixa-tensao.md', md, 'text/markdown');
    }
  };
  document.getElementById('importJson').onchange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      state = imported;
      normalizeState();
      saveState(true);
      renderAll(true);
    } catch {
      alert('Arquivo JSON inválido.');
    } finally {
      event.target.value = '';
    }
  };
}

initButtons();
renderAll(true);
