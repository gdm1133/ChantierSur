var fs = new ActiveXObject("Scripting.FileSystemObject");
var ado = new ActiveXObject("ADODB.Stream");

ado.Type = 2;
ado.Charset = "unicode";
ado.Open();
ado.LoadFromFile("pdf-generator.js");
var oldText = ado.ReadText();
ado.Close();

var startIdx = oldText.indexOf("function renderAudit(");
var endIdx = oldText.indexOf("function renderFinitions(");

WScript.Echo("Indices unicode: start " + startIdx + ", end " + endIdx);
