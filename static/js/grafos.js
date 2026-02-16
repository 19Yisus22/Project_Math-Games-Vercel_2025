const state = { 
    nodes: [], 
    edges: [], 
    nextNodeId: 1, 
    selected: null, 
    edgeMode: false, 
    deleteMode: false, 
    dragMode: true, 
    colorMode: false, 
    pathMode: false, 
    selectedForEdge: null, 
    selectedPath: [] 
};

const COLORS = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#06B6D4", "#F472B6", "#A3E635"];
const svg = document.getElementById('svg');
const status = document.getElementById('status');
const paletteDiv = document.getElementById('palette');
const toastContainer = document.getElementById('toastContainer');

const buttons = {
    edge: document.getElementById('edgeModeBtn'),
    delete: document.getElementById('deleteModeBtn'),
    drag: document.getElementById('dragModeBtn'),
    color: document.getElementById('colorModeBtn'),
    path: document.getElementById('pathModeBtn')
};

function setStatus() {
    let modes = [];
    if (state.dragMode) modes.push('<span class="badge bg-primary">Mover</span>');
    if (state.colorMode) modes.push('<span class="badge bg-info">Pintar</span>');
    if (state.edgeMode) modes.push('<span class="badge bg-warning text-dark">Conectar</span>');
    if (state.deleteMode) modes.push('<span class="badge bg-danger">Eliminar</span>');
    if (state.pathMode) modes.push('<span class="badge bg-success">Ruta</span>');
    status.innerHTML = modes.length ? modes.join(' ') : '<span class="badge bg-secondary">Reposo</span>';
}

function resetModes(except) {
    Object.keys(buttons).forEach(key => {
        const modeKey = key + 'Mode';
        if (modeKey !== except) state[modeKey] = false;
    });
    state.selectedForEdge = null;
    if (except !== 'pathMode') state.selectedPath = [];
}

function updateUI() {
    Object.keys(buttons).forEach(key => {
        buttons[key].classList.toggle('active', state[key + 'Mode']);
    });
    setStatus();
    render();
}

function addNodeAt(x, y) {
    const node = { id: state.nextNodeId++, x, y, color: null };
    state.nodes.push(node);
    showToast(`Nodo ${node.id} creado`, 'info');
    render();
}

function addEdge(u, v) {
    if (u === v || state.edges.some(e => (e.u === u && e.v === v) || (e.u === v && e.v === u))) return;
    state.edges.push({ id: `e${Date.now()}`, u, v });
    showToast('Conexión creada', 'success');
}

function buildAdj() {
    const adj = {};
    state.nodes.forEach(n => adj[n.id] = []);
    state.edges.forEach(e => {
        if (adj[e.u]) adj[e.u].push(e.v);
        if (adj[e.v]) adj[e.v].push(e.u);
    });
    return adj;
}

function bfsPath(start, end) {
    const adj = buildAdj();
    const queue = [[start]];
    const visited = new Set([start]);
    while (queue.length) {
        const path = queue.shift();
        const node = path[path.length - 1];
        if (node === end) return path;
        (adj[node] || []).forEach(neighbor => {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push([...path, neighbor]);
            }
        });
    }
    return null;
}

