import * as vscode from 'vscode';

// TODO: Recognise resource-group argument
// TODO: How to parse other resource references
// TODO: compare "create", "update", "delete", "get" and "list"
// TODO: Properly display separator in quickpick
// TODO: Map REST API file to command
// TODO: Map REST API to command arguments (how?)
// TODO: Convert parameter names to user readable labels
// TODO: Display tooltips for arguments
// TODO: Move resource group to the top
// TODO: Tooltips for checkboxes are wrong
// TODO: No footer
// TODO: Split it from extension?extractAllCommandsOci

export async function parseCmdGroup(cmd: string): Promise<string> {

  console.log("Parse Group");

  var lines = getHelp(cmd);

  var i = 0;
  var subgroups: string[] = [];
  var commands: string[] = [];
  var response: string = "";

  i = 0;
  while (true) {
    i = parseCmdGroup_FindNextSection(lines, i);
    if (i < 0) {
      break;
    }

    if (lines[i].endsWith("Subgroups:")) {
      subgroups = parseCmdGroup_GetSubgroupsOrCommands(lines, ++i);
    } else if (lines[i].endsWith("Commands:")) {
      commands = parseCmdGroup_GetSubgroupsOrCommands(lines, ++i);
    } else {
      // we are not interested in this one -- skip
      i++;
    }
  }

  var selected = await vscode.window.showQuickPick(subgroups.concat(["-"], commands));

  if (selected) {
    if (commands.includes(selected)) {
      response = await parseCmdHelp(cmd + " " + selected);
    } else if (subgroups.includes(selected)) {
      response = await parseCmdGroup(cmd + " " + selected);
    }
  }
  return response;
}

export async function extractAllCommands(cmd: string, d: any): Promise<any> {

  if (cmd === 'oci') {
    return await extractAllCommandsOci(cmd, d);
  }

  var lines = getHelp(cmd);
 
  var i = 0;
  var subgroups: string[] = [];
  var commands: string[] = [];

  i = 0;
  while (true) {
    i = parseCmdGroup_FindNextSection(lines, i);
    if (i < 0) {
      break;
    }

    if (lines[i].endsWith("Subgroups:")) {
      subgroups = parseCmdGroup_GetSubgroupsOrCommands(lines, ++i);
      for (var idx in subgroups) {
        let s = subgroups[idx];
        d[cmd + " " + s] = true;
        console.log("- " + cmd + " " + s);
        await extractAllCommands(cmd + " " + s, d);
      }
    } else if (lines[i].endsWith("Commands:")) {
      commands = parseCmdGroup_GetSubgroupsOrCommands(lines, ++i);
      //console.log(JSON.stringify(commands));
      for (var idx in commands) {
        let s = commands[idx];
        console.log("- " + cmd + " " + s);
        d[cmd + " "+ s] = false;
      }
    } else {
      // we are not interested in this one -- skip
      i++;
    }
  }

  return d;
}

export async function extractAllCommandsOci(cmd: string, d: any): Promise<any> {
  var lines = getHelp(cmd);

  if (cmd.split(" ").length === 1) { 
    let parsingCommands: boolean = false;
    for (let idx = 0; idx < lines.length; idx++) {
      if (!parsingCommands) {
        if (lines[idx] === 'Commands:') {
          parsingCommands = true;
        }
      }
      else {
        if (lines[idx].startsWith("    ") && !lines[idx].startsWith("     ")) {
          // command entry starts with exactly 4 spaces
          let s = lines[idx].trim().split(/\s+/);
          let subcmd = s[0];
          s.shift();
          let description = s.join(" ");
          console.log(cmd + " " + subcmd + " ---- " + description);
          d[cmd + " " + subcmd] = true;
          await extractAllCommandsOci(cmd + " " + subcmd, d);
        }
      }
    }
  } else if (cmd.split(" ").length === 2) {
    // parsing second level
    let parsingCommands: boolean = false;
    let stack: string[] = [];
    for (let idx = 0; idx < lines.length; idx++) {
      if (!parsingCommands) {
        if (lines[idx] === 'Available Commands') {
          parsingCommands = true;
        }
      } else {
        let s = lines[idx].split("*");
        if (s.length === 2) {
          // we have subcommand here
          let level = s[0].length / 2;
          if (level === stack.length) {
            stack.push(s[1].trim());
          } else if (level === stack.length - 1) {
            stack[level] = s[1].trim();
          } else {
            while (stack.length - 1 > level) {
              stack.pop();
            }
            stack[level] = s[1].trim();
          }
          console.log(cmd + " " + stack.join(" "));
          d[cmd + " " + stack.join(" ")] = true;
        }
      }
    }
  }
  return d;
}


