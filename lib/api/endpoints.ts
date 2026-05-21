// Endpoint path catalog. Centralized so renames propagate from one place.
// Tus prefix (/files/) is configured directly in tus-js-client, not routed here.

export const endpoints = {
  ssh: {
    connect: "/api/ssh/connect",
    disconnect: "/api/ssh/disconnect",
    list: "/api/ssh/list",
    createFolder: "/api/ssh/create-folder",
    download: "/api/ssh/download",
    delete: "/api/ssh/delete",
    move: "/api/ssh/mv",
    copy: "/api/ssh/cp",
    execute: "/api/ssh/execute",
    readFile: "/api/ssh/read-file",
    writeFile: "/api/ssh/write-file",
    systemInfo: "/api/ssh/system-info",
    processes: "/api/ssh/processes",
    killProcess: "/api/ssh/kill-process",
    zip: "/api/ssh/zip",
    zipProgress: "/api/ssh/zip-progress",
    zipCancel: "/api/ssh/zip-cancel",
    unzip: "/api/ssh/unzip",
    transferProgress: "/api/ssh/transfer-progress",
    transferCancel: "/api/ssh/transfer-cancel",
  },
  tus: "/files/",
  terminalWs: "/ws/terminal",
} as const;