function render() {
    svg.innerHTML = `
        <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
            </filter>
        </defs>
    `;

    state.edges.forEach(e => {
        const u = state.nodes.find(n => n.id === e.u);
        const v = state.nodes.find(n => n.id === e.v);
        if (!u || !v) return;

        let isHighlighted = false;
        if (state.selectedPath.length > 1) {
            for (let i = 0; i < state.selectedPath.length - 1; i++) {
                if ((state.selectedPath[i] === u.id && state.selectedPath[i+1] === v.id) ||
                    (state.selectedPath[i] === v.id && state.selectedPath[i+1] === u.id)) {
                    isHighlighted = true; break;
                }
            }
        }

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', u.x); line.setAttribute('y1', u.y);
        line.setAttribute('x2', v.x); line.setAttribute('y2', v.y);
        line.setAttribute('stroke', isHighlighted ? '#FBBF24' : (u.color && v.color && u.color === v.color ? '#EF4444' : '#4B5563'));
        line.setAttribute('stroke-width', isHighlighted ? 6 : 3);
        line.setAttribute('stroke-linecap', 'round');
        line.style.transition = "all 0.2s ease";
        svg.appendChild(line);
    });

    state.nodes.forEach(n => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${n.x},${n.y})`);
        g.style.cursor = state.dragMode ? 'move' : 'pointer';

        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('r', 18);
        c.setAttribute('fill', n.color || '#1F2937');
        c.setAttribute('stroke', state.selectedForEdge?.id === n.id ? '#F59E0B' : '#374151');
        c.setAttribute('stroke-width', state.selectedForEdge?.id === n.id ? 4 : 2);
        c.setAttribute('filter', 'url(#shadow)');

        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('y', 5);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('fill', '#FFFFFF');
        t.setAttribute('font-size', '12px');
        t.setAttribute('font-weight', 'bold');
        t.style.userSelect = 'none';
        t.style.pointerEvents = 'none';
        t.textContent = n.id;

        g.appendChild(c);
        g.appendChild(t);
        g.addEventListener('mousedown', (e) => onNodeMouseDown(e, n));
        g.addEventListener('click', (e) => { e.stopPropagation(); onNodeClick(n); });
        svg.appendChild(g);
    });

    updateMetrics();
}

function onNodeClick(node) {
    if (state.deleteMode) {
        state.edges = state.edges.filter(e => e.u !== node.id && e.v !== node.id);
        state.nodes = state.nodes.filter(n => n.id !== node.id);
        render();
        return;
    }
    if (state.colorMode) {
        node.color = node.color === currentPaletteColor ? null : currentPaletteColor;
        render();
        return;
    }
    if (state.edgeMode) {
        if (!state.selectedForEdge) {
            state.selectedForEdge = node;
            render();
        } else {
            addEdge(state.selectedForEdge.id, node.id);
            state.selectedForEdge = null;
            render();
        }
        return;
    }
    if (state.pathMode) {
        if (state.selectedPath.length >= 2) state.selectedPath = [];
        state.selectedPath.push(node.id);
        if (state.selectedPath.length === 2) {
            const path = bfsPath(state.selectedPath[0], state.selectedPath[1]);
            if (path) {
                state.selectedPath = path;
                showToast('Ruta optimizada encontrada', 'success');
            } else {
                showToast('No hay conexión disponible', 'warning');
                state.selectedPath = [];
            }
        }
        render();
    }
}

let drag = null;
function onNodeMouseDown(e, node) {
    if (!state.dragMode || e.button !== 0) return;
    drag = { node, ox: e.clientX, oy: e.clientY };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e) {
    if (!drag) return;
    const dx = e.clientX - drag.ox;
    const dy = e.clientY - drag.oy;
    drag.node.x = Math.max(20, Math.min(svg.clientWidth - 20, drag.node.x + dx));
    drag.node.y = Math.max(20, Math.min(svg.clientHeight - 20, drag.node.y + dy));
    drag.ox = e.clientX; drag.oy = e.clientY;
    render();
}

function onMouseUp() {
    drag = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
}

function updateMetrics() {
    const adj = buildAdj();
    const visited = new Set();
    let comps = 0;
    state.nodes.forEach(n => {
        if (!visited.has(n.id)) {
            comps++;
            const q = [n.id]; visited.add(n.id);
            while (q.length) {
                const u = q.pop();
                (adj[u] || []).forEach(v => { if (!visited.has(v)) { visited.add(v); q.push(v); } });
            }
        }
    });
    document.getElementById('nodeCount').textContent = state.nodes.length;
    document.getElementById('edgeCount').textContent = state.edges.length;
    document.getElementById('components').textContent = comps;
}

function showToast(msj, type) {
    const t = document.createElement('div');
    t.className = `toast show align-items-center text-bg-${type} border-0 mb-2`;
    t.innerHTML = `<div class="d-flex"><div class="toast-body">${msj}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
    toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

let currentPaletteColor = COLORS[0];
COLORS.forEach((c, i) => {
    const d = document.createElement('div');
    d.className = 'color-dot' + (i === 0 ? ' active' : '');
    d.style.background = c;
    d.onclick = () => {
        document.querySelectorAll('.color-dot').forEach(el => el.classList.remove('active'));
        d.classList.add('active');
        currentPaletteColor = c;
    };
    paletteDiv.appendChild(d);
});

buttons.edge.onclick = () => { resetModes('edgeMode'); state.edgeMode = !state.edgeMode; updateUI(); };
buttons.delete.onclick = () => { resetModes('deleteMode'); state.deleteMode = !state.deleteMode; updateUI(); };
buttons.drag.onclick = () => { resetModes('dragMode'); state.dragMode = !state.dragMode; updateUI(); };
buttons.color.onclick = () => { resetModes('colorMode'); state.colorMode = !state.colorMode; updateUI(); };
buttons.path.onclick = () => { resetModes('pathMode'); state.pathMode = !state.pathMode; updateUI(); };

document.getElementById('addNodeBtn').onclick = () => addNodeAt(svg.clientWidth / 2, svg.clientHeight / 2);
document.getElementById('clearBtn').onclick = () => { if(confirm('¿Limpiar todo?')) { state.nodes=[]; state.edges=[]; state.nextNodeId=1; render(); } };

svg.onclick = (e) => { if(e.target === svg) { addNodeAt(e.offsetX, e.offsetY); } };

render();
setStatus();
