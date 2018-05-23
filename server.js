const express = require('express');
const bodyParser = require('body-parser');

const TextRazor = require('textrazor')
//nitai - 1f5b8b282f0efbf7da5f6c543a16a45d58d3ec090ba069c92ffc9587
//dyny - 60d32def4796a0ba0bc0d0f82d0414f9dcf71f9b681c8d7b2fbee5a9
const textRazor = new TextRazor('60d32def4796a0ba0bc0d0f82d0414f9dcf71f9b681c8d7b2fbee5a9')

const wiki = require('wikijs').default; //Wikipedia API

var app = express();
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies
var object = {}
var port = process.env.PORT || 8010;
app.listen(port);

const metascraper = require('metascraper')
const got = require('got')


app.get("", function(req, res){
    res.setHeader('Content-Type', 'application/json');
    res.send({"welcome": "!"});
});

app.get("/phrases", function(req, res){
    res.setHeader('Content-Type', 'application/json');
    let textRazorOptions = {extractors: 'entities, topics, phrases'}
    let text = req.headers.text
    let userLang = req.headers.lang.toLowerCase();
    if(text.length == 0){
        res.send({});
    }
    textRazor.exec(text, textRazorOptions).then(terms =>{
        let phrases = terms.response.entities;
        if(phrases != undefined){
            phrasesLoopScraper(phrases, userLang).then(obj =>{
                res.send(obj);
            }).catch(err => console.error(err));
        } else{
            res.send({});
        }
    }).catch(err =>{
        console.error(err);
    });
})
;

function getTerms(phrases){
    let terms = [];
    let obj;
    let check;
    phrases.forEach(function(termObj){
        check = false;
        for(i in terms){
            if(terms[i].title == termObj.entityId){
                check = true;
            }
        }
        if(termObj.wikiLink != "" && check != true/*termObj.confidenceScore > 1.2*/){
            obj = {};
            obj.title = termObj.entityId;
            obj.wiki = termObj.wikiLink;
            terms.push(obj);
        }
    });
    return terms;
}

async function phrasesLoopScraper(phrases, userLang){
    var ret = await new Promise(resolve =>{
        let obj = {};
        let value;
        let counter = 0;
        let lang = userLang;
        let terms = getTerms(phrases);
        terms.forEach(function(term, j){
            metaScraper(term.wiki).then(scrapedObject =>{
                value = {};
                value.title = term.title;
                value.image = scrapedObject.image;
                value.url = scrapedObject.url;
                value.summary = scrapedObject.description;
                obj[term.title] = value;
                counter++;
                if(counter == Object.keys(terms).length){
                    resolve(obj);
                }
            }).catch(err =>{
                console.error(err);
            });
        });
    });
    return ret;
}

async function phrasesLoop(phrases, userLang){
    var ret = await new Promise(resolve =>{
        let lang = userLang;
        var counter = 0;
        let finalPhrases = [];
        let obj = {};
        phrases.forEach(function(termObj, i){
            if(!finalPhrases.includes(termObj.entityEnglishId) && termObj.confidenceScore > 1.2){
                finalPhrases.push(termObj.entityEnglishId);
            }
        });
        finalPhrases.forEach(function(term, j){
            wikiTerm(term, lang).then(wiki =>{
                obj[wiki.title] = wiki;
                counter++;
                if(counter == finalPhrases.length){
                    resolve(obj);
                }
            }).catch(err =>{
                console.error(err);
            });
        });
    });
    return ret;
}

async function metaScraper(targetUrl){
    var retObject = await new Promise(resolve =>{
        (async() =>{
            var {body: html, url} = await got(targetUrl)
            var metadata = await metascraper({html, url})
            resolve(metadata);
        })()
    }).catch(err =>{
        console.error(err);
        resolve(metadata);

    });
    return retObject;
}

async function wikiTerm(term, userLang){
    var retWikiTerms = await new Promise(resolve =>{
        let langCountry;
        let obj = {};
        let counter = 0;
        wiki().page(term).then(page =>{
            langPage(page, userLang).then(obj =>{
                resolve(obj);
            }).catch(err =>{
                console.error(err);
                resolve(obj);
            });
        }).catch(err =>{
            console.error(err);
            resolve(obj);
        });
    }).catch(err =>{
        console.error(err);
        resolve(obj);
    });

    return retWikiTerms;
}

async function langPage(page, userLang){
    var langObj = await new Promise(resolve =>{
        var obj = {};
        page.langlinks().then(langsArray =>{
            if(langsArray.length < 3){    //does not return object with less then 5 translations
                resolve(obj);
            }
            langTitle = page.raw.title;
            langCountry = "en";
            for(var i = 0; i < langsArray.length; i++){
                if(langsArray[i].lang == userLang){
                    langTitle = langsArray[i].title;
                    langCountry = userLang;
                    break;
                }
            }
            wiki({apiUrl: 'http://' + langCountry + '.wikipedia.org/w/api.php'}).page(langTitle).then(page =>{
                obj.title = page.raw.title;
                obj.url = page.raw.fullurl;
                page.summary().then(summary =>{
                    obj.summary = summary;
                    if(obj.image != undefined){
                        resolve(obj);
                    }
                }).catch(err =>{
                    obj.summary = "";
                    if(obj.image != undefined){
                        resolve(obj);
                    }
                });
                page.mainImage().then(mainImage =>{
                    obj.image = mainImage;
                    if(obj.summary != undefined){
                        resolve(obj);
                    }
                }).catch(err =>{
                    obj.image = "";
                    if(obj.summary != undefined){
                        resolve(obj);
                    }
                });
            }).catch(err =>{
                console.error(err);
            });
        }).catch(err =>{
            console.error(err);
        });
    });
    return langObj;
}

// page.html().then(html =>{
//     if(html.indexOf("may refer to") != -1){
//         page.links().then(links =>{
//             //console.log(links);
//             wiki().page(links[0]).then(page =>{
//                 langPage(page, userLang).then(obj =>{
//                     resolve(obj);
//                 }).catch(err =>{
//                     console.error(err);
//                 });
//             }).catch(err =>{
//                 console.error(err);
//             });
//         }).catch(err =>{
//             console.error(err);
//         });
//     } else{
//         langPage(page, userLang).then(obj =>{
//             resolve(obj);
//         }).catch(err =>{
//             console.error(err);
//         });
//     }
// }).catch(err =>{
//     console.error(err);
// });