export async function parseCmdHelp(cmd: string): Promise<string> {

  console.log("Parse Cmd Help");

  var lines = getHelp(cmd);

  var options: any[] = extractOptions(lines, cmd.split(' ')[0]);

  var cmd_title = "cmd";
  var variables: any[] = [];
  for (var i = 0; i < lines.length; i++) {
    lines[i] = "# " + lines[i];
  }

  // here we can process all the lines and add all the necessary stuff
  lines.splice(lines.length, 0, "type: layout-form",
    "header: ",
    "  - type: header",
    "    title: " + cmd,
    "    logo: icon.webp",
    "form:",
    "  - type: fieldset",
    "    subitems:");

  for (var optIdx = 0; optIdx < options.length; optIdx++) {
    // store variable
    var name = options[optIdx]['name'];
    var description = options[optIdx]['description'];
    variables.push({
      name: name.replaceAll("-", "_"),
      argument: "--" + name
    });

    var inserted: string[] = [];

    if (name === 'location') {

      inserted = [ "      - $include: __az_region_selector.yaml" ];
      lines.splice(lines.length, 0, ...inserted);
    } else if (name === 'tags') {

      inserted = [ "      - $include: __az_tags_list.yaml" ];
      lines.splice(lines.length, 0, ...inserted);
    } else {

      var descriptionEscaped = description;
      if (description.includes(":")) {
        if (description.includes('"')) {
          descriptionEscaped = description.replaceAll('"', '\\"');
        }
        descriptionEscaped = '"' + descriptionEscaped + '"';
      }

      var insert: string[] = [];
      if (description.includes("Allowed values: ")) {
        let tmp = description.split("Allowed values: ")[1] + " ";
        tmp = tmp.split(". ")[0];
        let values = tmp.split(", ");
        if (values.includes("true") && values.includes("false") && values.length === 2) {

          insert.push("      - type: row",
                      "        subitems: ",
                      "          - type: checkbox",
                      "            name: " + name,
                      "            description: " + descriptionEscaped,
                      "            produces: ",
                      "              - variable: " + name.replaceAll("-", "_")
          );

          lines.splice(lines.length, 0, ...insert);
        } else {
          insert.push("      - type: row",
                      "        subitems: ",
                      "          - type: combo",
                      "            name: " + name,
                      "            description: " + descriptionEscaped,
                      "            items:");

          for (var vi = 0; vi < values.length; vi++) {
            insert.push("              - " + values[vi]);
          }

          insert.push("            produces: ",
                      "              - variable: " + name.replaceAll("-", "_"));

          lines.splice(lines.length, 0, ...insert);
        }
      } else {
        // insert argument information
        lines.splice(lines.length, 0, "      - type: row",
                          "        subitems: ",
                          "          - type: textfield",
                          "            name: " + name,
                          "            description: " + descriptionEscaped,
                          "            produces: ",
                          "              - variable: " + name.replaceAll("-", "_"));
      }
    }        
  }

  // include action
  var action = [ "      - type: 'action-row'",
                 "        name: " + cmd ];

  if (variables.length > 0) {
    action.push("        consumes:");
    for (var vi = 0; vi < variables.length; vi++ ) {
      action.push("          - variable: " + variables[vi].name,
                  "            parameter: " + variables[vi].argument
      );
      // XXX - here we need to add all required, required-if, etc.
    }
  }

  // push the rest of stuff
  action.push(
                 "        verify: |",
                 "            az vm show --resource-group ${resource_group_name} --name ${virtual_machine_name}",
                 "        install: " + cmd + " --resource-group ${resource_group_name} --name ${virtual_machine_name} --location ${virtual_machine_region}",
                 "        uninstall: az vm delete --resource-group ${resource_group_name} --name ${virtual_machine_name} --yes"
  );

  lines.splice(lines.length, 0, ...action);

  var r = lines.join("\r\n");
  var filename = "";
  if (vscode.workspace.workspaceFolders) {
    var uri = vscode.workspace.workspaceFolders[0].uri;
    filename = uri.fsPath + "/" + cmd.replaceAll(" ", "_") + ".yaml";
    require('fs').writeFileSync(filename, r);
    const doc = await vscode.workspace.openTextDocument(filename);
    vscode.window.showTextDocument(doc);
  };

  return filename;
}

