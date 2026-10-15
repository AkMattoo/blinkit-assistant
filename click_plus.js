function ExecuteScript() {
  // Presses "+" on the card of the product we just added (for quantity > 1).
  var n = "%PickName%";
  var plus = Array.prototype.slice.call(document.querySelectorAll('div,button,span'))
    .filter(function (e) { return e.children.length === 0 && e.innerText && e.innerText.trim() === '+'; });
  for (var i = 0; i < plus.length; i++) {
    var c = plus[i];
    for (var k = 0; k < 8 && c; k++) { c = c.parentElement; if (c && c.innerText.indexOf(n) >= 0) { plus[i].click(); return 'ok'; } }
  }
  return 'notfound';
}
