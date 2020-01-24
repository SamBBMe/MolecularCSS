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
 document.generateRuleAtomicPairings();
 document.generateElementAtomicParings();
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
        return String.fromCharCode(this.atomicLabelCounter++)
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
        }
    }
}

initializePage();