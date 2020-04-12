const fs = require('fs-extra');
const puppeteer = require('puppeteer');
const compareImages = require("resemblejs/compareImages");
const resolve = require('path').resolve

let websitePath = resolve(`./output/${process.argv[2]}`).replace(/\\/g, '/');
let atomicHTMLPath = `${websitePath}/atomicWebsite.html`;
let atomicCSSPath = `${websitePath}/atomicWebsite.css`;
let molecularHTMLPath = `${websitePath}/molecularWebsite.html`;
let molecularCSSPath = `${websitePath}/molecularWebsite.css`;
let originalWebsiteImagePath = `${websitePath}/puppeteer_snippet.png`;
let builtWebsiteImagePath = `${websitePath}/builtWebsite.png`;
let imageDifferencePath = `${websitePath}/websiteDifferences.png`;
let originalWebsiteDocumentElementsPath = `${websitePath}/original_documentElements.json`;
let builtWebsiteDocumentElementsPath = `${websitePath}/built_documentElements.json`;
let statisticsFilePath = `${websitePath}/websiteStatistics.json`;
fs.copySync('./temp/documentElements.json', originalWebsiteDocumentElementsPath);
console.log(molecularHTMLPath);

let websiteStatistics = {
    imageSimilarity: 0,
    documentElementSimilarity: 0,
    atomicHTMLSize: fs.statSync(atomicHTMLPath).size,
    atomicCSSSize: fs.statSync(atomicCSSPath).size,
    molecularHTMLSize: fs.statSync(molecularHTMLPath).size,
    molecularCSSSize: fs.statSync(molecularCSSPath).size
}

async function initializePage() {
    const documentElements = await (async () => {
        const browser = await puppeteer.launch()
        const page = await browser.newPage()
        await page.setViewport({
            width: 1920,
            height: 4250,
            deviceScaleFactor: 1
        })
        await page.goto(molecularHTMLPath)
        await page.screenshot({ path: builtWebsiteImagePath });
        const documentElements = await page.evaluate(() => {
            const elements = [document.getElementsByTagName("html")[0], document.body]
                .concat([...document.body.querySelectorAll("*")]);
            let elementIndex = 0;
            return [...elements].map(element => {
                let computedStyle = window.getComputedStyle(element);
                let nonNumComputedStyles = JSON.parse(JSON.stringify(computedStyle));
                let styles = {}

                for (let property in nonNumComputedStyles) {
                    if (nonNumComputedStyles[property] === '') continue;
                    if (isNaN(property)) {
                        styles[property] = nonNumComputedStyles[property]
                    } else {
                        styles[nonNumComputedStyles[property]] = computedStyle.getPropertyValue(computedStyle[property]);
                    }
                }
                fixedStyles = {}
                for (let property in styles) {
                    if (property.startsWith("-webkit") || property.startsWith("webkit") || property.startsWith("perspective")) continue;
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
        fs.writeFileSync(builtWebsiteDocumentElementsPath, JSON.stringify(documentElements));
        browser.close();
        return documentElements;
    })();
}

async function getImageDiff() {
    let imageData = await compareImages(await fs.readFile(originalWebsiteImagePath), await fs.readFile(builtWebsiteImagePath));
    websiteStatistics.imageSimilarity = imageData.rawMisMatchPercentage;
    await fs.writeFile(imageDifferencePath, imageData.getBuffer());
    console.log(imageData);

}

async function createStatistics() {
    await initializePage();
    await getImageDiff();
    let original_documentElements = fs.readJSONSync(originalWebsiteDocumentElementsPath);
    let built_documentElements = fs.readJsonSync(builtWebsiteDocumentElementsPath);

    let matchingElements = 0;
    for (let i = 0; i < original_documentElements.length; i++) {
        if (!built_documentElements[i]) break;
        let matchingStyles = true;
        for (let style in original_documentElements[i].styles) {
            if (original_documentElements[i][style] !== built_documentElements[i][style]) {
                matchingStyles = false;
                break;
            }
        }
        if (matchingStyles) matchingElements++;
    }
    websiteStatistics.documentElementSimilarity = matchingElements / original_documentElements.length;
    fs.outputJson(statisticsFilePath, websiteStatistics);
}

createStatistics();

