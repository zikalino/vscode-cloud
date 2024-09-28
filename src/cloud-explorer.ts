import * as vscode from 'vscode';
import * as helpers from '@zim.kalinowski/vscode-helper-toolkit';

// XXX - get rid of this
import { marked } from 'marked';
import { displayAzureMenu, displayDoCtlMenu, displayOciMenu, displayUpCtlMenu } from './extension';

var currentCloudId = "";
var resources: any[] = []; 

export function displayCloudExplorer(extensionContext : vscode.ExtensionContext) {

  queryAllResources().then(() => {
    view.updateTreeViewItems(resources);
  });

  let rootMarkup = `
    `;

  let nodeMarkup = `
`;

  let formDefinition = {
    type: 'layout-tree-with-details',
    id: 'layout'
    };

  let view = new helpers.GenericWebView(extensionContext, "Cloud Resources");

  // XXX - don't use dataExamples, query clouds instead

  view.MsgHandler = function (msg: any) {
    switch (msg.command) {
      case 'ready':
        //view.postMessage(populateMsg);
        view.updateTreeViewItems(resources);
        view.updateTreeViewDetails(layoutSetupAz);
        return;
      case 'selected':
        view.updateTreeViewDetails(createDetailsView(view, msg.id));
        return;
      case 'action-clicked':
        if (msg.id === 'action-refresh') {
          view.updateTreeViewDetails({});

          if (currentCloudId === "cloud-azure") {
            azQueryResources().then(() => {
              view.updateTreeViewDetails(layoutSetupAz);
            });
          } else if (currentCloudId === "cloud-upcloud") {
            upctlQueryResources().then(() => {
              view.updateTreeViewDetails(layoutSetupAz);
            });
          } else if (currentCloudId === "cloud-digital-ocean") {
          } else if (currentCloudId === "cloud-oci") {
          }


        } else if (msg.id === 'action-add') {
          if (currentCloudId === "cloud-azure") {
            displayAzureMenu();
          } else if (currentCloudId === "cloud-upcloud") {
            displayUpCtlMenu();
          } else if (currentCloudId === "cloud-digital-ocean") {
            displayDoCtlMenu();
          } else if (currentCloudId === "cloud-oci") {
            displayOciMenu();
          }
        }
        return;
     default:
        console.log('XXX');
    }
  };

  view.createPanel(formDefinition, "media/icon.webp");
}

var layoutSetupAz: any = require('./az__prerequisites.yaml');

function createDetailsView(view: any, id: string) {
  var resource = setContext(id, resources);

  if (resource) {

    var raw = JSON.stringify(resource['raw'], null, 2).split(/\r?\n/);

    for (var i = 0; i < raw.length; i++) {
      raw[i] = "    " + raw[i];
    }

    view.updateTreeViewDetails(layoutSetupAz);

    let setActionsMsg: any = {
      command: 'actions',
      data: [
      ]
    };

    if (resource['id'].startsWith('cloud-') || (resource['raw']['type'] && resource['raw']['type'] === 'Microsoft.Resources/resourceGroups' )) {
      setActionsMsg['data'].push(
      {
        codicon: 'codicon-add',
        description: 'Create Resource',
        action: 'action-add'
      });

      if (resource['id'].startsWith('cloud-') || (resource['raw']['type'] && resource['raw']['type'] === 'Microsoft.Resources/resourceGroups') ) {
        setActionsMsg['data'].push(
        {
          codicon: 'codicon-refresh',
          description: 'Refresh',
          action: 'action-refresh'
        });
      }
    }

    view.postMessage(setActionsMsg);
  }
}

function setContext(id: string, resources: any[]) {
  for (var i = 0; i < resources.length; i++) {
    if (resources[i]['id'] === id) {
      if (id.startsWith("cloud-")) {
        currentCloudId = id;
      }
      return resources[i];
    }

    if (resources[i]['subitems']) {
      var found: any =  setContext(id, resources[i]['subitems']);
      if (found) {
        if (resources[i]['id'].startsWith('cloud-')) {
          currentCloudId = resources[i]['id'];
        }
        return found;
      }
    }
  }

  return null;
}

async function queryAllResources() {
  resources = [
    {
      "name": "Azure",
      "id": "cloud-azure",
      "subitems": await azQueryResources(),
      "raw": {}
    },
    {
      "name": "Digital Ocean",
      "id": "cloud-digital-ocean",
      "subitems": [],
      "raw": {}
    },
    {
      "name": "Oracle Cloud Infrastructure",
      "id": "cloud-oci",
      "subitems": [],
      "raw": {}
    },
    {
      "name": "UpCloud",
      "id": "cloud-upcloud",
      "subitems": await upctlQueryResources(),
      "raw": {}
    }
  ];
}

async function azQueryResources(): Promise<any> {

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
  var resources = azQuerySubResources();

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

function azQuerySubResources() {
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

async function upctlQueryResources(): Promise<any> {

  console.log("Query UpCloud Resources");

  var response: any = [];
  var servers = upctlQueryServers()["servers"];

  // first get all the resource groups

  for (var i = 0; i < servers.length; i++) {
    response.push({
      "name": servers[i]['title'],
      "id": servers[i]['uuid'],
      "subitems": [],
      "raw": servers[i]
      });
  }

  return response;
}

function upctlQueryServers() {
  var r: string = "";
  var cmd = "upctl server list -o json";

  const cp = require('child_process');
  if (process.platform === "win32") {
    r = cp.execSync(cmd, { shell: 'powershell' }).toString();
  } else {
    r = cp.execSync(cmd, { shell: '/bin/bash' }).toString();
  }

  return JSON.parse(r);
}
