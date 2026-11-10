import * as Blockly from 'blockly/core';
import * as En from 'blockly/msg/en';
import './styles.css';
import { BLOCK_DEFS } from './blocks/registry';
import { buildToolbox } from './blocks/toolbox';
import { generateCpp } from './graphz/codegen';
import { exportGraphZ, importGraphZ } from './graphz/serialize';
import {
  CIRCUITS,
  COLORS,
  COLOR_NAMES,
  KITS,
  MODES,
  type Kit,
  type Mode,
} from './spec';

Blockly.setLocale(En as unknown as Record<string, string>);
Blockly.common.defineBlocksWithJsonArray(BLOCK_DEFS.map((def) => def.json));

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
}

const kitSelect = byId<HTMLSelectElement>('kit');
const circuitSelect = byId<HTMLSelectElement>('circuit');
const modeSelect = byId<HTMLSelectElement>('mode');
const preview = byId<HTMLElement>('preview');
const status = byId<HTMLElement>('status');
const fileInput = byId<HTMLInputElement>('fileInput');
const matrixModal = byId<HTMLElement>('matrixModal');
const matrixGrid = byId<HTMLElement>('matrixGrid');

let currentKit: Kit = 'Light';
let currentMode: Mode = 'Newbie';
let currentCircuit = '1';
let selectedMatrixBlock: Blockly.BlockSvg | null = null;

for (const kit of KITS) {
  kitSelect.add(new Option(kit, kit));
}
for (const mode of MODES) {
  modeSelect.add(new Option(mode, mode));
}
kitSelect.value = currentKit;
modeSelect.value = currentMode;

const workspace = Blockly.inject('blockly', {
  toolbox: buildToolbox(currentKit, currentMode) as any,
  grid: { spacing: 20, length: 3, colour: '#c8c8c8', snap: true },
  zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 2, minScale: 0.3 },
  move: { scrollbars: true, drag: true, wheel: true },
  trashcan: true,
  renderer: 'zelos',
  theme: Blockly.Themes.Classic,
});

function setStatus(message: string, kind: 'info' | 'error' = 'info'): void {
  status.textContent = message;
  status.dataset.kind = kind;
}

function populateCircuits(): void {
  const circuits = CIRCUITS[currentKit] ?? {};
  circuitSelect.innerHTML = '';
  for (const [id, info] of Object.entries(circuits)) {
    circuitSelect.add(new Option(`${id} - ${info.name}`, id));
  }
  const ids = Object.keys(circuits);
  if (!ids.includes(currentCircuit)) {
    currentCircuit = ids[0] ?? '1';
  }
  circuitSelect.value = currentCircuit;
}

function refreshToolbox(): void {
  workspace.updateToolbox(buildToolbox(currentKit, currentMode) as any);
}

let previewTimer: number | undefined;
function updatePreview(): void {
  window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => {
    preview.textContent = generateCpp(workspace, currentKit);
  }, 60);
}

function addStartBlock(): void {
  const block = workspace.newBlock('graphz_start') as Blockly.BlockSvg;
  block.initSvg();
  block.render();
  block.moveBy(40, 40);
}

function resetWorkspace(): void {
  workspace.clear();
  addStartBlock();
  updatePreview();
  setStatus('New program created.');
}

