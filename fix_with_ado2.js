var fs = new ActiveXObject("Scripting.FileSystemObject");
var ado = new ActiveXObject("ADODB.Stream");

ado.Type = 2;
ado.Charset = "utf-8";
ado.Open();
ado.LoadFromFile("pdf-generator.js");
var oldText = ado.ReadText();
ado.Close();

var adoNew = new ActiveXObject("ADODB.Stream");
adoNew.Type = 2;
adoNew.Charset = "utf-8";
adoNew.Open();
adoNew.LoadFromFile("new_renderAudit_code.js");
var newAudit = adoNew.ReadText();
adoNew.Close();

var startIdx = oldText.indexOf("function renderAudit(");
var endIdx = oldText.indexOf("function render(");

if (startIdx !== -1 && endIdx !== -1) {
    var before = oldText.substring(0, startIdx);
    var after = oldText.substring(endIdx);
    var finalText = before + newAudit + "\r\n  " + after;

    var adoOut = new ActiveXObject("ADODB.Stream");
    adoOut.Type = 2;
    adoOut.Charset = "utf-8";
    adoOut.Open();
    adoOut.WriteText(finalText);
    adoOut.SaveToFile("pdf-generator.js", 2);
    adoOut.Close();
    WScript.Echo("Success");
} else {
    WScript.Echo("Indices not found: start " + startIdx + ", end " + endIdx);
}

