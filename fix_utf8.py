import os

file_path = 'app_privee.html'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

try:
    # Attempt to reverse double-encoding
    fixed_text = text.encode('latin1').decode('utf-8')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(fixed_text)
    print("Fix successful!")
except Exception as e:
    print("Failed to decode automatically:", e)
    # Manual fallback for common mojibake
    replacements = {
        'Ã©': 'é', 'Ã¨': 'è', 'Ã ': 'à', 'Ã¢': 'â', 'Ãª': 'ê', 'Ã®': 'î', 'Ã´': 'ô', 'Ã»': 'û', 'Ã§': 'ç',
        'Ã‰': 'É', 'Ãˆ': 'È', 'Ã€': 'À', 'â€™': "'", 'Å“': 'œ', 'Â°': '°', 'Ã¯': 'ï',
        'sǸnǸgal': 'sénégal', 'SǸnǸgal': 'Sénégal', "d'%tudes": "d'Études", 'GǸnǸral': 'Général', 'NumǸrique': 'Numérique',
        'sǸcurisez': 'sécurisez', 'SǸcurisez': 'Sécurisez', 'SǸcuritǸ': 'Sécurité', 'conformitǸ': 'conformité',
        'Bǽtissez': 'Bâtissez', 'bǽtiment': 'bâtiment', 'SpǸcificitǸs': 'Spécificités', 'LǸgales': 'Légales',
        'LǸgal': 'Légal', 'indǸpendante': 'indépendante', 'ingǸnierie': 'ingénierie', 'dǸcision': 'décision',
        'prǸdimensionnement': 'prédimensionnement', 'rǸgie': 'régie', 'mǸtrǸs': 'métrés', 'financires': 'financières',
        'gǸnǸrǸs': 'générés', 'dǸvolus': 'dévolus', 'contrle': 'contrôle', 'agrǸǸs': 'agréés', 'dǸpts': 'dépôts',
        'ǸditǸe': 'éditée', 'propulsǸe': 'propulsée', 'tǸlǸchargement': 'téléchargement', 'dǸmarre': 'démarre',
        'arrire-plan': 'arrière-plan', 'SǸlectionner': 'Sélectionner', 'dǸtectǸes': 'détectées', 'prǸ-remplies': 'pré-remplies',
        'RǸsidentiel': 'Résidentiel', 'privǸe': 'privée', 'ǸlǸvation': 'élévation', 'Ǹtage': 'étage',
        'AnalysǸ': 'Analysé', 'BǸton': 'Béton', 'armǸ': 'armé', 'dosǸ': 'dosé', 'Maonnerie': 'Maçonnerie', 'o': '✓', 'Y': '✓', '?': '!', '': 'à'
    }
    for bad, good in replacements.items():
        text = text.replace(bad, good)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Manual fix applied.")
