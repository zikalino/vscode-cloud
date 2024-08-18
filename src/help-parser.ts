import * as vscode from 'vscode';

// TODO: Automatically create a file with name based on command
// TODO: Create action
// TODO: Parse allowed values and create combos
// TODO: When allowed values are "false" / "true" --> create checkbox
// TODO: How to parse other resource references
// TODO: compare "create", "update", "delete", "get" and "list"
// TODO: Map REST API to command arguments (how?)
// TODO: Properly display separator in quickpick
// TODO: Cache command --help responses

export async function parseCmdGroup(cmd: string) {

  console.log("Parse Group");

  const cp = require('child_process');
  var r = "";
  // execute the command and parse help
  if (process.platform === "win32") {
    r = cp.execSync(cmd + " --help", { shell: 'powershell' }).toString();
  } else {
    r = cp.execSync(cmd + " --help", { shell: '/bin/bash' }).toString();
  }

  var lines = r.split(/\r?\n/);
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

  const cp = require('child_process');
  var r = "";
  // execute the command and parse help
  if (process.platform === "win32") {
    r = cp.execSync(cmd + " --help", { shell: 'powershell' }).toString();
  } else {
    r = cp.execSync(cmd + " --help", { shell: '/bin/bash' }).toString();
  }

  var lines = r.split(/\r?\n/);
  var i = 0;
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
      while (i < lines.length) {
        if (lines[i] === "# Arguments") {
          i++;
          break;
        }
        i++;
      }

      lines.splice(i - 1, 0, "type: layout-form",
                            "header: ",
                            "  - type: header",
                            "    title: Virtual Machine",
                            "    logo: icon.webp",
                            "form:",
                            "  - type: fieldset",
                            "    subitems:");
      i += 8;

      // XXX - search for first argument
      while (!lines[i].startsWith("#     --")) {
        i++;
      }

      // XXX - go through all arguments
      while (true) {
        var j = i;
        // XXX - get argument name & other things
        var name = lines[j].split("--")[1].split(" ")[0];
        j++;
        while (lines[j].startsWith("#       ")) {
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
          // insert argument information
          lines.splice(j, 0, "      - type: row",
                            "        subitems: ",
                            "          - type: textfield",
                            "            name: " + name,
                            "            produces: ",
                            "              - variable: " + name.replaceAll("-", "_"));
          i += 6;
        }        
        if (!lines[i].startsWith("#     --")) {
          break;
        }
      }
    } else {
      // unknown section just skip
      i++;
      continue;
    }
  }

  r = lines.join("\r\n");
  vscode.window.activeTextEditor?.edit((editBuilder) => {
    editBuilder.insert(new vscode.Position(0, 0), r);
  });
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
      items.push(s[0].trim());
    }
    idx++;
  }
  
  return items;
}
