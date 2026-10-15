function ExecuteScript() {
  // Reads every product card on a Blinkit search page, picks the lowest
  // price-per-unit IN-STOCK product, clicks its ADD button.
  // Returns: status|name|size|price|perUnit|resultCount|alternatives
  var item = "%Row['item']%".toLowerCase().trim();
  var leaf = function (txt) {
    return Array.prototype.slice.call(document.querySelectorAll('div,button,span'))
      .filter(function (e) { return e.children.length === 0 && e.innerText && e.innerText.trim() === txt; });
  };
  var cardOf = function (el) {
    var c = el;
    for (var i = 0; i < 8 && c; i++) {
      c = c.parentElement;
      if (c && c.innerText.indexOf('₹') >= 0 && c.innerText.split('\n').length >= 3) return c;
    }
    return null;
  };
  var parse = function (card, btn, inStock) {
    var t = card.innerText;
    var s = t.match(/(\d+(?:\.\d+)?)\s*(ml|ltr|litre|l|gm|g|kg|pcs|pc|pieces|piece)\b/i);
    var prices = (t.match(/₹\s*(\d+(?:\.\d+)?)/g) || []).map(function (p) { return parseFloat(p.replace(/[^\d.]/g, '')); });
    var lines = t.split('\n').map(function (l) { return l.trim(); })
      .filter(function (l) { return l && l.indexOf('₹') < 0 && !/^(ADD|\+|-|\d+ mins?|out of stock)$/i.test(l) && !/^\d/.test(l); });
    var name = lines.sort(function (a, b) { return b.length - a.length; })[0] || '';
    if (!s || !prices.length || !name) return null;             // unparseable -> skip
    var amt = parseFloat(s[1]), u = s[2].toLowerCase();
    if (u === 'ml' || u === 'g' || u === 'gm') amt = amt / 1000;  // to L / kg
    var price = Math.min.apply(null, prices);                     // selling price (MRP is higher)
    return { name: name, size: s[0], price: price, per: price / amt, btn: btn, inStock: inStock };
  };
  var all = [];
  leaf('ADD').forEach(function (b) { var c = cardOf(b); if (c) { var p = parse(c, b, true); if (p) all.push(p); } });
  leaf('Out of Stock').forEach(function (b) { var c = cardOf(b); if (c) { var p = parse(c, null, false); if (p) all.push(p); } });
  var first = item.split(' ')[0];
  var rel = all.filter(function (p) { return p.name.toLowerCase().indexOf(first) >= 0; });
  if (!rel.length) rel = all;
  var stock = rel.filter(function (p) { return p.inStock; });
  var alts = rel.slice().sort(function (a, b) { return a.price - b.price; }).slice(0, 4)
    .map(function (p) { return p.name + ' ' + p.size + ' Rs' + p.price + (p.inStock ? '' : ' (out of stock)'); }).join('; ');
  if (!stock.length) return 'NOT_FOUND|-|-|0|0|' + rel.length + '|' + alts;
  stock.sort(function (a, b) { return a.per - b.per; });
  var best = stock[0];
  best.btn.click();
  return 'ADDED|' + best.name + '|' + best.size + '|' + best.price + '|' + best.per.toFixed(2) + '|' + rel.length + '|' + alts;
}
