import re

# Read the file
with open(r'c:\Users\yurek\OneDrive\Desktop\tubhyam\tubhyamoffical\inventory-app\public\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken escape sequences
content = content.replace(r"skuInput = document.getElementById(\x27item-product-search\x27).value; const sku = skuInput.split(\x27(\x27).pop().replace(\x27)', '').trim();", 
                        r"const skuInput = document.getElementById('item-product-search').value; const sku = skuInput.split('(').pop().replace(')', '').trim();")

content = content.replace(r"skuInput.split(\x27(\x27)[0].trim()", 
                        r"skuInput.split('(')[0].trim()")

content = content.replace(r"toast(\x27Invalid calculation\x27, \x27err\x27)", 
                        r"toast('Invalid calculation', 'err')")

content = content.replace(r"item.cgstAmount: Number(cgstAmount.toFixed(2))", 
                        r"item.cgstAmount")

content = content.replace(r"item.sgstAmount: Number(sgstAmount.toFixed(2))", 
                        r"item.sgstAmount")

content = content.replace(r"item.igstAmount: Number(igstAmount.toFixed(2))", 
                        r"item.igstAmount")

# Write back
with open(r'c:\Users\yurek\OneDrive\Desktop\tubhyam\tubhyamoffical\inventory-app\public\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("File fixed!")
