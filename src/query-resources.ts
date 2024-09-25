import * as vscode from 'vscode';

export async function queryResources(): Promise<any> {

  console.log("Query Azure Resources");

  var response: any = [];
  var resourceGroups = azQueryResourceGroups();

  // first get all the resource groups

  for (var i = 0; i < resourceGroups.length; i++) {
    response.push({
      "name": resourceGroups[i]['name'],
      "id": resourceGroups[i]['name'],
      "subitems": [],
      "raw": resourceGroups[i]
      });
  }

  // query all the resources and append them to appropriate resource groups
  var resources = azQueryResources();

  for (var i = 0; i < resources.length; i++) {
    // find resource group to stick it into
    for (var j = 0; j < response.length; j++) {
      if (response[j]['name'] === resources[i]['resourceGroup']) {
        response[j]['subitems'].push({
          "name": resources[i]['name'],
          "id": resources[i]['name'],
          "raw": resources[i],
          "subitems": [{ name: "abc" + i, id: "cde" + i}, { name: "xyz" + i, id: "xyz" + i,
            subitems: [ {name: "qqq" + i, id: "rrr" + i} ]}
          ]
          });
      }
    }
  }

  return response;
}

function azQueryResources() {
  var r: string = "";
  var cmd = "az resource list";

  const cp = require('child_process');
  if (process.platform === "win32") {
    r = cp.execSync(cmd, { shell: 'powershell' }).toString();
  } else {
    r = cp.execSync(cmd, { shell: '/bin/bash' }).toString();
  }

  return JSON.parse(r);
}

function azQueryResourceGroups() {
  var r: string = "";
  var cmd = "az group list";

  const cp = require('child_process');
  if (process.platform === "win32") {
    r = cp.execSync(cmd, { shell: 'powershell' }).toString();
  } else {
    r = cp.execSync(cmd, { shell: '/bin/bash' }).toString();
  }

  return JSON.parse(r);
}
