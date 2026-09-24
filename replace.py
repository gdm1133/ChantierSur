import os

with open('app_privee.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('../brain/372eee46-324a-4111-af73-8f37147edce4/scratch/new_pane3.html', 'r', encoding='utf-8') as f:
    new_pane3 = f.read()

with open('../brain/372eee46-324a-4111-af73-8f37147edce4/scratch/new_js.js', 'r', encoding='utf-8') as f:
    new_js = f.read()

start_index = html.find('<!-- FORMULAIRE 3 : Audit Devis')
if start_index == -1:
    print("Could not find start index of Formulaire 3")
    exit(1)

end_index = html.find('<!-- FORMULAIRE 4', start_index)
if end_index == -1:
    print("Could not find end index of Formulaire 3")
    exit(1)

new_html = html[:start_index] + new_pane3 + "\n\n        " + html[end_index:]

js_start_index = new_html.find('window.addDevisLine = function()')
if js_start_index == -1:
    print("Could not find js start index")
    exit(1)

js_end_index = new_html.find('// 8. LOGIQUE GLOBALE DE PAIEMENT', js_start_index)
if js_end_index == -1:
    js_end_index = new_html.find('</script>', js_start_index)

actual_js_start = new_html.rfind('let devisLineCount', 0, js_start_index)
if actual_js_start != -1:
    js_start_index = actual_js_start

new_html = new_html[:js_start_index] + new_js + "\n" + new_html[js_end_index:]

with open('app_privee.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("Replacement done.")