function extractOptions(lines: string[], cli: string): any[] {
  
  var i = 0;
  var response: any[] = [];

  var optionsSectionSeparator: string = "";
  var optionNamesSeparator:any = "";

  if (cli === 'az') {
    optionsSectionSeparator = "Arguments";
    optionNamesSeparator = ":";
  } else if (cli === 'linode') {
    optionsSectionSeparator = "Arguments:";
    optionNamesSeparator = ":";
  } else if (cli === 'doctl') {
    optionsSectionSeparator = "Flags:";
    optionNamesSeparator = "  ";
  } else if (cli === 'oci') {

  } else if (cli === 'vultr-cli') {
    optionsSectionSeparator = "Flags:";
    optionNamesSeparator = /\s\s+/;
  } else if (cli === 'cloudcli') {

  } else if (cli === 'upctl') {
    optionsSectionSeparator = "Options:";
    optionNamesSeparator = /\s\s+/;
  }

  while (i < lines.length) {
    if (lines[i] === optionsSectionSeparator) {
      i++;
      break;
    }
    i++;
  }

  while (i < lines.length) {
    if (lines[i] === '') {
      i++;
      continue;
    }

    if (!lines[i].includes(" --")) {
      break;
    }

    // first find argument name delimiter
    var parts = lines[i].trim().split(optionNamesSeparator);
    var names = parts[0].split(", ");
    var name = names[names.length - 1].replace("--", "");
    var description = parts[1].trim();
    if (name.includes(" ")) {
      name = name.split(" ")[0];
    }
    
    i++;
    while (i < lines.length && lines[i].startsWith("  ") && !lines[i].includes(" --")) {
      description += " " + lines[i].slice(1).trim();
      i++;
    }
    response.push({'name': name, 'description': description});
  }

  return response;
}

function parseCmdHelp_FindNextSection(lines: string[], idx: number) {
  while (idx < lines.length) {
    if (lines[idx].length > 3 && lines[idx].startsWith("# ") && !lines[idx].startsWith("#  ")) {
      return idx;
    }
    idx++;
  }
  return -1;
}

function parseCmdGroup_FindNextSection(lines: string[], idx: number) {
  while (idx < lines.length) {
    if (lines[idx].length > 3 &&  !lines[idx].startsWith(" ")) {
      return idx;
    }
    idx++;
  }
  return -1;
}

function parseCmdGroup_GetSubgroupsOrCommands(lines: string[], idx: number) {
  var items: string[] = [];
  while (idx < lines.length && lines[idx].startsWith("    ")) {
    var s = lines[idx].split(": ");

    if (s.length >= 2) {
      // XXX - simplify it
      if (s[0].includes("[")) {
        s[0] = s[0].split("[")[0];
      } 
      items.push(s[0].trim());
    }
    idx++;
  }
  
  return items;
}

function getHelp(cmd: string) {
  var r: string = "";
  var fs = require('fs');
  var dir = process.cwd();

  var filename = cmd.replaceAll(" ", "_");
  try {
    r = fs.readFileSync(filename, 'utf8');
  } catch (err) {
    const cp = require('child_process');
    // execute the command and parse help
    if (process.platform === "win32") {
      r = cp.execSync(cmd + " --help", { shell: 'powershell' }).toString();
    } else {
      r = cp.execSync(cmd + " --help", { shell: '/bin/bash' }).toString();
    }
    fs.writeFileSync(filename, r);
  }

  return r.split(/\r?\n/);
}