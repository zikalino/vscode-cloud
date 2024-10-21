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
    var type = options[optIdx]['type'];
    var values = options[optIdx]['values'];
    var required = options[optIdx]['required'];
    var query =  options[optIdx]['query'];
    if (!values) {
      values = [];
    }
    variables.push({
      name: name.replaceAll("-", "_"),
      argument: "--" + name
    });

    var inserted: string[] = [];

    if (query !== "") {
      inserted = [ "      - $include: __" + query + ".yaml" ];
      lines.splice(lines.length, 0, ...inserted);
    } else if (name === 'location') {

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

      var requiredString = required ? " (required)" : "";
      var insert: string[] = [];
      if (type === 'enum' || type === 'boolean') {
        if (type === 'boolean') {
          insert.push("      - type: row",
                      "        subitems: ",
                      "          - type: checkbox",
                      "            name: " + name + requiredString,
                      "            description: " + descriptionEscaped,
                      "            produces: ",
                      "              - variable: " + name.replaceAll("-", "_")
          );

          lines.splice(lines.length, 0, ...insert);
        } else {
          insert.push("      - type: row",
                      "        subitems: ",
                      "          - type: combo",
                      "            name: " + name + requiredString,
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
                          "            name: " + name + requiredString,
                          "            description: " + descriptionEscaped,
                          "            produces: ",
                          "              - variable: " + name.replaceAll("-", "_"));
      }
    }        
  }

  //
  // Create action row
  //
  var action = [ "      - type: 'action-row'",
                 "        expandable: false",
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
  action.push("        install: " + cmd);

  // request output to be stored in "output" variable
  action.push("        produces:");
  action.push("          - variable: output");

  lines.splice(lines.length, 0, ...action);

  //
  // Add output field to display results
  //
  var output = [ "      - type: 'output-row'",
                 "        data: output",
                 "        content: ..."];
                 lines.splice(lines.length, 0, ...output);

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
  var optionsRequired: any[] = [];
  var optionsOptional: any[] = [];

  var optionsSectionSeparator: string = "";
  var optionNamesSeparator:any = "";
  var defaultRequired: boolean = false; 

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
    defaultRequired = true;
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


    // firts get description from after the separator, don't use split, as the same pattern may be used later
    var separatorIdx = lines[i].trim().search(optionNamesSeparator);
    var description = lines[i].trim().substring(separatorIdx + 1).trim();

    // vultr uses comma as delimiter of parameter names, this is not necessary, so we can replace with space
    var names = lines[i].trim().substring(0, separatorIdx).trim().replace(", ", " ");
    var name = "";

    var required: boolean = defaultRequired;
    var type = "default";
    var query = "";
    var values: string[] = [];

    var s = names.split(" ");
    // XXX - vultr --- default type is boolean
    // XXX - doctl --- default may be boolean, but may have reference to region or ID
    // XXX - doctl --- sometimes ID can be comma separated list
    // XXX - az    --- has: Values from: `az account list-locations` ---> enum with query

    for (var j = 0; j < s.length; j++) {
      // check if we are dealing with parameter name
      var next: string = "";
      if (s[j].startsWith("--")) {
        next = s[j].split("--")[1];
      } else if (s[j].startsWith("-")) {
        next = s[j].split("-")[1];
      }
      if (next.length > 0) {
        if (next.length > name.length) {
          name = next;
        }
        continue;
      }

      // then check if we are dealing with: type, required, etc...
      switch (s[j]) {
        case "(required)":
          // linode
          required = true; 
          break;
        case "[Required]":
          // az
          required = true;
          break;
        case "(JSON)":
          // linode
          type = "json";
          break;
        case "string":
          // upctl, doctl, vultr
          type = "string";
          break;
          case "int":
            // upctl, doctl, vultr
            type = "int";
            break;
          case "ID":
            // doctl
            type = "enum";
            // XXX - extract from description
            break;
          case "strings":
            // vultr
            // XXX - in case of vultr --- comma separated strings
            break;
        }
    }
    
    i++;
    while (i < lines.length && lines[i].startsWith("  ") && !lines[i].trim().startsWith('-')) {
      description += " " + lines[i].slice(1).trim();
      i++;
    }

    // vultr-cli
    if (description.includes("(optional) ")) {
      required = false;
      description = description.replace("(optional) ", "");
    }

    // this is for az
    if (values.length === 0) {
      values = extractEnum(description, "Allowed values: ");
    }

    // this is for vultr
    if (values.length === 0) {
      values = extractEnum(description, "Possible values: ");
    }

    // doctl
    if (values.length === 0) {
      values = extractEnum(description, "Possible values are: ");
    }

    // upctl
    if (values.length === 0) {
      values = extractEnum(description, "Available: ");
    }

    if (values.length > 0) {
      if (values.includes("true") && values.includes("false") && values.length === 2) {
        type = "boolean";
      } else {
        type = "enum";
      }
    }

    // Extract: Run `upctl zone list` to list all....
    // Run\s*`(.*)`
    var match = description.match(/Run\s*`(.*)`/);
    if (match) {
      let command = 
      type = "enum";
      query = match[1].trim().replaceAll(" ", "_") + "_selector";
    }

    // Extract: Run `upctl zone list` to list all....
    // Values from\s*`(.*)`
    match = description.match(/Run\s*`(.*)`/);
    if (match) {
      let command = 
      type = "enum";
      query = match[1].trim().replaceAll(" ", "_") + "_selector";
    }

    // help shouldn't be displayed
    if (name === 'help') {
      continue;
    }

    if (required) {
      optionsRequired.push({'name': name,
                            'description': description,
                            'required': required,
                            'type': type,
                            'query': query,
                            'values': values });
    } else {
      optionsOptional.push({'name': name,
                            'description': description,
                            'required': required,
                            'type': type,
                            'query': query,
                            'values': values });
    }
  }

  return [...optionsRequired, ...optionsOptional];
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

function extractEnum(description: string, marker: string) : string[] {
    if (description.includes(marker)) {
      let tmp = description.split(marker)[1] + " ";
      tmp = tmp.split(/\.\s|$/)[0];
      let values = tmp.split(/,\s|\sand\s/);

      for (let i = 0; i < values.length; i++) {
        let v = values[i].trim();

        // ^\s*'(.*)'\s*$|^\s*"(.*)"\s*$|^\s*`(.*)`\s*$
        v = v.replace(/^\s*'(.*)'\s*$|^\s*"(.*)"\s*$|^\s*`(.*)`\s*$/, "$1$2$3");
        values[i] = v;
      }
      return values;
    }
    return [];
}