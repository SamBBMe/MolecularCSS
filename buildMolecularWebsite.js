const fs = require('fs-extra')
const parse5 = require('parse5');
let htmlFile = fs.readFileSync("test.html", "utf8");
const document = parse5.parse(htmlFile);
let molecules = fs.readJSONSync("./temp/molecules.json");

for( let i = 0; i < molecules.length; i++ ){
    molecules[i] = JSON.parse(molecules[i])
}
molecules.sort(function(a, b) {
    return b.atomicRules.length - a.atomicRules.length
})

let documentElements = fs.readJSONSync("./temp/documentElements.json");
let ruleAtomicPairings = new Map(fs.readJSONSync("./temp/ruleAtomicPairings.json"));
let elementAtomicPairings = fs.readJSONSync("./temp/elementAtomicPairings.json");

//console.log(document);


class HTMLParser {
    document;
    documentElements;
    ruleAtomicPairings;
    elementAtomicPairings;
    currentNodeCounter = 0;
    molecules;
    moleculesUsed = [];

    constructor( document, documentElements, ruleAtomicPairings, elementAtomicPairings, molecules ) {
        this.document = document;
        this.findBody();
        this.documentElements = documentElements;
        this.ruleAtomicPairings = ruleAtomicPairings;
        this.elementAtomicPairings = elementAtomicPairings;
        this.molecules = molecules;
        //console.log(this.documentElements);
    }

    setClassString( node, newClassString ) {
        let needsClassString = true;
        for( let attribute of node.attrs ) {
            if(attribute.name === "class") {
                attribute.value = newClassString;
                needsClassString = false;
                break;
            }
        }

        if( needsClassString ) {
            node.attrs.push({
                name: "class",
                value: newClassString
            })
        }
    }

    getClassString(node) {
        for( let attribute of node.attrs ) {
            if(attribute.name === "class") {
                return attribute.value;
            }
        }

        node.attrs.push({
            name: "class",
            value: ""
        })
        return "";
    }

    molecularizeNode(node) {
        if(node.nodeName !== "#text") {
            let nodeCSSClasses = this.getClassString(node).split(" ");
            for( let molecule of this.molecules ) {
                let containsAtomicClasses = true;
                for( let atomicClass of molecule.atomicRules ) {
                    if(!nodeCSSClasses.includes(atomicClass)) {
                        containsAtomicClasses = false;
                        break;
                    }
                }
                if( containsAtomicClasses ) {
                    nodeCSSClasses.push( molecule.className );
                    this.moleculesUsed.push( molecule );
                    for( let atomicClass of molecule.atomicRules ) {
                        nodeCSSClasses.splice( nodeCSSClasses.indexOf(atomicClass), 1 );
                    }
                }
            }
            this.setClassString(node, nodeCSSClasses.join(" "))
        }

        if(node.childNodes) {
            for( let childNode of node.childNodes ) {
                this.molecularizeNode(childNode);
            }
        }
    }

    molecularizeHTML() {
        for( let node of this.document ) {
            this.molecularizeNode(node);
        }
    }

    checkIfBody(node) {
        if(this.document.nodeName !== "body"){ 
            if( node.nodeName === "body" ) {
                this.document = node;
            } else {
                if(node.childNodes) {
                    for( let childNode of node.childNodes ) {
                        this.checkIfBody(childNode);
                    }
                }
            }
        }
    }
    
    findBody() {
        for( let node of this.document.childNodes ) {
            this.checkIfBody(node);
        }
        this.document = this.document.childNodes;
        //console.log(this.document);
    }

    atomizeNode(node) {
        //console.log(`nodeName: ${node.nodeName} eA.Length: ${this.elementAtomicPairings.length} \t Counter: ${this.currentNodeCounter}`)
        if(node.nodeName !== "#text") {
            this.setClassString(node, this.elementAtomicPairings[this.currentNodeCounter].join(" "));
            this.currentNodeCounter++;
        }
        if(node.childNodes) {
            for( let childNode of node.childNodes ) {
                this.atomizeNode(childNode);
            }
        }
    }

    atomizeHTML() {
        for( let node of this.document ) {
            this.atomizeNode(node);
        }
    }

    createHTMLFile() {
        fs.outputFileSync("./output/test2.html", parse5.serialize(document));
    }

    createCSSFile() {
        let CSSString = "";
        let atomicRulePairings = new Map(
            [...this.ruleAtomicPairings].map(pairing => pairing.reverse())
        );
        
        for( let molecule of this.moleculesUsed ) {
            CSSString += `.${molecule.className} {\n\t${ 
                molecule.atomicRules.map(rule => {
                    return atomicRulePairings.get(rule).split(":").join(": ");
                    }).join(";\n\t")
                }\n}\n\n`
        }

        function logMapElements(value, key, map) {
            CSSString += `\n.${key} {\n\t${value.split(":").join(": ")};\n}\n`;
        }

        atomicRulePairings.forEach((value, key, map) => {
            if(isNaN(value.split(":")[0])) {
                CSSString += `\n.${key} {\n\t${value.split(":").join(": ")};\n}\n`
            } else {
                CSSString += `\n.${key} {\n\t${value.split(":")[1]}: none;\n}\n`
            }
        });
    
        fs.outputFileSync("./output/test2.css", CSSString);
    }
}


let htmlParser = new HTMLParser(document, documentElements, ruleAtomicPairings, elementAtomicPairings, molecules);
htmlParser.atomizeHTML();
htmlParser.molecularizeHTML();
htmlParser.createHTMLFile();
htmlParser.createCSSFile();


//console.log(molecules)