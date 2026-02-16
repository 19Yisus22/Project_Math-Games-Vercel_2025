const difficulties = { easy: 40, medium: 30, hard: 22 }
let solution = []
let puzzle = []
let startTime = 0
let elapsed = 0
let running = false
let rafId = null
let currentDifficulty = 'easy'
let score = 0
let showCandidates = false
const boardEl = document.getElementById('board')
const timerText = document.getElementById('timerText')
const scoreText = document.getElementById('scoreText')
const toastContainer = document.getElementById('toastContainer')

function seedShuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t
    }
    return arr
}

function pattern(r, c) { return (3 * (r % 3) + Math.floor(r / 3) + c) % 9 }

function generateFull() {
    let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    seedShuffle(nums)
    let grid = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => nums[pattern(r, c)]))
    for (let i = 0; i < 50; i++) {
        let band = Math.floor(Math.random() * 3)
        let r1 = Math.floor(Math.random() * 3) + band * 3
        let r2 = Math.floor(Math.random() * 3) + band * 3
        for (let j = 0; j < 9; j++) { let t = grid[r1][j]; grid[r1][j] = grid[r2][j]; grid[r2][j] = t }
        let bandc = Math.floor(Math.random() * 3)
        let c1 = Math.floor(Math.random() * 3) + bandc * 3
        let c2 = Math.floor(Math.random() * 3) + bandc * 3
        for (let j = 0; j < 9; j++) { let t = grid[j][c1]; grid[j][c1] = grid[j][c2]; grid[j][c2] = t }
    }
    return grid
}

function removeCells(full, filledCount) {
    let g = full.map(r => r.slice())
    let toRemove = 81 - filledCount
    while (toRemove > 0) {
        let pos = Math.floor(Math.random() * 81)
        let r = Math.floor(pos / 9), c = pos % 9
        if (g[r][c] !== 0) { g[r][c] = 0; toRemove-- }
    }
    return g
}

function startGame(level) {
    currentDifficulty = level
    solution = generateFull()
    puzzle = removeCells(solution, difficulties[level])
    renderBoard()
    score = 0
    scoreText.textContent = 'Puntuación: 0'
    resetTimer()
    startTimer()
    persistCurrent()
}

function renderBoard() {
    boardEl.innerHTML = ''
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const value = puzzle[r][c]
            const wrapper = document.createElement('div')
            wrapper.className = 'cell-wrap position-relative'
            const input = document.createElement('input')
            input.className = 'cell'
            input.type = 'text'
            input.inputMode = 'numeric'
            input.dataset.r = r
            input.dataset.c = c
            if (value !== 0) {
                input.value = value
                input.readOnly = true
                input.classList.add('fixed')
            } else {
                input.value = ''
                input.addEventListener('input', onInput)
                input.addEventListener('keydown', onKeyDown)
                input.addEventListener('focus', onFocus)
                input.addEventListener('blur', onBlur)
            }
            const candDiv = document.createElement('div')
            candDiv.className = 'candidates position-absolute text-muted small'
            candDiv.style.pointerEvents = 'none'
            wrapper.appendChild(input)
            wrapper.appendChild(candDiv)
            boardEl.appendChild(wrapper)
        }
    }
    applyBoxBorders()
    updateAllErrors()
}

function applyBoxBorders() {
    const cells = document.querySelectorAll('.cell-wrap')
    cells.forEach((el, idx) => {
        const input = el.querySelector('.cell')
        input.style.borderTop = ((Math.floor(idx / 9) % 3) === 0) ? '2px solid #6c757d' : '1px solid #dee2e6'
        input.style.borderLeft = ((idx % 9) % 3) === 0 ? '2px solid #6c757d' : '1px solid #dee2e6'
        input.style.borderRight = ((idx % 9) % 3) === 2 ? '2px solid #6c757d' : '1px solid #dee2e6'
        input.style.borderBottom = ((Math.floor(idx / 9) % 3) === 2) ? '2px solid #6c757d' : '1px solid #dee2e6'
    })
}

function onInput(e) {
    const val = e.target.value.replace(/[^1-9]/g, '').slice(-1)
    e.target.value = val
    const r = parseInt(e.target.dataset.r), c = parseInt(e.target.dataset.c)
    puzzle[r][c] = val === '' ? 0 : parseInt(val)
    updateAllErrors()
    if (showCandidates) revealAllCandidates()
    calculateScore()
    persistCurrent()
}

function onKeyDown(e) {
    if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(e.key)) {
        e.preventDefault()
        moveFocus(e.key)
    }
}

function moveFocus(key) {
    const active = document.activeElement
    if (!active || !active.classList.contains('cell')) return
    let r = parseInt(active.dataset.r), c = parseInt(active.dataset.c)
    if (key === 'ArrowLeft') c = (c + 8) % 9
    if (key === 'ArrowRight') c = (c + 1) % 9
    if (key === 'ArrowUp') r = (r + 8) % 9
    if (key === 'ArrowDown') r = (r + 1) % 9
    const idx = r * 9 + c
    document.querySelectorAll('.cell')[idx].focus()
}

function onFocus(e) {
    if (showCandidates) showCellCandidates(e.target)
    e.target.classList.add('focused')
}

function onBlur(e) {
    e.target.classList.remove('focused')
}

