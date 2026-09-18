$file = "c:\Users\germa\.gemini\antigravity-ide\scratch\ChantierSur\index.html"
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

$new_block = @"
                            <!-- Commune / Localité -->
                            <div class="space-y-1">
                                <label class="block text-xs font-semibold text-slate-300 mb-1">Localisation & Caractéristiques du Sol *</label>
                                <select name="project_location" class="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm" required>
                                    <option value="" disabled selected>Sélectionnez la zone géographique du projet...</option>
                                    
                                    <optgroup label="📍 Dakar — Presqu'île & Façade Maritime (Risque Salin Sévère)">
                                        <option value="Dakar - Almadies / Ngor / Ouakam" data-salin="true">Almadies / Ngor / Ouakam (Enrobage 4,5 cm - Sol rocheux/marin)</option>
                                        <option value="Dakar - Yoff / Cambérène / Corniche Ouest" data-salin="true">Yoff / Cambérène / Corniche (Enrobage 4,5 cm - Sable dunaire marin)</option>
                                        <option value="Dakar - Plateau / Fann / Point E / Mermoz" data-salin="false">Dakar Centre / Fann / Point E / Mermoz (Zone urbaine dense)</option>
                                    </optgroup>

                                    <optgroup label="📍 Dakar — Zones Basses & Nappe Affleurante (Risque Hydromorphie)">
                                        <option value="Keur Massar / Malika / Tivaouane Peulh" data-salin="false">Keur Massar / Malika / Tivaouane Peulh (Nappe haute - Drainage requis)</option>
                                        <option value="Pikine / Guédiawaye / Thiaroye" data-salin="false">Pikine / Guédiawaye / Thiaroye (Sols compressibles)</option>
                                    </optgroup>

                                    <optgroup label="📍 Grand Dakar — Pôles d'Expansion Urbaine">
                                        <option value="Diamniadio / Sébikotane / Bargny" data-salin="false">Diamniadio / Sébikotane / Bargny (Argiles gonflantes - Longrines rigides)</option>
                                        <option value="Rufisque / Sangalkam / Lac Rose" data-salin="false">Rufisque / Sangalkam / Lac Rose (Sols calcaires et sédimentaires)</option>
                                    </optgroup>

                                    <optgroup label="📍 Petite Côte & Régions Intérieures">
                                        <option value="Saly / Mbour / Somone / Ngaparou" data-salin="true">Saly / Mbour / Somone / Ngaparou (Bord de mer - Corrosion armatures)</option>
                                        <option value="Thiès / Tivaouane / Touba" data-salin="false">Thiès / Tivaouane / Touba (Plateau latéritique - Forte portance)</option>
                                        <option value="Saint-Louis / Casamance / Autres Régions" data-salin="true">Saint-Louis / Casamance / Autres Régions (Hydromorphie / Pluviométrie forte)</option>
                                    </optgroup>
                                </select>
                                <span class="text-[10px] text-slate-400">Définit les prescriptions d'enrobage et de fondation.</span>
                            </div>
"@

$content = $content -replace '(?s)<!-- Commune / Localité -->\s*<div>\s*<label[^>]*>Commune / Localité[^<]*</label>\s*<input[^>]*name="project_location"[^>]*>\s*<span[^>]*>[^<]*</span>\s*</div>', $new_block

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Host "Updated project_location in index.html"
