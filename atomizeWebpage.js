const puppeteer = require('puppeteer');
const fs = require('fs-extra')

async function initializePage() {
 const documentElements = await (async () => {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.goto('https://www.amazon.com/')
    const documentElements = await page.evaluate(() => {
        const elements = document.body.getElementsByTagName("*");
        let elementIndex = 0;
        return [...elements].map(element => {
          return {
              elementIndex: elementIndex++, 
              styles: JSON.parse(JSON.stringify(window.getComputedStyle(element)))
            };
        });
      });
    browser.close();
    return documentElements;
 })()
 let document = new DocumentParser(documentElements);
 document.generateRuleAtomicPairings();
 document.generateElementAtomicParings();
 document.generateAtomicTable();
 console.log("hi");
}

class CSSRule {
    constructor(rule, value) {
        if(typeof rule === "number") {
            this.rule = value;
            this.value = FLAG_TYPE_DEF;
        } else {
            this.rule = rule;
            this.value = value;
        }
    }

    stringifyRule(){
        return `${this.rule}:${this.value}`;
    }
}


class DocumentParser {
    atomicLabelCounter = 0;
    ruleAtomicPairings = new Map();
    elementAtomicPairings = new Array();
    documentElements = null;

    constructor( documentElements ) {
        this.documentElements = documentElements;
    }

    generateAtomicLabel() {
        function stringFromNum(n) {
            return (n >= 26 ? stringFromNum((n / 26 >> 0) - 1) : '') + 'abcdefghijklmnopqrstuvwxyz'[n % 26 >> 0];
        }
        return stringFromNum(this.atomicLabelCounter++);
    }

    generateRuleAtomicPairings() {
        for(const element of this.documentElements) {
            for(const rule in element.styles) {
                if(!this.ruleAtomicPairings.get(`${rule}:${element.styles[rule]}`)) {
                    this.ruleAtomicPairings.set(`${rule}:${element.styles[rule]}`, this.generateAtomicLabel());
                }
            }
        }
    }

    generateElementAtomicParings() {
        for(const element of this.documentElements) {
            this.elementAtomicPairings[element.elementIndex] = new Array(this.documentElements[element.elementIndex].styles.length);
            for(const rule in element.styles) {
                this.elementAtomicPairings[element.elementIndex].push(
                    this.ruleAtomicPairings.get(`${rule}:${element.styles[rule]}`)
                );
            }
            this.elementAtomicPairings[element.elementIndex].splice(0,1);
        }
    }

    generateAtomicTable() {
        let headers = [...this.ruleAtomicPairings.values()];
        let body = new Array();
        for( let [elementIndex, element] of this.elementAtomicPairings.entries() ) {
            body[elementIndex] = new Array();
            for( let [atomicRuleIndex, atomicRule] of headers.entries() ) {
                if(element.includes(atomicRule)) {
                    body[elementIndex][atomicRuleIndex] = true;
                } else {
                    body[elementIndex][atomicRuleIndex] = false;
                }
            }
        }
        body = body.map( element => element.join(",") );
        headers = headers.join(",");
        body.unshift(headers);
        body = body.join("\r\n");
        fs.outputFileSync("./temp/atomicClassData.csv", body)
        return body;
    }
}

initializePage();