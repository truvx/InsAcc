const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            // Match {formatCurrency(some.var, currency)} and replace with <CurrencyText value={some.var} currency={currency} />
            // regex: /\{formatCurrency\(([^,]+),\s*currency\)\}/g
            content = content.replace(/\{formatCurrency\(([^,]+),\s*currency\)\}/g, "<CurrencyText value={$1} currency={currency} />");

            // Match formatCurrency(some.var, currency) when it's just a string concatenation, wait no, let's just stick to {formatCurrency(...)}
            
            // Match ternary expressions like: {line.type === 'Debit' ? formatCurrency(line.baseAmount, currency) : '—'}
            // regex: /formatCurrency\(([^,]+),\s*currency\)/g -> <CurrencyText value={$1} currency={currency} />
            // But this might break non-JSX usage. Let's check non-JSX usage.
            
            if (content !== originalContent) {
                // Ensure CurrencyText is imported
                if (!content.includes('CurrencyText')) {
                    content = "import { CurrencyText } from './design/CurrencyText'\n" + content;
                }
                fs.writeFileSync(fullPath, content);
                console.log('Fixed', fullPath);
            }
        }
    }
}

processDir('src/renderer/components');
