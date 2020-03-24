const spawn = require('cross-spawn');
const fs = require('fs-extra')

const websitesToTest = fs.readFileSync("./listOfWebsitesToTest.txt", "utf-8").split("\n");

for( const website of websitesToTest ) {
    console.log(website);
    //fs.ensureDirSync(`./output/${website}`);
    fs.ensureDirSync(`./output/${website.split(".")[1]}/`)
    let result = spawn.sync('node', ['atomizeWebpage.js', website], { stdio: 'inherit' });
    //console.log(result);
    result = spawn.sync('py', ['makeMolecules.py', website.split(".")[1]], { stdio: 'inherit' });
    //console.log(result);
    result = spawn.sync('node', ['buildMolecularWebsite.js', website.split(".")[1]], { stdio: 'inherit' });
    //console.log(result);
}