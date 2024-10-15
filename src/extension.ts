import * as vscode from 'vscode';
import YAML from 'yaml';
import * as helpers from '@zim.kalinowski/vscode-helper-toolkit';

import { extractAllCommands, parseCmdGroup } from './help-parser';
import { displayCloudExplorer } from './cloud-explorer';

//import SwaggerParser from "@apidevtools/swagger-parser";
var extensionUri: vscode.Uri;
var mediaFolder: vscode.Uri;
export var extensionContext: vscode.ExtensionContext;

const fs = require("fs");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate (context: vscode.ExtensionContext) {
  extensionContext = context;
  extensionUri = context.extensionUri;

  mediaFolder = vscode.Uri.joinPath(extensionUri, 'media');

  let disposable = vscode.commands.registerCommand(
    'vscode-cloud.displayAzPrerequisitesView',
    () => {
      displayAzPrerequisitesView();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-cloud.displayDoCtlPrerequisitesView',
    () => {
      displayDoCtlPrerequisitesView();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-cloud.displayOciPrerequisitesView',
    () => {
      displayOciPrerequisitesView();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-cloud.displayUpCtlPrerequisitesView',
    () => {
      displayUpCtlPrerequisitesView();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-cloud.displayAzureMenu',
    () => {
      displayAzureMenu();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-cloud.displayDoCtlMenu',
    () => {
      displayDoCtlMenu();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-cloud.displayKamateraMenu',
    () => {
      displayDoCtlMenu();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-cloud.displayOciMenu',
    () => {
      displayOciMenu();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-cloud.displayUpCtlMenu',
    () => {
      displayUpCtlMenu();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-cloud.displayVultrMenu',
    () => {
      displayVultrMenu();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-cloud.displayRawAzureMenu',
    () => {
      displayRawAzureMenu();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-cloud.displayRawDoCtlMenu',
    () => {
      displayRawDoCtlMenu();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-cloud.displayRawKamateraMenu',
    () => {
      displayRawKamateraMenu();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-cloud.displayRawOciMenu',
    () => {
      displayRawOciMenu();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-cloud.displayRawUpCtlMenu',
    () => {
      displayRawUpCtlMenu();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-cloud.displayRawVultrMenu',
    () => {
      displayRawVultrMenu();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-cloud.displayAzureApiBrowser',
    () => {
      parseApi();
    }
  );

  disposable = vscode.commands.registerCommand(
    'vscode-cloud.displayCloudExplorer',
    () => {
      //parseCommands();
      displayCloudExplorer(extensionContext);
    }
  );


  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate () {}

async function displayAzPrerequisitesView() {
  let yml = loadYaml(extensionContext.extensionPath + "/defs/az__prerequisites.yaml");
  displayPrerequisitesView(yml);
}

async function displayDoCtlPrerequisitesView() {
  let yml = loadYaml(extensionContext.extensionPath + "/defs/doctl__prerequisites.yaml");
  displayPrerequisitesView(yml);
}

async function displayOciPrerequisitesView() {
  let yml = loadYaml(extensionContext.extensionPath + "/defs/oci__prerequisites.yaml");
  displayPrerequisitesView(yml);
}

async function displayUpCtlPrerequisitesView() {
  let yml = loadYaml(extensionContext.extensionPath + "/defs/upctl_prerequisites.yaml");
  displayPrerequisitesView(yml);
}

async function displayPrerequisitesView(layout: string) {
  let view = new helpers.GenericWebView(extensionContext, "Installer");
  view.createPanel(layout, "media/icon.webp");

  view.MsgHandler = function (msg: any) {
    if (msg.command === 'ready') {
      view.runStepsVerification();
    } else if (msg.command === 'button-clicked') {
      //vscode.window.showInformationMessage('Button ' + msg.id + ' Clicked!');
      if (msg.id === 'close') {
        view.close();
      } else if (msg.id === 'install_button') {
        view.runStepsInstallation();
      }
    } else if (msg.command === 'radio-clicked') {
    } else if (msg.command === 'dropdown-clicked') {
    } else if (msg.command === 'action-clicked') {
      if (msg.id === 'action-refresh') {        
      }
    }
  };
}

async function parseCommands() {
  let response = await parseCmdGroup("az");
  loadYamlView(loadYaml(response));
}

export async function displayAzureMenu() {
  //let response = await parseCmdGroup("az");
  //loadYamlView(loadYaml(response));
  let d: any = {}
  let response = await extractAllCommands("oci", d);
  console.log(response.keys());
  //let menu: any = loadYaml(extensionContext.extensionPath + "/defs/___az_menu.yaml");
  //displayMenu(menu);
}

export async function displayDoCtlMenu() {
  let menu: any = loadYaml(extensionContext.extensionPath + "/defs/___doctl_menu.yaml");
  displayMenu(menu);
}

export async function displayKamateraMenu() {
  let menu: any = loadYaml(extensionContext.extensionPath + "/defs/___kamatera_menu.yaml");
  displayMenu(menu);
}

export async function displayLinodeMenu() {
  let menu: any = loadYaml(extensionContext.extensionPath + "/defs/___linode_menu.yaml");
  displayMenu(menu);
}

export async function displayOciMenu() {
  let menu: any = loadYaml(extensionContext.extensionPath + "/defs/___oci_menu.yaml");
  displayMenu(menu);
}

export async function displayUpCtlMenu() {
  let menu: any = loadYaml(extensionContext.extensionPath + "/defs/___upctl_menu.yaml");
  displayMenu(menu);
}

export async function displayVultrMenu() {
  let menu: any = loadYaml(extensionContext.extensionPath + "/defs/___vultr_menu.yaml");
  displayMenu(menu);
}

export async function displayRawAzureMenu() {
  displayRawMenu("defs/___az_structure.yaml");
}

export async function displayRawDoCtlMenu() {
  let menu: any = loadYaml(extensionContext.extensionPath + "/defs/___doctl_menu.yaml");
  displayMenu(menu);
}

export async function displayRawKamateraMenu() {
  displayRawMenu("defs/___kamatera_structure.yaml");
}

export async function displayRawLinodeMenu() {
  displayRawMenu("defs/___linode_structure.yaml");
}

export async function displayRawOciMenu() {
  displayRawMenu("defs/___oci_structure.yaml");
}

export async function displayRawUpCtlMenu() {
  displayRawMenu("defs/___upctl_structure.yaml");
}

export async function displayRawVultrMenu() {
  displayRawMenu("defs/___vultr_structure.yaml");
}

async function displayRawMenu(yamlDefinition: string) {
  let def: any = loadYaml(extensionContext.extensionPath + "/" + yamlDefinition);

  var selected: string[] = [];
  for (var i in def) {
    selected.push(def[i]);
  }

  const result = await vscode.window.showQuickPick(selected, {
    placeHolder: 'Select...'
  });

  // XXX = either generate or run from file?
}

async function displayMenu(submenu: any) {
  var selected: string[] = [];
  for (var i in submenu) {
    selected.push(submenu[i].name);
  }

  const result = await vscode.window.showQuickPick(selected, {
    placeHolder: 'Select...'
  });

  for (var i in submenu) {
    if (submenu[i].name === result) {
      if ('submenu' in submenu[i]) {
        displayMenu(submenu[i].submenu);
      } else {
        // XXX - load yaml
        let yml = loadYaml(extensionContext.extensionPath + "/defs/" + submenu[i].location);
        loadYamlView(yml);
      }
    }
  }
}

async function loadYamlView(yml: string) {
  let view = new helpers.GenericWebView(extensionContext, "New Resource"); 
  view.createPanel(yml, "media/icon.webp");

  view.MsgHandler = function (msg: any) {
    if (msg.command === 'ready') {
      view.runStepsVerification();
    } else if (msg.command === 'button-clicked') {
      //vscode.window.showInformationMessage('Button ' + msg.id + ' Clicked!');
      if (msg.id === 'close') {
        view.close();
      } else if (msg.id === 'install_button') {
        view.runStepsInstallation();
      }
    }
  };
}


async function parseApi() {
  let api = await SwaggerParser.parse("c:\\Users\\Lenovo\\azure-rest-api-specs\\specification\\resources\\resource-manager\\Microsoft.Resources\\stable\\2024-03-01\\resources.json");
  console.log("API name: %s, Version: %s", api.info.title, api.info.version);
}

// XXX - perhaps this should be moved to helpers
export function loadYaml(location: string) : any {
  // extensionContext.extensionPath + "/defs/" + result + ".yaml"
  let y = fs.readFileSync(location, "utf8");
  y = YAML.parse(y);
  loadIncludes(y);
  return y;
}

function loadIncludes(data: any) {

  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      for (let i = data.length - 1; i >= 0; i--) {

        if ((typeof data[i] === 'object') && ('$include' in data[i])) {
          var prefix = undefined;
          if ('prefix' in data[i]) {
            prefix = data[i]['prefix'];
          }
          var showif = undefined;
          if ('show-if' in data[i]) {
            showif = data[i]['show-if'];
          }

          var included = loadYaml(extensionContext.extensionPath + "/defs/" + data[i]['$include']);

          // apply prefix
          if (prefix !== undefined) {
            applyPrefix(included, prefix);
          }

          if (typeof included === 'object') {
            if (Array.isArray(included)) {

              if (showif !== undefined) {
                for (var j = 0; j < included.length; j++) {
                  included[j]['show-if'] = showif;
                }
              }

              // insert several elements
              data.splice(i, 1, ...included);
            } else {
              if (showif !== undefined) {
                included['show-if'] = showif;
              }
              // just replace this entry with new dictionary
              data[i] = included;
            }
          }
        } else {
          loadIncludes(data[i]);
        }
      }
    }
    else {
      if ('@include' in data) {
        // XXX - load this include
        var included = loadYaml(extensionContext.extensionPath + "/defs/" + data['location']);
        data.clear();
        for (var k in included) {
          data[k] = included[k];
        }
      }

      for (let key in data) {
        if (typeof data[key] === 'object') {
          loadIncludes(data[key]);
        }
      }
    }
  }
}

function applyPrefix(data: any, prefix: string) {
  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      for (let i = data.length - 1; i >= 0; i--) {
        applyPrefix(data[i], prefix);
      }
    }
    else {
      for (let key in data) {
        if (typeof data[key] === 'object') {
          if (key === 'produces') {
            var produces = data['produces'];
            for (let i = 0; i < produces.length; i++) {
              if ('variable' in produces[i]) {
                produces[i]['variable'] = prefix + produces[i]['variable'];
              }
            }
          } else {
            applyPrefix(data[key], prefix);
          }
        }
      }
    }
  }
}