function download(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function findKitForCircuit(schemeId: string): Kit | undefined {
  return KITS.find((kit) => Boolean(CIRCUITS[kit]?.[schemeId]));
}

function openMatrixEditor(block: Blockly.BlockSvg): void {
  selectedMatrixBlock = block;
  const raw = String(block.getFieldValue('PIXELS') ?? '');
  const values = raw.split(/[;\s]+/).map((part) => part.trim()).filter(Boolean);
  matrixGrid.innerHTML = '';
  for (let index = 0; index < 64; index += 1) {
    const select = document.createElement('select');
    select.dataset.index = String(index);
    for (const name of COLOR_NAMES) {
      const option = new Option(name, name);
      const rgb = COLORS[name];
      if (rgb) {
        option.style.backgroundColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      }
      select.add(option);
    }
    select.value = values[index] && COLOR_NAMES.includes(values[index]) ? values[index] : 'none';
    select.addEventListener('change', () => {
      select.className = select.value === 'none' ? '' : 'active';
    });
    select.className = select.value === 'none' ? '' : 'active';
    matrixGrid.appendChild(select);
  }
  matrixModal.classList.remove('hidden');
}

function closeMatrixEditor(): void {
  matrixModal.classList.add('hidden');
  selectedMatrixBlock = null;
}

function saveMatrixEditor(): void {
  if (!selectedMatrixBlock) {
    closeMatrixEditor();
    return;
  }
  const selects = [...matrixGrid.querySelectorAll<HTMLSelectElement>('select')];
  const pixels = selects.map((select) => select.value);
  selectedMatrixBlock.setFieldValue(`${pixels.join(';')};`, 'PIXELS');
  closeMatrixEditor();
  updatePreview();
  setStatus('Matrix updated.');
}

populateCircuits();
refreshToolbox();
addStartBlock();
updatePreview();

kitSelect.addEventListener('change', () => {
  currentKit = kitSelect.value as Kit;
  populateCircuits();
  refreshToolbox();
  updatePreview();
  setStatus(`Kit: ${currentKit}`);
});

modeSelect.addEventListener('change', () => {
  currentMode = modeSelect.value as Mode;
  refreshToolbox();
  updatePreview();
  setStatus(`Mode: ${currentMode}`);
});

circuitSelect.addEventListener('change', () => {
  currentCircuit = circuitSelect.value;
  setStatus(`Circuit: ${CIRCUITS[currentKit]?.[currentCircuit]?.name ?? currentCircuit}`);
});

byId<HTMLButtonElement>('newButton').addEventListener('click', resetWorkspace);
byId<HTMLButtonElement>('generateButton').addEventListener('click', () => {
  preview.textContent = generateCpp(workspace, currentKit);
  setStatus('C++ preview generated.');
});

byId<HTMLButtonElement>('exportButton').addEventListener('click', () => {
  try {
    const text = exportGraphZ(workspace, {
      kit: currentKit,
      circuitId: currentCircuit,
      mode: currentMode,
    });
    download(`graphz-${currentKit.toLowerCase()}-${currentCircuit}.gphz`, text);
    setStatus('Project exported.');
  } catch (error) {
    setStatus(`Export failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
  }
});

byId<HTMLButtonElement>('importButton').addEventListener('click', () => {
  fileInput.value = '';
  fileInput.click();
});

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) {
    return;
  }
  try {
    const text = await file.text();
    const result = importGraphZ(workspace, text);
    if (result.schemeId) {
      const kit = findKitForCircuit(result.schemeId);
      if (kit) {
        currentKit = kit;
        kitSelect.value = kit;
      }
      currentCircuit = result.schemeId;
    }
    if (result.mode) {
      currentMode = result.mode;
      modeSelect.value = result.mode;
    }
    populateCircuits();
    refreshToolbox();
    updatePreview();
    setStatus(`Imported ${file.name}.`);
  } catch (error) {
    setStatus(`Import failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
  }
});

byId<HTMLButtonElement>('matrixButton').addEventListener('click', () => {
  const selected = Blockly.getSelected();
  if (!(selected instanceof Blockly.BlockSvg) || selected.type !== 'graphz_led_matrix_draw') {
    setStatus('Select an LED matrix draw block first.', 'error');
    return;
  }
  openMatrixEditor(selected);
});

byId<HTMLButtonElement>('matrixClear').addEventListener('click', () => {
  for (const select of matrixGrid.querySelectorAll<HTMLSelectElement>('select')) {
    select.value = 'none';
    select.className = '';
  }
});

byId<HTMLButtonElement>('matrixCancel').addEventListener('click', closeMatrixEditor);
byId<HTMLButtonElement>('matrixSave').addEventListener('click', saveMatrixEditor);

matrixModal.addEventListener('click', (event) => {
  if (event.target === matrixModal) {
    closeMatrixEditor();
  }
});

workspace.addChangeListener((event) => {
  if (event.isUiEvent) {
    return;
  }
  updatePreview();
});

window.addEventListener('resize', () => Blockly.svgResize(workspace));
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !matrixModal.classList.contains('hidden')) {
    closeMatrixEditor();
  }
});

(window as unknown as { __graphz: unknown }).__graphz = {
  workspace,
  Blockly,
  exportGraphZ: () => exportGraphZ(workspace, {
    kit: currentKit,
    circuitId: currentCircuit,
    mode: currentMode,
  }),
};
