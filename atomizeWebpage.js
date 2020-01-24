const puppeteer = require('puppeteer');

async function initializePage() {
 const documentElements = await (async () => {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.goto('file:///C:/Users/SamBBMe/Desktop/Senior%20Research%20Semester%202/test.html')
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
    elementAtomicPairings = new Map();
    documentElements = null;

    constructor( documentElements ) {
        this.documentElements = documentElements;
        console.log(this.documentElements);
    }

    generateAtomicLabel() {
        return String.fromCharCode(atomicLabelCounter)
    }

    generateRuleAtomicPairings() {
        for(const element of documentElements) {
            for(const rule in element.styles) {
                
            }
        }
    }

    generateElementAtomicParings() {

    }
}

initializePage();