function getCandidates(r, c) {
    if (puzzle[r][c] !== 0) return []
    const used = new Set()
    for (let i = 0; i < 9; i++) {
        if (puzzle[r][i]) used.add(puzzle[r][i])
        if (puzzle[i][c]) used.add(puzzle[i][c])
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3
    for (let rr = br; rr < br + 3; rr++) {
        for (let cc = bc; cc < bc + 3; cc++) {
            if (puzzle[rr][cc]) used.add(puzzle[rr][cc])
        }
    }
    const candidates = []
    for (let v = 1; v <= 9; v++) if (!used.has(v)) candidates.push(v)
    return candidates
}

function showCellCandidates(cell) {
    const r = parseInt(cell.dataset.r), c = parseInt(cell.dataset.c)
    const cand = getCandidates(r, c)
    const candDiv = cell.parentElement.querySelector('.candidates')
    candDiv.textContent = cand.length ? cand.join('') : ''
}

function revealAllCandidates() {
    document.querySelectorAll('.cell').forEach(cell => {
        if (!cell.readOnly && !cell.value) showCellCandidates(cell)
        else cell.parentElement.querySelector('.candidates').textContent = ''
    })
}

function clearAllCandidates() {
    document.querySelectorAll('.candidates').forEach(d => d.textContent = '')
}

function updateAllErrors() {
    const cells = document.querySelectorAll('.cell')
    cells.forEach(cell => {
        const r = parseInt(cell.dataset.r), c = parseInt(cell.dataset.c)
        const val = puzzle[r][c]
        cell.classList.remove('error', 'correct')
        if (val === 0) return
        if (val !== solution[r][c]) {
            cell.classList.add('error')
        } else {
            cell.classList.add('correct')
        }
    })
}

function fillOneCellHelp() {
    let emptyCells = []
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (puzzle[r][c] === 0) emptyCells.push({ r, c })
        }
    }
    if (emptyCells.length === 0) {
        showToast('El tablero ya está completo', 'warning')
        return
    }
    const target = emptyCells[Math.floor(Math.random() * emptyCells.length)]
    const correctValue = solution[target.r][target.c]
    puzzle[target.r][target.c] = correctValue
    const idx = target.r * 9 + target.c
    const cell = document.querySelectorAll('.cell')[idx]
    cell.value = correctValue
    cell.classList.add('autofill')
    updateAllErrors()
    calculateScore()
    persistCurrent()
    showToast('Pista aplicada correctamente', 'success')
    if (showCandidates) revealAllCandidates()
}

function calculateScore() {
    let filled = 0
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (puzzle[r][c] !== 0 && puzzle[r][c] === solution[r][c]) filled++
        }
    }
    score = Math.max(0, Math.floor(filled * 10 - elapsed * 0.1))
    scoreText.textContent = 'Puntuación: ' + score
}

function verify() {
    updateAllErrors()
    const errors = document.querySelectorAll('.cell.error').length
    const empty = Array.from(document.querySelectorAll('.cell')).filter(c => !c.value).length
    if (errors > 0) {
        showToast(`Hay ${errors} celdas incorrectas`, 'danger')
    } else if (empty > 0) {
        showToast('Sudoku incompleto, pero vas bien', 'warning')
    } else {
        stopTimer()
        showToast('¡Felicidades! Sudoku completado perfectamente', 'success')
    }
}

function startTimer() {
    if (running) return
    startTime = performance.now() - (elapsed * 1000)
    running = true
    runTimer()
}

function runTimer() {
    if (!running) return
    elapsed = (performance.now() - startTime) / 1000
    timerText.textContent = formatTime(elapsed)
    rafId = requestAnimationFrame(runTimer)
}

function stopTimer() {
    running = false
    if (rafId) cancelAnimationFrame(rafId)
}

function resetTimer() {
    stopTimer()
    elapsed = 0
    timerText.textContent = formatTime(0)
}

function formatTime(t) {
    const m = Math.floor(t / 60), s = Math.floor(t % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function persistCurrent() {
    const state = { puzzle, solution, elapsed, difficulty: currentDifficulty }
    localStorage.setItem('sudoku_current', JSON.stringify(state))
}

function showToast(message, type) {
    const t = document.createElement('div')
    t.className = `toast show align-items-center text-bg-${type} border-0 mb-2`
    t.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`
    toastContainer.appendChild(t)
    setTimeout(() => t.remove(), 3000)
}

document.getElementById('btnEasy').addEventListener('click', () => startGame('easy'))
document.getElementById('btnMedium').addEventListener('click', () => startGame('medium'))
document.getElementById('btnHard').addEventListener('click', () => startGame('hard'))
document.getElementById('btnReset').addEventListener('click', () => { 
    puzzle = removeCells(solution, difficulties[currentDifficulty])
    renderBoard()
    resetTimer()
    startTimer()
})
document.getElementById('btnCheck').addEventListener('click', verify)
document.getElementById('btnShowCandidates').addEventListener('click', (e) => {
    showCandidates = !showCandidates
    e.target.textContent = showCandidates ? 'Ocultar Candidatos' : 'Mostrar Candidatos'
    if (showCandidates) revealAllCandidates()
    else clearAllCandidates()
})
document.getElementById('btnHelpFill').addEventListener('click', fillOneCellHelp)

function init() {
    const saved = JSON.parse(localStorage.getItem('sudoku_current'))
    if (saved && saved.puzzle) {
        puzzle = saved.puzzle
        solution = saved.solution
        elapsed = saved.elapsed || 0
        currentDifficulty = saved.difficulty || 'easy'
        renderBoard()
        startTimer()
    } else {
        startGame('easy')
    }
}

init()
