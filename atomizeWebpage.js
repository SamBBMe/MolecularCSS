const puppeteer = require('puppeteer');
const fs = require('fs-extra')

async function initializePage() {
 const documentElements = await (async () => {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.setViewport({
        width: 1920,
        height: 4250,
        deviceScaleFactor: 1
    })
    await page.goto(`http://${process.argv[2]}`)
    await page.screenshot({path: `./output/${process.argv[2].split(".")[1]}/puppeteer_snippet.png`});
    const documentElements = await page.evaluate(() => {
        const elements = [ document.getElementsByTagName("html")[0], document.body]
            .concat([...document.body.querySelectorAll("*")]);
        let elementIndex = 0;
        return [...elements].map(element => {
            let computedStyle = window.getComputedStyle(element);
            let nonNumComputedStyles = JSON.parse(JSON.stringify(computedStyle));
            let styles = {}
            
            for( let property in nonNumComputedStyles) {
                if(nonNumComputedStyles[property] === '') continue;
                if(isNaN(property)){
                    styles[property] = nonNumComputedStyles[property]
                } else {
                    styles[nonNumComputedStyles[property]] = computedStyle.getPropertyValue(computedStyle[property]);
                }
            }
            fixedStyles = {}
            for(let property in styles) {
                if(property.startsWith("-webkit") || property.startsWith("webkit") || property.startsWith("perspective")) continue;
                fixed_property = property.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
                fixedStyles[fixed_property] = styles[property];
            }
            
            return {
                elementIndex: elementIndex++, 
                styles: fixedStyles,
                tagName: element.tagName,
                textContent: element.textContent
            };
        });
    });
    const response = await page.goto(`http://${process.argv[2]}`);
    let htmlTemplate = await page.evaluate(() => new XMLSerializer().serializeToString(document));
    fs.writeFileSync(`./output/${process.argv[2].split(".")[1]}/original.html`,  htmlTemplate);
    browser.close();
    return documentElements;
 })()
 let document = new DocumentParser(documentElements);
 document.generateRuleAtomicPairings();
 document.generateElementAtomicParings();
 document.generateAtomicTable();
 document.writeDocumentToJSON();
 console.log(documentElements);
 console.log("hi");
}

class DocumentParser {
    atomicLabelCounter = 0;
    ruleAtomicPairings = new Map();
    elementAtomicPairings = new Array();
    documentElements = null;

    constructor( documentElements ) {
        this.documentElements = documentElements;
        //console.log(documentElements[0]);
    }

    generateAtomicLabel() {
        function stringFromNum(n) {
            return (n >= 25 ? stringFromNum((n / 25 >> 0) - 1) : '') + 'ABCDEFGHIJKLMOPQRSTUVWXYZ'[n % 25 >> 0];
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
        fs.outputFileSync("./temp/atomicClassData.csv", body);
        let classDefs = new Array();
        for( let element of this.ruleAtomicPairings.keys() ) {
            classDefs.push(`${this.ruleAtomicPairings.get(element)}|${element}`)
        }
        fs.outputFileSync("./temp/atomicClassDefs.csv", classDefs.join("\n"));
        return body;
    }

    writeDocumentToJSON() {
        //console.log(JSON.stringify([...this.ruleAtomicPairings]))
        fs.outputFileSync("./temp/documentElements.json", JSON.stringify(this.documentElements))
        fs.outputFileSync("./temp/ruleAtomicPairings.json", JSON.stringify([...this.ruleAtomicPairings]))
        fs.outputFileSync("./temp/elementAtomicPairings.json", JSON.stringify(this.elementAtomicPairings))
    }
}

//fs.outputFileSync("./temp/puppeteer_snippet.png");
initializePage();
