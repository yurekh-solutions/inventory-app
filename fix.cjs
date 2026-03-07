const fs = require('fs');
const path = 'public/index.html';

let content = fs.readFileSync(path, 'utf8');

// Fix the broken patterns - simple string replacements
content = content.replace("skuInput = document.getElementById(\\x27item-product-search\\x27).value; const sku = skuInput.split(\\x27(\\x27).pop().replace(\\x27)", 
  "const skuInput = document.getElementById('item-product-search').value; const sku = skuInput.split('(').pop().replace(')'");

content = content.replace("skuInput.split(\\x27(\\x27)[0].trim()",
  "skuInput.split('(')[0].trim()");

content = content.replace("toast(\\x27Invalid calculation\\x27, \\x27err\\x27)",
  "toast('Invalid calculation', 'err')");

content = content.replace("item.cgstAmount: Number(cgstAmount.toFixed(2))",
  "item.cgstAmount");

content = content.replace("item.sgstAmount: Number(sgstAmount.toFixed(2))",
  "item.sgstAmount");

content = content.replace("item.igstAmount: Number(igstAmount.toFixed(2))",
  "item.igstAmount");

fs.writeFileSync(path, content);
console.log('Fixed!');
