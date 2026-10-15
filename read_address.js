function ExecuteScript() {
  // Returns the delivery location Blinkit shows in its header.
  var t = document.body.innerText;
  var m = t.match(/Delivery in[^\n]*\n([^\n]+)/i);
  return m ? m[1].trim() : t.substring(0, 200).replace(/\n/g, ' ');
}
