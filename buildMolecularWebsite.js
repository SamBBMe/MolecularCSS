const fs = require('fs-extra')
const parse5 = require('parse5');
let htmlFile = fs.readFileSync("csszengarden.html", "utf8");
let document = parse5.parse(htmlFile);
let molecules = fs.readJSONSync("./temp/molecules.json");

for( let i = 0; i < molecules.length; i++ ){
    molecules[i] = JSON.parse(molecules[i])
}

//molecules.sort(function(a, b) {
//    return b.atomicRules.length - a.atomicRules.length
//})

let styleSheetFound = false;
for(let [i, node] of document.childNodes[1].childNodes[0].childNodes.entries()) {
    if( node.nodeName = "link" && node.attrs) {
        for( let attr of node.attrs ) {
            if(attr.name === "rel" && (attr.value === "stylesheet" || attr.value === "alternate")) {
                if( styleSheetFound ) {
                    //console.log(i)
                    //console.log(document.childNodes[1].childNodes[0].childNodes[7].nodeName)
                    document.childNodes[1].childNodes[0].childNodes.splice(i, 1);
                    //console.log(document.childNodes[1].childNodes[0].childNodes[7].nodeName)
                } else {
                    styleSheetFound = true;
                    for( let attr of node.attrs) {
                        if( attr.name === "href" ) {
                            attr.value = "test2.css";
                        }   
                    }
                }
            }
        }
    }
}
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
    moleculesUsed = new Set();
    nodeIndex = 0;

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
        if(node.attrs) {
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
    }

    getClassString(node) {
        if(node.attrs) {
            for( let attribute of node.attrs ) {
                if(attribute.name === "class") {
                    return attribute.value;
                }
            }

            node.attrs.push({
                name: "class",
                value: ""
            })
        }
        return "";
    }

    molecularizeNode(node) {
        if(!node.nodeName.startsWith("#")) {
            /*let nodeCSSClasses = this.getClassString(node).split(" ");
            let moleculesUsed = [];
            let atomicClassesUsed = [];
            for( let molecule of this.molecules ) {
                let containsAtomicClasses = true;
                let moleculeAtoms = [];
                for( let atomicClass of molecule.atomicRules ) {
                    moleculeAtoms.push(atomicClass);
                    if(!nodeCSSClasses.includes(atomicClass)) {
                        containsAtomicClasses = false;
                        break;
                    }
                }
                if( containsAtomicClasses ) {
                    moleculesUsed.push( molecule.className );
                    atomicClassesUsed.concat( moleculeAtoms );
                    this.moleculesUsed.add( molecule );
                }
            }
            for( let atomicClass of atomicClassesUsed ) {
                nodeCSSClasses.splice( nodeCSSClasses.indexOf(atomicClass), 1 );
            }
            //console.log(nodeCSSClasses);
            //nodeCSSClasses = nodeCSSClasses.filter(function(cls) { return cls.startsWith("prop_") });
            //console.log(nodeCSSClasses);
            this.setClassString(node, moleculesUsed.join(" "))
            */
            console.log(`Node index: ${this.nodeIndex} Node name: ${node.nodeName} Class name: ${this.molecules[this.nodeIndex].className}`);
            console.log(node.parentNode.attrs);
            let splitClassString = "";
            let classStringComponents = this.molecules[this.nodeIndex++].className.split("_");
            for(let i = 0; i < classStringComponents.length; i++) {
                let classStringPart = "";
                for(let j = 0; j <= i; j++) {
                    classStringPart += classStringComponents[j];
                    if(j < i) { classStringPart += "_"; }
                }
                let found = false;
                if(node.parentNode.attrs !== undefined) {
                    for(let k = 0; k < node.parentNode.attrs.length; k++) {
                        if(node.parentNode.attrs[k].name == "class") {
                            let parentClass = node.parentNode.attrs[k];
                            console.log("parentClass: '" + parentClass.value + "'");
                            console.log("classStringPart: '" + classStringPart + "'");
                            if(parentClass.value.includes(classStringPart + " ")) {
                                console.log("found");
                                found = true;
                                break;
                            }
                        }
                    }
                }
                if(!found) {
                    splitClassString += classStringPart + " ";
                }
            }
            this.setClassString(node, splitClassString);
        }

        if(node.childNodes && node.nodeName !== "html") {
            for( let childNode of node.childNodes ) {
                this.molecularizeNode(childNode);
            }
        }
    }

    molecularizeHTML() {
       for(let node of this.document) {
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
        let htmlTag = document.childNodes[1]
        for( let node of this.document.childNodes ) {
            this.checkIfBody(node);
        }
        this.document = [htmlTag].concat(this.document);
        //console.log(this.document);
    }

    atomizeNode(node) {
        //console.log(`nodeName: ${node.nodeName} eA.Length: ${this.elementAtomicPairings.length} \t Counter: ${this.currentNodeCounter}`)
        if(!node.nodeName.startsWith("#")) {
            this.setClassString(node, this.elementAtomicPairings[this.currentNodeCounter].join(" "));
            this.currentNodeCounter++;
        }
        if(node.childNodes && node.nodeName !== "html") {
            for( let childNode of node.childNodes ) {
                this.atomizeNode(childNode);
            }
        }
    }

    atomizeHTML() {
        //this.document.forEach(this.atomizeNode);
        for(let node of this.document) {
            this.atomizeNode(node);
        }
        //this.atomizeNode(this.document);
    }

    createHTMLFile() {
        fs.outputFileSync("./output/test2.html", parse5.serialize(document));
    }

    createCSSFile() {
        let CSSString = "";
        let atomicRulePairings = new Map(
            [...this.ruleAtomicPairings].map(pairing => pairing.reverse())
        );
        
        for( let molecule of this.molecules ) {
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
                CSSString += `\n.${key} {\n\t${value.split(":")[1]}: ;\n}\n`
            }
        });
    
        fs.outputFileSync("./output/test2.css", CSSString);
    }
}

//console.log(document.childNodes[1].attrs)
let htmlParser = new HTMLParser(document, documentElements, ruleAtomicPairings, elementAtomicPairings, molecules);
htmlParser.atomizeHTML();
htmlParser.molecularizeHTML();
htmlParser.createHTMLFile();
//htmlParser.createCSSFile();


//console.log(molecules)
