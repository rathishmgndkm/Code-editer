let activeTab = 'html';
let tempImported = [];
let localDB = JSON.parse(localStorage.getItem('vcf_local_db_v10') || '[]');

function showEditor() { 
    document.getElementById('editor-page').style.display = 'flex'; 
    document.getElementById('vcf-page').style.display = 'none'; 
    updateNav('nav-editor'); 
}

function showVCF() { 
    document.getElementById('editor-page').style.display = 'none'; 
    document.getElementById('vcf-page').style.display = 'flex'; 
    updateNav('nav-vcf'); 
    renderLocal(); 
}

function updateNav(id) { 
    document.querySelectorAll('.toolbar button').forEach(b => b.classList.remove('active-nav')); 
    document.getElementById(id).classList.add('active-nav'); 
}

function openTab(evt, lang) {
    activeTab = lang;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('textarea').forEach(t => t.classList.remove('active'));
    if(evt) evt.currentTarget.classList.add('active');
    else document.getElementById('btn-tab-'+lang).classList.add('active');
    document.getElementById(lang + '-editor').classList.add('active');
    if(lang === 'single') updateSingle();
}

function triggerImport() { document.getElementById('importFile').click(); }

function clearTab() {
    if (confirm("Delete?")) {
        const editor = document.getElementById(activeTab + '-editor');
        if(editor) {
            editor.value = '';
            if(activeTab === 'single') updateSingle();
        }
    }
}

document.getElementById('importFile').addEventListener('change', function(e) {
    const file = e.target.files[0]; 
    if(!file) return;
    const reader = new FileReader();
    const ext = file.name.split('.').pop().toLowerCase();
    reader.onload = (ev) => {
        const content = ev.target.result;
        if(ext === 'vcf') { 
            parseForSelection(content); 
            showVCF(); 
        } else if(ext === 'html' || ext === 'htm') { 
            smartParseHTML(content); 
            showEditor(); 
            openTab(null, 'html');
        } else {
            const map = {'css':'css','js':'js','py':'python','php':'php','xml':'xml','svg':'svg'};
            const tab = map[ext] || 'html';
            document.getElementById(tab + '-editor').value = content;
            showEditor();
            openTab(null, tab);
        }
        e.target.value = ''; 
    };
    reader.readAsText(file);
});

function smartParseHTML(code) {
    const css = code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const js = code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const svg = code.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    document.getElementById('css-editor').value = css ? css[1].trim() : "";
    document.getElementById('js-editor').value = js ? js[1].trim() : "";
    document.getElementById('svg-editor').value = svg ? svg[0].trim() : "";
    document.getElementById('html-editor').value = code.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "").trim();
}

function parseForSelection(data) {
    tempImported = [];
    const lines = data.split(/BEGIN:VCARD/i);
    lines.forEach(l => {
        if(!l.trim()) return;
        const fn = l.match(/FN(?:;[^:]*)?:(.*)/i);
        const tel = l.match(/TEL(?:;[^:]*)?:(.*)/i);
        if(fn || tel) tempImported.push({ name: fn?fn[1].trim():'Unknown', num: tel?tel[1].replace(/[^\d+]/g,''):'', id: Math.random() });
    });
    renderImportList();
}

function renderImportList() {
    const sect = document.getElementById('import-section');
    const list = document.getElementById('import-list');
    if(tempImported.length === 0) { sect.style.display = 'none'; return; }
    sect.style.display = 'block';
    list.innerHTML = tempImported.map(c => `<div class="contact-item"><input type="checkbox" class="imp-cb" data-id="${c.id}"><div class="contact-info"><b>${c.name}</b><span>${c.num}</span></div></div>`).join('');
}

function toggleAllShown(master) {
    document.querySelectorAll('.imp-cb, .loc-cb').forEach(cb => cb.checked = master.checked);
}

function saveSelectedToLocal() {
    const checked = document.querySelectorAll('.imp-cb:checked');
    if(!checked.length) return alert("Select imported contacts first!");
    checked.forEach(cb => {
        const contact = tempImported.find(t => t.id == cb.dataset.id);
        if(contact) localDB.push({...contact, id: Date.now() + Math.random()});
    });
    localStorage.setItem('vcf_local_db_v10', JSON.stringify(localDB));
    alert("Saved!");
    renderLocal();
}

function addNewContact() {
    const n = document.getElementById('newName').value, p = document.getElementById('newNum').value;
    if(!n || !p) return;
    localDB.push({name: n, num: p, id: Date.now()});
    localStorage.setItem('vcf_local_db_v10', JSON.stringify(localDB));
    document.getElementById('newName').value=''; document.getElementById('newNum').value='';
    renderLocal();
}

function renderLocal(filter = "") {
    const list = document.getElementById('local-list');
    const filtered = localDB.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()) || c.num.includes(filter));
    list.innerHTML = filtered.map(c => `<div class="contact-item"><input type="checkbox" class="loc-cb" data-id="${c.id}"><div class="contact-info"><b onclick="contactAction('${c.num}', 'msg')">${c.name}</b><span onclick="contactAction('${c.num}', 'call')">${c.num}</span></div></div>`).join('');
}

