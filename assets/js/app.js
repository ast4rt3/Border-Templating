const TEMPLATE_DIR = 'assets/img/imgtemplate/';
const TEMPLATE_MANIFEST = `${TEMPLATE_DIR}templates.json`;
const TEMPLATE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

const canvas = document.querySelector('#previewCanvas');
const ctx = canvas.getContext('2d');
const photoInput = document.querySelector('#photoInput');
const templateSelect = document.querySelector('#templateSelect');
const templatePreviewFrame = document.querySelector('.template-preview');
const templatePreview = document.querySelector('#templatePreview');
const templatePreviewText = document.querySelector('#templatePreviewText');
const zoomRange = document.querySelector('#zoomRange');
const xOffset = document.querySelector('#xOffset');
const yOffset = document.querySelector('#yOffset');
const fitBtn = document.querySelector('#fitBtn');
const fillBtn = document.querySelector('#fillBtn');
const centerBtn = document.querySelector('#centerBtn');
const downloadBtn = document.querySelector('#downloadBtn');

const state = {
  photo: null,
  template: null,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function templateNameFromFile(file) {
  const filename = file.split('/').pop();
  const name = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
  return name.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeTemplateFile(href) {
  const url = new URL(href, window.location.href);
  const filename = decodeURIComponent(url.pathname.split('/').pop());
  return filename;
}

async function discoverTemplatesFromManifest() {
  const response = await fetch(TEMPLATE_MANIFEST, { cache: 'no-store' });
  if (!response.ok) return [];

  const files = await response.json();
  if (!Array.isArray(files)) return [];

  return files
    .filter((file) => typeof file === 'string')
    .filter((file) => TEMPLATE_EXTENSIONS.some((extension) => file.toLowerCase().endsWith(extension)))
    .sort((a, b) => a.localeCompare(b));
}

async function discoverTemplatesFromDirectory() {
  const response = await fetch(TEMPLATE_DIR);
  if (!response.ok) return [];

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const files = [...doc.querySelectorAll('a')]
    .map((link) => normalizeTemplateFile(link.getAttribute('href')))
    .filter((file) => TEMPLATE_EXTENSIONS.some((extension) => file.toLowerCase().endsWith(extension)));

  return [...new Set(files)].sort((a, b) => a.localeCompare(b));
}

async function discoverTemplates() {
  const manifestFiles = await discoverTemplatesFromManifest();
  if (manifestFiles.length) return manifestFiles;

  return discoverTemplatesFromDirectory();
}

function populateTemplates(files) {
  templateSelect.innerHTML = '';

  if (!files.length) {
    templateSelect.append(new Option('No templates detected', ''));
    templateSelect.disabled = true;
    updateTemplatePreview('');
    return;
  }

  templateSelect.disabled = false;

  files.forEach((file) => {
    templateSelect.append(new Option(templateNameFromFile(file), file));
  });

  updateTemplatePreview(files[0]);
  setTemplate(files[0]);
}

function updateTemplatePreview(file) {
  if (!file) {
    templatePreview.removeAttribute('src');
    templatePreviewFrame.classList.remove('has-template');
    templatePreviewText.textContent = 'No border selected';
    return;
  }

  templatePreview.src = `${TEMPLATE_DIR}${file}`;
  templatePreview.alt = `${file} border preview`;
  templatePreviewText.textContent = templateNameFromFile(file);
  templatePreviewFrame.classList.add('has-template');
}

function drawPlaceholder() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f8faf7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#637065';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 34px Arial, sans-serif';
  ctx.fillText('Upload a photo and choose a border', canvas.width / 2, canvas.height / 2);
}

function imageRect(mode = 'contain') {
  if (!state.photo) return null;

  const canvasRatio = canvas.width / canvas.height;
  const imageRatio = state.photo.width / state.photo.height;
  const matchWidth = mode === 'cover' ? imageRatio < canvasRatio : imageRatio > canvasRatio;
  const baseWidth = matchWidth ? canvas.width : canvas.height * imageRatio;
  const baseHeight = matchWidth ? canvas.width / imageRatio : canvas.height;
  const width = baseWidth * state.zoom;
  const height = baseHeight * state.zoom;

  return {
    x: (canvas.width - width) / 2 + state.offsetX,
    y: (canvas.height - height) / 2 + state.offsetY,
    width,
    height,
  };
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.photo) {
    const rect = imageRect('cover');
    ctx.drawImage(state.photo, rect.x, rect.y, rect.width, rect.height);
  }

  if (state.template) {
    ctx.drawImage(state.template, 0, 0, canvas.width, canvas.height);
  }

  if (!state.photo && !state.template) {
    drawPlaceholder();
  }

  downloadBtn.disabled = !state.photo;
}

function syncInputs() {
  zoomRange.value = state.zoom;
  xOffset.value = Math.round(state.offsetX);
  yOffset.value = Math.round(state.offsetY);
}

async function setTemplate(file) {
  if (!file) {
    state.template = null;
    updateTemplatePreview('');
    render();
    return;
  }

  updateTemplatePreview(file);
  state.template = await loadImage(`${TEMPLATE_DIR}${file}`);
  render();
}

function fitPhoto(mode) {
  if (!state.photo) return;

  const canvasRatio = canvas.width / canvas.height;
  const imageRatio = state.photo.width / state.photo.height;
  const coverScale = imageRatio < canvasRatio
    ? canvas.width / state.photo.width
    : canvas.height / state.photo.height;
  const containScale = imageRatio > canvasRatio
    ? canvas.width / state.photo.width
    : canvas.height / state.photo.height;

  state.zoom = mode === 'cover' ? 1 : containScale / coverScale;
  state.offsetX = 0;
  state.offsetY = 0;
  syncInputs();
  render();
}

photoInput.addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (!file) return;

  const objectUrl = URL.createObjectURL(file);
  state.photo = await loadImage(objectUrl);
  URL.revokeObjectURL(objectUrl);
  fitPhoto('cover');
});

templateSelect.addEventListener('change', (event) => {
  setTemplate(event.target.value);
});

zoomRange.addEventListener('input', (event) => {
  state.zoom = Number(event.target.value);
  render();
});

xOffset.addEventListener('input', (event) => {
  state.offsetX = Number(event.target.value);
  render();
});

yOffset.addEventListener('input', (event) => {
  state.offsetY = Number(event.target.value);
  render();
});

fitBtn.addEventListener('click', () => fitPhoto('contain'));
fillBtn.addEventListener('click', () => fitPhoto('cover'));
centerBtn.addEventListener('click', () => {
  state.offsetX = 0;
  state.offsetY = 0;
  syncInputs();
  render();
});

downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'border-template.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

async function init() {
  try {
    const files = await discoverTemplates();
    populateTemplates(files);
  } catch (error) {
    populateTemplates([]);
  }

  render();
}

init();
