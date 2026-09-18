const fs = require('fs');
const glob = require('fs').readdirSync('.');

const header_old = `            <a href="/index.html" class="flex items-center space-x-3">
                <img src="/icone-chantiersur-svg.svg" alt="ChantierSur Logo" class="w-9 h-9">
                <div class="flex flex-col">
                    <span class="text-xl font-black tracking-tight text-[#0B1325]">Chantier<span class="text-[#F59E0B]">Sur.com</span></span>
                    <span class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-[-2px]">Bureau d'Études Numérique</span>
                </div>
            </a>`;

const header_new = `            <a href="index.html" class="flex items-center space-x-2.5">
                <div class="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center p-1.5 border border-slate-800 shadow-sm shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" class="w-full h-full text-amber-500" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <path d="M9 12l2 2 4-4"/>
                    </svg>
                </div>
                <div class="flex flex-col">
                    <span class="text-lg font-black tracking-tight text-[#0B1325] leading-none">Chantier<span class="text-amber-500">Sur</span><span class="text-xs font-bold text-slate-400">.com</span></span>
                    <span class="text-[9px] font-bold tracking-wider text-slate-400 uppercase mt-0.5">Bureau d'Études Numérique</span>
                </div>
            </a>`;

const mobile_old = `                <div class="flex items-center space-x-3">
                    <img src="/icone-chantiersur-svg.svg" alt="Logo" class="w-8 h-8">
                    <span class="text-xl font-black tracking-tight text-white">Chantier<span class="text-amber-500">Sur.com</span></span>
                </div>`;

const mobile_new = `                <a href="index.html" class="flex items-center space-x-2.5">
                    <div class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center p-1.5 border border-slate-800 shadow-sm shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" class="w-full h-full text-amber-500" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            <path d="M9 12l2 2 4-4"/>
                        </svg>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-lg font-black tracking-tight text-white leading-none">Chantier<span class="text-amber-500">Sur</span><span class="text-xs font-bold text-slate-400">.com</span></span>
                    </div>
                </a>`;

const footer_old = `                    <div class="flex items-center space-x-2 mb-4">
                        <img src="/icone-chantiersur-svg.svg" alt="Logo" class="w-6 h-6">
                        <span class="text-lg font-black tracking-tight text-white">Chantier<span class="text-amber-500">Sur.com</span></span>
                    </div>`;

const footer_new = `                    <a href="index.html" class="flex items-center space-x-2.5 mb-4">
                        <div class="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center p-1 border border-slate-800 shadow-sm shrink-0">
                            <svg viewBox="0 0 24 24" fill="none" class="w-full h-full text-amber-500" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                <path d="M9 12l2 2 4-4"/>
                            </svg>
                        </div>
                        <span class="text-lg font-black tracking-tight text-white leading-none">Chantier<span class="text-amber-500">Sur</span><span class="text-xs font-bold text-slate-400">.com</span></span>
                    </a>`;

const files = glob.filter(f => f.endsWith('.html'));

for (let file of files) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(header_old, header_new);
    content = content.replace(mobile_old, mobile_new);
    content = content.replace(footer_old, footer_new);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
}
