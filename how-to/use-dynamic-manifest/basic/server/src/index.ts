import *  as express from "express";
import * as path from "path";
const app = express();
const port = 3000;

app.get('/manifest', (req, res) => {
   const env = req.query.env;
   if(env === 'dev'){
        res.json({
        "licenseKey": "openfin-demo-license-key",
        "runtime": {
            "arguments": "--v=1 --inspect",
            "version": "stable"
        },
        "platform": {
            "uuid": "how-to-use-dynamic-manifest-basic",
            "autoShow": false,
            "icon":"http://localhost:3000/favicon.ico",
            "preloadScripts": [
            ],
            "defaultWindowOptions": {
                "preloadScripts": [
                
                ]
            },
            "defaultViewOptions": {
                "preloadScripts": [
                
                ]
            }
        },
        "snapshot": {
            "windows": [
            {
                "layout": {
                "content": [
                    {
                    "type": "stack",
                    "id": "no-drop-target",
                    "content": [
                        {
                        "type": "component",
                        "componentName": "view",
                        "componentState": {
                            "processAffinity": "ps_1",
                             "url": "http://localhost:3000/html/app-dev.html"
                        }
                        }
                    ]
                    }
                ]
                }
            }
            ]
        }
        });
   }else if(env === 'staging'){
    res.json({
        "licenseKey": "openfin-demo-license-key",
        "runtime": {
            "arguments": "--v=1 --inspect",
            "version": "stable"
        },
        "platform": {
            "uuid": "how-to-use-dynamic-manifest-basic",
            "autoShow": false,
            "icon":"http://localhost:3000/favicon.ico",
            "preloadScripts": [
            ],
            "defaultWindowOptions": {
                "preloadScripts": [
                
                ]
            },
            "defaultViewOptions": {
                "preloadScripts": [
                
                ]
            }
        },
        "snapshot": {
            "windows": [
            {
                "layout": {
                "content": [
                    {
                    "type": "stack",
                    "id": "no-drop-target",
                    "content": [
                        {
                        "type": "component",
                        "componentName": "view",
                        "componentState": {
                            "processAffinity": "ps_1",
                            "url": "http://localhost:3000/html/app-staging.html"
                        }
                        }
                    ]
                    }
                ]
                }
            }
            ]
        }
        });
   }else if(env === 'workspace'){
    res.json({
        "url": "https://www.google.com"
      });
   }
})

app.get('/html/app-dev.html', function(req, res) {
  res.sendFile(path.join(__dirname, '../../public/html/app-dev.html'));
});

app.get('/html/app-staging.html', function(req, res) {
  res.sendFile(path.join(__dirname, '../../public/html/app-staging.html'));
});

app.get('/favicon.ico', function(req, res) {
    res.sendFile(path.join(__dirname, '../../public/favicon.ico'));
  });

app.listen(port, () => {
    console.log("server is listening on port", port);
});