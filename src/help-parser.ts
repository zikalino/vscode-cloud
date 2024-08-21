import * as vscode from 'vscode';

// TODO: Create action
// TODO: Recognise resource-group argument
// TODO: Parse allowed values and create combos
// TODO: How to parse other resource references
// TODO: compare "create", "update", "delete", "get" and "list"
// TODO: Properly display separator in quickpick
// TODO: Map REST API file to command
// TODO: Map REST API to command arguments (how?)
// TODO: Display form immediately after created
// TODO: Global Arguments not removed

export async function parseCmdGroup(cmd: string) {

  console.log("Parse Group");

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
      parseCmdHelp(cmd + " " + selected);
    } else if (subgroups.includes(selected)) {
      parseCmdGroup(cmd + " " + selected);
    }
  }
}



export async function parseCmdHelp(cmd: string) {

  console.log("Parse Cmd Help");

  var lines = getHelp(cmd);
  var i = 0;
  var cmd_title = "";
  for (i = 0; i < lines.length; i++) {
    lines[i] = "# " + lines[i];
  }

  // here we can process all the lines and add all the necessary stuff

  i = 0;
  while (true) {
    i = parseCmdHelp_FindNextSection(lines, i);
    if (i < 0) {
      break;
    }

    if (lines[i].endsWith("Command")) {
      // XXX - for now do nothing, but extract command description and name
      i++;
      cmd_title = lines[i].split(":")[1].trim();
      continue;
    } else if (lines[i].endsWith("Global Arguments")) {
      // remove global arguments
      j = parseCmdHelp_FindNextSection(lines, i + 1);
      lines.splice(i, j - i);
      continue;
    } else if (lines[i].endsWith("Examples")) {
      // examples should stay as they are now
      i++;
      continue;
    } else if (lines[i].endsWith("Arguments")) {

      if (lines[i] === "# Arguments") {
        lines.splice(i, 0, "type: layout-form",
                              "header: ",
                              "  - type: header",
                              "    title: " + cmd_title,
                              "    logo: icon.webp",
                              "form:",
                              "  - type: fieldset",
                              "    subitems:");
        i += 8;
      }

      i++;

      // XXX - go through all arguments
      while (i < lines.length) {
        var j = i;
        // XXX - get argument name & other things
        var description = lines[j].split(":")[1].trim();
        var name = lines[j].split("--")[1].split(" ")[0];
        j++;
        while (j < lines.length && lines[j].startsWith("#       ")) {
          description += " " + lines[j].slice(1).trim();
          j++;
        }

        var inserted: string[] = [];

        if (name === 'location') {
          while (i < j) {
            // insert indented comment
            lines[i] = "      " + lines[i];
            i++;
          }

          inserted = [ "      - $include: __region_selector.yaml"
                     ];
          lines.splice(j, 0, ...inserted);
          i += inserted.length;
        } else if (name === 'tags') {
          while (i < j) {
            // insert indented comment
            lines[i] = "      " + lines[i];
            i++;
          }

          inserted = [ "      - $include: __tags_list.yaml"
                     ];
          lines.splice(j, 0, ...inserted);
          i += inserted.length;
        } else {

          while (i < j) {
            // insert indented comment
            lines[i] = "      " + lines[i];
            i++;
          }

          if (description.includes("Allowed values: false, true")) {
            lines.splice(j, 0, "      - type: row",
              "        subitems: ",
              "          - type: checkbox",
              "            name: " + name,
              "            description: " + description,
              "            produces: ",
              "              - variable: " + name.replaceAll("-", "_"));
            i += 7;
          } else {
            // insert argument information
            lines.splice(j, 0, "      - type: row",
                              "        subitems: ",
                              "          - type: textfield",
                              "            name: " + name,
                              "            description: " + description,
                              "            produces: ",
                              "              - variable: " + name.replaceAll("-", "_"));
            i += 7;
          }
        }        
        if (i >= lines.length || !lines[i].startsWith("#     --")) {
          break;
        }
      }
    } else {
      // unknown section just skip
      i++;
      continue;
    }
  }

  var r = lines.join("\r\n");

  if (vscode.workspace.workspaceFolders) {
    var uri = vscode.workspace.workspaceFolders[0].uri;
    var filename = uri.fsPath + "/" + cmd.replaceAll(" ", "_") + ".yaml";
    require('fs').writeFileSync(filename, r);
    const doc = await vscode.workspace.openTextDocument(filename);
    vscode.window.showTextDocument(doc);
    };

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
    var s = lines[idx].split(":");

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