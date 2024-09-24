import * as vscode from 'vscode';

export async function queryResources(): Promise<any> {

  console.log("Query Azure Resources");

  var response: any = [];
  var resourceGroups = azQueryResourceGroups();

  var resources = azQueryResources();

  // first get all the resource groups

  for (var i = 0; i < resourceGroups.length; i++) {
    response.push({
      "name": resourceGroups[i]['name'],
      "id": "get_started",
      "subitems": []
      });
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