function filterContacts() { renderLocal(document.getElementById('vcfSearch').value); }

function contactAction(num, type) {
    if(type === 'call') window.location.href = "tel:" + num;
    else if(confirm("Open WhatsApp?")) window.location.href = "https://wa.me/" + num;
    else window.location.href = "sms:" + num;
}

function toggleSavedContacts() {
    const c = document.getElementById('saved-contacts-container');
    c.style.display = c.style.display === 'none' ? 'block' : 'none';
    document.getElementById('btn-toggle-saved').innerText = c.style.display === 'none' ? '📁 Show Saved' : '📁 Hide Saved';
}

function deleteLocal() {
    const sel = Array.from(document.querySelectorAll('.loc-cb:checked')).map(cb => cb.dataset.id);
    if(!sel.length) return alert("Select contacts!");
    localDB = localDB.filter(c => !sel.includes(String(c.id)));
    localStorage.setItem('vcf_local_db_v10', JSON.stringify(localDB));
    renderLocal();
}

function exportVCF() {
    const sel = Array.from(document.querySelectorAll('.loc-cb:checked')).map(cb => cb.dataset.id);
    const toExp = localDB.filter(c => sel.includes(String(c.id)));
    if(!toExp.length) return alert("Select contacts!");
    let vcf = toExp.map(c => `BEGIN:VCARD\nVERSION:3.0\nFN:${c.name}\nTEL:${c.num}\nEND:VCARD`).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([vcf], {type:'text/vcard'})); a.download = "contacts.vcf"; a.click();
}

function runTest() { updateSingle(); document.getElementById('preview-container').style.display='block'; const f=document.getElementById('output-frame').contentWindow.document; f.open(); f.write(document.getElementById('single-editor').value); f.close(); }
function closePreview() { document.getElementById('preview-container').style.display='none'; }
function closeModal() { document.getElementById('modal').style.display='none'; document.getElementById('overlay').style.display='none'; }
function closeImport() { document.getElementById('import-section').style.display='none'; tempImported = []; }

function saveProject() {
    const name = prompt("Project Name:"); if(!name) return;
    let projs = JSON.parse(localStorage.getItem('saved_codes_v10') || '[]');
    projs.push({name, h: document.getElementById('html-editor').value, c: document.getElementById('css-editor').value, j: document.getElementById('js-editor').value });
    localStorage.setItem('saved_codes_v10', JSON.stringify(projs));
}
function showSavedProjects() {
    const projs = JSON.parse(localStorage.getItem('saved_codes_v10') || '[]');
    document.getElementById('project-list').innerHTML = projs.map((p, i) => `<div style="padding:10px; background:#444; margin-bottom:5px; display:flex; justify-content:space-between;">${p.name} <button onclick="loadProj(${i})">Load</button></div>`).join('') || "Empty.";
    document.getElementById('modal').style.display='block'; document.getElementById('overlay').style.display='block';
}
function loadProj(i) {
    const p = JSON.parse(localStorage.getItem('saved_codes_v10'))[i];
    document.getElementById('html-editor').value = p.h||''; document.getElementById('css-editor').value = p.c||''; document.getElementById('js-editor').value = p.j||'';
    closeModal(); showEditor();
}
function updateSingle() {
    const h = document.getElementById('html-editor').value, c = document.getElementById('css-editor').value, j = document.getElementById('js-editor').value;
    document.getElementById('single-editor').value = `<!DOCTYPE html><html><head><style>${c}</style></head><body>${h}<script>${j}<\/script></body></html>`;
}

function smartDownload() {
    let fileName = "index.html";
    let mimeType = "text/html";
    let content = "";

    if (activeTab === 'html') {
        fileName = "index.html";
        mimeType = "text/html";
        content = document.getElementById('html-editor').value;
    } else if (activeTab === 'css') {
        fileName = "style.css";
        mimeType = "text/css";
        content = document.getElementById('css-editor').value;
    } else if (activeTab === 'js') {
        fileName = "script.js";
        mimeType = "text/javascript";
        content = document.getElementById('js-editor').value;
    } else if (activeTab === 'svg') {
        fileName = "image.svg";
        mimeType = "image/svg+xml";
        content = document.getElementById('svg-editor').value;
    } else if (activeTab === 'php') {
        fileName = "index.php";
        mimeType = "application/x-httpd-php";
        content = document.getElementById('php-editor').value;
    } else if (activeTab === 'python') {
        fileName = "main.py";
        mimeType = "text/x-python";
        content = document.getElementById('python-editor').value;
    } else if (activeTab === 'xml') {
        fileName = "data.xml";
        mimeType = "application/xml";
        content = document.getElementById('xml-editor').value;
    } else if (activeTab === 'single') {
        updateSingle();
        fileName = "index.html";
        mimeType = "text/html";
        content = document.getElementById('single-editor').value;
    }

    if(!content && activeTab !== 'single') return alert("Empty tab");

    const blob = new Blob([content], { type: mimeType });
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(blob); 
    a.download = fileName; 
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}
